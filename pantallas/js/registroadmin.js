async function registrarAdmin() {
  const nombre = document.getElementById("registroAdminNombre").value;
  const correo = document.getElementById("registroAdminCorreo").value;
  const pass = document.getElementById("registroAdminPassword").value;
  const clave = document.getElementById("registroAdminClave").value;

  if (!nombre || !correo || !pass || !clave) {
    alert("Por favor, complete todos los campos");
    return;
  }

  if (clave !== "12345") {
    alert("Clave de administrador incorrecta");
    return;
  }

  const captchaResponse = grecaptcha.getResponse();
  if (!captchaResponse) {
    alert("Por favor, complete el CAPTCHA para continuar.");
    return;
  }

  try {
    const res = await fetch('/registro-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        correo,
        contraseña: pass,
        clave,
        captcha: captchaResponse
      })
    });

    const data = await res.json();

    if (data.success) {
      alert(data.message);
      grecaptcha.reset();
      window.location.href = 'login.html';
    } else {
      alert(data.message);
      grecaptcha.reset();
    }
  } catch (error) {
    console.error('Error en registro admin:', error);
    alert('Error en el servidor. Intenta más tarde.');
    grecaptcha.reset();
  }
}
