let captchaResponse = null;

function onCaptchaVerified(token) {
  captchaResponse = token;
}

async function recuperarContrasena() {
  const tipo = document.getElementById("tipoUsuario").value.trim();
  const correo = document.getElementById("correo").value.trim();

  if (!tipo || (tipo !== "admin" && tipo !== "estudiante")) {
    alert("Por favor, selecciona un tipo de usuario válido.");
    return;
  }

  if (!correo) {
    alert("Por favor, ingresa tu correo.");
    return;
  }

  if (tipo === "estudiante" && !correo.endsWith("@uanl.edu.mx")) {
    alert("El correo debe terminar en @uanl.edu.mx");
    return;
  }

  if (!captchaResponse) {
    alert("Por favor, completa el CAPTCHA.");
    return;
  }

  try {
    const endpoint = tipo === "admin" ? "/recuperar-admin" : "/recuperar-estudiante";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correo,
        captcha: captchaResponse
      }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message || "Instrucciones enviadas al correo.");
    } else {
      alert(data.message || "Error en la recuperación.");
    }

  } catch (err) {
    console.error("Error en la solicitud:", err);
    alert("Ocurrió un error. Intenta más tarde.");
  } finally {

    if (typeof grecaptcha !== "undefined") {
      grecaptcha.reset();
    }
    captchaResponse = null;
  }
}


