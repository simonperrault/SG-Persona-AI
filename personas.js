import fs from 'fs';

// Persona definitions, shared by server.js and conversations.js
const personas = JSON.parse(fs.readFileSync('./persona.json', 'utf-8'));

export default personas;
