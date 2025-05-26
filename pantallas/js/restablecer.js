document.getElementById('restablecerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const message = document.getElementById('message');

  if (password !== confirmPassword) {
    message.textContent = 'Las contraseñas no coinciden.';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (!token) {
    message.textContent = 'Token no encontrado.';
    return;
  }

  try {
    const res = await fetch('/restablecer-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();

    if (res.ok) {
      message.style.color = 'green';
      message.textContent = data.message;

      setTimeout(() => window.location.href = '/login.html', 3000);
    } else {
      message.style.color = 'red';
      message.textContent = data.message;
    }
  } catch (err) {
    message.style.color = 'red';
    message.textContent = 'Error en la conexión al servidor.';
  }
});
