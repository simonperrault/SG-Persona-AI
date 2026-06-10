import express from 'express';
import cors from 'cors';
import fs from 'fs';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// dotenv must load before db.js reads DATA_DIR
const { default: db } = await import('./db.js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

//const persona = fs.readFileSync('./persona.txt', 'utf-8');
const personas = JSON.parse(fs.readFileSync('./persona.json', 'utf-8'));

let history = [];
let currentPersona = null;

const MODE = process.env.MODE || "openai";

const LOCAL_LLM = "qwen3.5:9b";

// =========================
// GET personas list
// =========================
app.get('/personas', (req, res) => {
  const list = Object.entries(personas).map(([id, p]) => ({
    id,
    name: p.name
  }));
  res.json(list);
});

app.post('/chat', async (req, res) => {
  const { message, personaId } = req.body;

  try {
    let reply;

    // If persona changed, reset history
    if (personaId !== currentPersona) {
      currentPersona = personaId;

      history = [
        {
          role: "system",
          content: personas[personaId].prompt
        }
      ];
    }

    // Add user message
    history.push({ role: "user", content: message });

    // Call model with FULL history
    if (MODE === "openai") {
      reply = await callOpenAI(history);
    } else {
      reply = await callOllama(history);
    }

    // Save assistant reply
    history.push({ role: "assistant", content: reply });

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


// =========================
// RESET (allows users to reset the conversation)
// =========================

app.post('/reset', (req, res) => {
  history = [];
  currentPersona = null;
  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

