import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import session from 'express-session';
import sqliteStoreFactory from 'better-sqlite3-session-store';
import db from './db.js';
import authRouter, { getSessionSecret, requireAuth } from './auth.js';
import personas from './personas.js';
import conversationsRouter, {
  getConversationForUser,
  saveMessage,
  setTitleIfEmpty,
  getConversationHistory
} from './conversations.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// =========================
// Sessions (stored in SQLite, survive restarts)
// =========================
const SqliteStore = sqliteStoreFactory(session);

app.use(session({
  store: new SqliteStore({
    client: db,
    expired: { clear: true, intervalMs: 15 * 60 * 1000 }
  }),
  name: 'sid',
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

app.use('/auth', authRouter);
app.use('/conversations', conversationsRouter);

const MODE = process.env.MODE || "openai";

const LOCAL_LLM = "qwen3.5:9b";

// =========================
// GET personas list
// =========================
app.get('/personas', (req, res) => {
  const list = Object.entries(personas).map(([id, p]) => ({
    id,
    name: p.name,
    description: p.description || ''
  }));
  res.json(list);
});

app.post('/chat', requireAuth, async (req, res) => {
  const { message, conversationId } = req.body;

  try {
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is empty.' });
    }

    // The conversation must exist and belong to the logged-in user
    const conversation = getConversationForUser(Number(conversationId), req.session.userId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    // Save the user message first so it is kept even if the model call fails
    saveMessage(conversation.id, 'user', message);
    setTitleIfEmpty(conversation.id, conversation.title, message);

    // Call model with the FULL stored history (system prompt included)
    const history = getConversationHistory(conversation.id);

    let reply;
    if (MODE === "openai") {
      reply = await callOpenAI(history);
    } else {
      reply = await callOllama(history);
    }

    saveMessage(conversation.id, 'assistant', reply);

    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

async function callOpenAI(messages) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: messages
    })
  });

  const data = await response.json();

  console.log("FULL RESPONSE:", data);

  if (!data.choices) {
    throw new Error("OpenAI error: " + JSON.stringify(data));
  }

  return data.choices[0].message.content;
}

async function callOllama(messages) {
  console.log("sending request!");

  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LOCAL_LLM,
      stream: false,
      think: false,
      messages: messages
    })
  });

  const data = await response.json();

  if (!data.message) {
    throw new Error("Ollama error: " + JSON.stringify(data));
  }

  return data.message.content;
}

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

