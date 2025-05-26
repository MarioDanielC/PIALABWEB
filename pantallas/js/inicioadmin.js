async function ingresarAdmin() {
  const correo = document.getElementById("loginAdminCorreo").value;
  const contraseña = document.getElementById("loginAdminPassword").value;
  const clave = document.getElementById("loginAdminClave").value;

  if (!correo || !contraseña || !clave) {
    alert("Por favor, complete todos los campos");
    return;
  }

  try {
    const response = await fetch('/loginAdmin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, contraseña, clave }),
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem('token', data.token);
      alert(data.message);
      window.location.href = 'menuadmin.html';
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error('Error al iniciar sesión admin:', err);
    alert('Error en el servidor.');
  }
}

function volverAlInicio() {
    window.location.href = 'login.html';
}


