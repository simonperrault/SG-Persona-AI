import { Router } from 'express';
import db from './db.js';
import { requireAuth } from './auth.js';
import personas from './personas.js';

// =========================
// Conversation storage
// =========================
// Each chat belongs to one user and one persona. For now the UI always
// works with the user's most recent conversation per persona; older ones
// stay in the database (the multi-conversation UI comes later).

const TITLE_MAX_LENGTH = 50;

function latestConversation(userId, personaId) {
  return db.prepare(`
    SELECT id, title FROM conversations
    WHERE user_id = ? AND persona_id = ?
    ORDER BY updated_at DESC, id DESC
    LIMIT 1
  `).get(userId, personaId);
}

// New conversations start with the persona's system prompt, stored as a
// message so old chats keep their original prompt even if persona.json changes
export function createConversation(userId, personaId) {
  const info = db.prepare(
    'INSERT INTO conversations (user_id, persona_id) VALUES (?, ?)'
  ).run(userId, personaId);

  const id = Number(info.lastInsertRowid);

  db.prepare(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
  ).run(id, 'system', personas[personaId].prompt);

  return { id, title: null };
}

export function getOrCreateLatestConversation(userId, personaId) {
  return latestConversation(userId, personaId) || createConversation(userId, personaId);
}

export function saveMessage(conversationId, role, content) {
  db.prepare(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
  ).run(conversationId, role, content);

  db.prepare(
    "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?"
  ).run(conversationId);
}

// The first user message doubles as the conversation title
export function setTitleIfEmpty(conversationId, title, message) {
  if (title) return;
  db.prepare('UPDATE conversations SET title = ? WHERE id = ?')
    .run(message.trim().slice(0, TITLE_MAX_LENGTH), conversationId);
}

export function getConversationHistory(conversationId) {
  return db.prepare(
    'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id'
  ).all(conversationId);
}

// =========================
// Routes (/conversations/...)
// =========================

const router = Router();
router.use(requireAuth);

// GET /conversations/latest?personaId=xxx
// The user's most recent chat with this persona (without the system prompt),
// used to fill the chat window when the page loads or the persona changes.
router.get('/latest', (req, res) => {
  const { personaId } = req.query;
  if (!personaId || !personas[personaId]) {
    return res.status(400).json({ error: 'Unknown persona.' });
  }

  const conversation = latestConversation(req.session.userId, personaId);
  if (!conversation) {
    return res.json({ id: null, messages: [] });
  }

  const messages = db.prepare(`
    SELECT role, content FROM messages
    WHERE conversation_id = ? AND role != 'system'
    ORDER BY id
  `).all(conversation.id);

  res.json({ id: conversation.id, messages });
});

// POST /conversations/new  { personaId }
// Start a fresh conversation with a persona (the Reset button).
// Reuses the latest conversation if it has no messages yet, so clicking
// Reset repeatedly does not pile up empty conversations.
router.post('/new', (req, res) => {
  const personaId = req.body?.personaId;
  if (!personaId || !personas[personaId]) {
    return res.status(400).json({ error: 'Unknown persona.' });
  }

  const latest = latestConversation(req.session.userId, personaId);
  if (latest) {
    const { n } = db.prepare(
      "SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ? AND role != 'system'"
    ).get(latest.id);
    if (n === 0) {
      return res.json({ id: latest.id });
    }
  }

  const conversation = createConversation(req.session.userId, personaId);
  res.json({ id: conversation.id });
});

export default router;
