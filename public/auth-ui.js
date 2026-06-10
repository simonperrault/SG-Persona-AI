// Shared by login.html and register.html

function showAuthMessage(text, isError) {
  const msg = document.getElementById('authMessage');
  msg.textContent = text;
  msg.className = isError ? 'auth-error' : 'auth-success';
}

// mode is 'login' or 'register' — matches the /auth/<mode> endpoint
function initAuthPage(mode) {
  // Already logged in? Go straight to the chat page.
  fetch('/auth/me')
    .then(res => res.json())
    .then(data => {
      if (data.user) window.location.replace('/');
    })
    .catch(err => console.error(err));

  document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (mode === 'register') {
      const confirm = document.getElementById('passwordConfirm').value;
      if (password !== confirm) {
        showAuthMessage('Passwords do not match.', true);
        return;
      }
    }

    try {
      const res = await fetch(`/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showAuthMessage(data.error || 'Something went wrong. Please try again.', true);
        return;
      }

      // Logged in (register logs in automatically) — go to the chat page
      window.location.replace('/');

    } catch (err) {
      console.error(err);
      showAuthMessage('Network error. Please try again.', true);
    }
  });
}
