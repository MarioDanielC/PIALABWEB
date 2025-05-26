async function registrarEstudiante() {
  const nombre = document.getElementById('nombre').value.trim();
  const correo = document.getElementById('correo').value.trim();
  const contraseña = document.getElementById('contraseña').value;
  const captchaResponse = grecaptcha.getResponse();

  if (!nombre || !correo || !contraseña) {
    alert('Por favor, completa todos los campos.');
    return;
  }

  if (captchaResponse.length === 0) {
    alert('Por favor, completa el captcha.');
    return;
  }

  try {
    const res = await fetch('/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, correo, contraseña, captcha: captchaResponse }),
    });

    const data = await res.json();

    if (data.success) {
      alert(data.message);
      window.location.href = 'login.html';
    } else {
      alert(data.message);
      grecaptcha.reset();
    }
  } catch (error) {
    alert('Error en la conexión con el servidor.');
    console.error(error);
  }
}
function volver() {
    window.location.href = 'login.html';
}
