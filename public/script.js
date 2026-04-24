async function sendMessage() {
  const input = document.getElementById('input');
  const chatBox = document.getElementById('chatBox');

  const text = input.value.trim();
  if (!text) return;

  // Display user message
  chatBox.value += `You: ${text}\n`;
  input.value = '';

  // Call backend
  const res = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text })
  });

  const data = await res.json();

  // Display AI reply
  chatBox.value += `AI: ${data.reply}\n\n`;

  // Auto-scroll
  chatBox.scrollTop = chatBox.scrollHeight;
}
