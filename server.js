import express from 'express';
import cors from 'cors';
import fs from 'fs';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const persona = fs.readFileSync('./persona.txt', 'utf-8');

const MODE = process.env.MODE || "openai";

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    let reply;

    if (MODE === "openai") {
      reply = await callOpenAI(userMessage);
    } else {
      reply = await callOllama(userMessage);
    }

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

async function callOpenAI(message) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: persona },
        { role: "user", content: message }
      ]
    })
  });

  const data = await response.json();

  console.log("FULL RESPONSE:", data); // 👈 IMPORTANT

  if (!data.choices) {
    throw new Error("OpenAI error: " + JSON.stringify(data));
  }

  return data.choices[0].message.content;
}

async function callOllama(message) {
  console.log("sending request!");
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen3.5",
      stream: false,
      think: false,
      messages: [
        { role: "system", content: persona },
        { role: "user", content: message }
      ]
    })
  });

  const data = await response.json();
  return data.message.content;
}

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
