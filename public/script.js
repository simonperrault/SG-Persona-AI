let selectedPersona = null;

// =========================
// Auth guard — this page requires login
// =========================

async function checkAuth() {
  try {
    const res = await fetch('/auth/me');
    const data = await res.json();

    if (!data.user) {
      window.location.replace('/login.html');
      return;
    }

    document.getElementById('userEmail').textContent = data.user.email;
    document.getElementById('userBar').classList.remove('hidden');
  } catch (err) {
    console.error('Error checking login status:', err);
  }
}

async function logout() {
  try {
    await fetch('/auth/logout', { method: 'POST' });
  } catch (err) {
    console.error(err);
  }
  window.location.replace('/login.html');
}

checkAuth();

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

  // Set selectedPersona to the first persona by default
  if (select.options.length > 0) {
    select.selectedIndex = 0;
    selectedPersona = select.value;
  }

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

    // Session expired — back to the login page
    if (res.status === 401) {
      window.location.replace('/login.html');
      return;
    }

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

async function resetChat() {
  try {
    const res = await fetch('/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      // Clear the chat visually
      document.getElementById('chat').innerHTML = '';
      // Optionally reset input
      input.value = '';
    }
  } catch (err) {
    console.error('Error resetting chat:', err);
  }
}

async function exportChatToPDF() {
  const { jsPDF } = window.jspdf;

  // Get selected persona name
  const personaSelect = document.getElementById("personaSelect");
  let personaName = "unknown";
  if (personaSelect && personaSelect.selectedOptions.length > 0) {
    personaName = personaSelect.selectedOptions[0].text;
  }

  // Create date string
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Create PDF
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  // A4 landscape dimensions
  const pageWidth = 297;
  const pageHeight = 210;

  // Margins
  const margin = 15;

  // Current vertical position
  let y = margin;

  // Max text width
  const maxWidth = pageWidth - margin * 2;

  // Get all messages
  const messages = document.querySelectorAll("#chat .message");

  // Fonts
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  // Title with persona name and date
  pdf.setFontSize(18);
  pdf.text(`Singapore AI exported Chat with ${personaName} on ${dateStr}`, margin, y);

  y += 12;

  pdf.setFontSize(11);

  messages.forEach((msg) => {

    const isUser = msg.classList.contains("user");

    const text = msg.innerText.trim();

    // Split long lines
    const lines = pdf.splitTextToSize(text, maxWidth - 20);

    // Bubble height
    const bubbleHeight = lines.length * 6 + 10;

    // Page break
    if (y + bubbleHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }

    // Bubble styles
    if (isUser) {
   // Red bubble
      pdf.setFillColor(255, 77, 77);

      // White text
      pdf.setTextColor(255, 255, 255);

    } else {
      pdf.setFillColor(240, 240, 240);
      pdf.setTextColor(0, 0, 0);
    }

    // Draw bubble
    pdf.roundedRect(
      margin,
      y,
      maxWidth,
      bubbleHeight,
      3,
      3,
      "F"
    );

    // Text color


    // Draw text
    pdf.text(lines, margin + 5, y + 7);

    // Move down
    y += bubbleHeight + 6;
  });

// Clean persona name for filename safety
const fileNamePersona = personaName
  .toLowerCase()
  .replace(/\s+/g, "-")
  .replace(/[^a-z0-9-_]/g, "");


const timestamp =
  now.getFullYear() +
  "-" +
  String(now.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(now.getDate()).padStart(2, "0") +
  "_" +
  String(now.getHours()).padStart(2, "0") +
  "-" +
  String(now.getMinutes()).padStart(2, "0") +
  "-" +
  String(now.getSeconds()).padStart(2, "0");

// Final filename
const filename = `sg-persona-${fileNamePersona}-${timestamp}.pdf`;

// Save PDF
pdf.save(filename);
}