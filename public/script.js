// =========================
// State
// =========================

let personasList = [];          // [{id, name, description}]
let conversations = [];         // [{id, personaId, personaName, title, updatedAt, messageCount}]
let activeConversationId = null;

// =========================
// Auth guard — this page requires login
// =========================

async function checkAuth() {
  try {
    const res = await fetch('/auth/me');
    const data = await res.json();

    if (!data.user) {
      window.location.replace('/login.html');
      return false;
    }

    document.getElementById('userEmail').textContent = data.user.email;
    return true;
  } catch (err) {
    console.error('Error checking login status:', err);
    return false;
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

// =========================
// Init
// =========================

async function init() {
  const loggedIn = await checkAuth();
  if (!loggedIn) return;

  const [personasRes, conversationsRes] = await Promise.all([
    fetch('/personas'),
    fetch('/conversations')
  ]);
  personasList = await personasRes.json();
  conversations = await conversationsRes.json();

  renderNewConvMenu();
  renderSidebar();

  if (conversations.length > 0) {
    openConversation(conversations[0].id);
  } else {
    showEmptyState();
  }
}

init();

function showEmptyState() {
  document.getElementById('emptyState').classList.remove('hidden');
  document.getElementById('chatArea').classList.add('hidden');
}

function showChatArea() {
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('chatArea').classList.remove('hidden');
}

// =========================
// Sidebar
// =========================

async function refreshConversations() {
  try {
    const res = await fetch('/conversations');
    if (res.status === 401) {
      window.location.replace('/login.html');
      return;
    }
    conversations = await res.json();
    renderSidebar();
  } catch (err) {
    console.error('Error loading conversations:', err);
  }
}

// Tag colour follows the persona's position in the personas list
function personaTagClass(personaId) {
  const index = personasList.findIndex(p => p.id === personaId);
  return 'tag-' + (index >= 0 ? index % 4 : 0);
}

function renderSidebar() {
  const list = document.getElementById('convList');
  list.innerHTML = '';

  conversations.forEach(c => {
    const item = document.createElement('div');
    item.className = 'conv-item' + (c.id === activeConversationId ? ' active' : '');
    item.onclick = () => openConversation(c.id);

    const title = document.createElement('div');
    title.className = 'conv-item-title';
    title.textContent = c.title || 'New conversation';

    const tag = document.createElement('span');
    tag.className = 'persona-tag ' + personaTagClass(c.personaId);
    tag.textContent = c.personaName;

    item.appendChild(title);
    item.appendChild(tag);
    list.appendChild(item);
  });
}

// =========================
// New conversation (persona picker)
// =========================

function renderNewConvMenu() {
  const menu = document.getElementById('newConvMenu');
  menu.innerHTML = '';

  personasList.forEach(p => {
    const option = document.createElement('div');
    option.className = 'new-conv-option';
    option.onclick = () => createNewConversation(p.id);

    const name = document.createElement('strong');
    name.textContent = p.name;

    const desc = document.createElement('div');
    desc.className = 'new-conv-option-desc';
    desc.textContent = p.description;

    option.appendChild(name);
    option.appendChild(desc);
    menu.appendChild(option);
  });
}

function toggleNewConvMenu() {
  document.getElementById('newConvMenu').classList.toggle('hidden');
}

function hideNewConvMenu() {
  document.getElementById('newConvMenu').classList.add('hidden');
}

// Close the persona menu when clicking anywhere else
document.addEventListener('click', (e) => {
  if (!e.target.closest('.new-conv-wrap')) {
    hideNewConvMenu();
  }
});

async function createNewConversation(personaId) {
  hideNewConvMenu();

  try {
    const res = await fetch('/conversations/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId })
    });

    if (res.status === 401) {
      window.location.replace('/login.html');
      return;
    }

    const data = await res.json();

    await refreshConversations();
    openConversation(data.id);

  } catch (err) {
    console.error('Error creating conversation:', err);
  }
}

// =========================
// Open a conversation
// =========================

async function openConversation(id) {
  try {
    const res = await fetch(`/conversations/${id}`);

    if (res.status === 401) {
      window.location.replace('/login.html');
      return;
    }
    if (!res.ok) {
      console.error('Could not open conversation', id);
      return;
    }

    const data = await res.json();
    activeConversationId = data.id;

    // Header: title + persona
    const persona = personasList.find(p => p.id === data.personaId);
    document.getElementById('convTitle').textContent = data.title || 'New conversation';
    document.getElementById('convPersonaName').textContent = persona ? persona.name : data.personaId;
    document.getElementById('convPersonaDesc').textContent =
      persona && persona.description ? ` · ${persona.description}` : '';

    // Messages
    const chat = document.getElementById('chat');
    chat.innerHTML = '';
    data.messages.forEach(m => {
      addMessage(m.content, m.role === 'user' ? 'user' : 'bot');
    });

    showChatArea();
    renderSidebar(); // update the active highlight
  } catch (err) {
    console.error('Error opening conversation:', err);
  }
}

// =========================
// Chat
// =========================

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
  if (!activeConversationId) return;

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
        conversationId: activeConversationId
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

    // First message names the conversation and ordering may change
    await refreshConversations();
    const current = conversations.find(c => c.id === activeConversationId);
    if (current) {
      document.getElementById('convTitle').textContent = current.title || 'New conversation';
    }

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

// =========================
// PDF export
// =========================

async function exportChatToPDF() {
  if (!activeConversationId) return;

  const { jsPDF } = window.jspdf;

  // Persona of the active conversation
  const conversation = conversations.find(c => c.id === activeConversationId);
  const personaName = conversation ? conversation.personaName : 'unknown';

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
