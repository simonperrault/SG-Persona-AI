import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import db, { DATA_DIR } from './db.js';

// =========================
// Auth routes (/auth/...)
// =========================

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 10;

// POST /auth/register  { email, password }
router.post('/register', async (req, res) => {
  try {
    const email = (req.body?.email || '').trim();
    const password = req.body?.password || '';

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let info;
    try {
      info = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, passwordHash);
    } catch (err) {
      if (String(err.code).startsWith('SQLITE_CONSTRAINT')) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      throw err;
    }

    // Log the new user in right away
    req.session.userId = Number(info.lastInsertRowid);
    res.json({ id: req.session.userId, email });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /auth/login  { email, password }
router.post('/login', async (req, res) => {
  try {
    const email = (req.body?.email || '').trim();
    const password = req.body?.password || '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // email comparison is case-insensitive (COLLATE NOCASE on the column)
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    const valid = user && await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    req.session.userId = user.id;
    res.json({ id: user.id, email: user.email });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.sendStatus(200);
  });
});

// GET /auth/me — who am I? (null when not logged in)
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.session.userId);
  res.json({ user: user || null });
});

// =========================
// Helpers for server.js
// =========================

// Middleware for routes that need a logged-in user (used from step 3 on)
export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in first.' });
  }
  next();
}

// Cookie-signing secret: use SESSION_SECRET from .env if set, otherwise
// generate one once and keep it in data/ (gitignored) so sessions
// survive server restarts without committing any secret to the repo.
export function getSessionSecret() {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }
  const file = path.join(DATA_DIR, '.session-secret');
  if (fs.existsSync(file)) {
    return fs.readFileSync(file, 'utf-8').trim();
  }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

export default router;
