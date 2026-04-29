let selectedPersona = null;

async function loadPersonas() {
  const res = await fetch('/personas');
  const personas = await res.json();

  const select = document.getElementById('personaSelect');

  personas.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.name;
    select.appendChild(option);
  });

  selectedPersona = select.value;

  select.addEventListener('change', () => {
    selectedPersona = select.value;

    // Optional: clear chat visually
    document.getElementById('chat').innerHTML = '';
  });
}

loadPersonas();


function addMessage(text, className) {
  const chat = document.getElementById('chat');

  const div = document.createElement('div');
  div.className = `message ${className}`;
  div.textContent = text;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  return div; // important for updating the whole conversation later
}

async function sendMessage() {
  const input = document.getElementById('input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';

  // User message
  addMessage(text, 'user');

  // Typing bubble
  const typingBubble = addMessage("Your partner is typing...", 'bot typing');

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        personaId: selectedPersona
      })
    });

    const data = await res.json();

    // Replace typing text with real response
    typingBubble.textContent = data.reply;
    typingBubble.classList.remove('typing');

  } catch (err) {
    console.error(err);
    typingBubble.textContent = "Error getting response.";
  }
}


const input = document.getElementById('input');

input.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault(); // prevents newline / weird behavior
    sendMessage();
  }
});