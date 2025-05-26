function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function getToken() {
  return localStorage.getItem('token');
}


//CARGAR NOMBRE_USUARIO
async function cargarNombreUsuario() {
  try {
    const token = getToken();
    if (!token) throw new Error('No autenticado');

    const res = await fetch('/usuario', {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!res.ok) throw new Error('No autenticado');

    const data = await res.json();
    const nombreInput = document.getElementById('nombre');
    if (nombreInput) {
      nombreInput.value = data.nombre_usuario || '';
    }
  } catch (err) {
    alert('No estás autenticado. Por favor inicia sesión.');
    window.location.href = 'login.html';
  }
}

//GUARDAR RESEÑA EN SQL SERVER
async function aceptarReseña() {
  const comentario = document.getElementById('comentario')?.value.trim() || '';
  const rawIdEvento = getQueryParam('id_evento') || getQueryParam('id');
  const id_evento = parseInt(rawIdEvento, 10);
  const token = getToken();

  if (!comentario) {
    alert('Por favor escribe tu comentario.');
    return;
  }

  if (!rawIdEvento || isNaN(id_evento)) {
    alert('No se especificó un evento válido.');
    return;
  }

  if (!token) {
    alert('No estás autenticado. Por favor inicia sesión.');
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch('/resenas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ id_evento, comentario }),
    });

    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error al guardar la reseña');
      }

      alert('Reseña guardada correctamente');

    } else {
      const text = await res.text();
      console.error('Respuesta inesperada del servidor:', text);
      alert('Error inesperado del servidor, revisa consola.');
    }

  } catch (error) {
    alert(error.message || 'Error en la conexión con el servidor.');
    console.error('Error:', error);
  }
}

function volverEventos() {
  const rawIdEvento = getQueryParam('id') || getQueryParam('id_evento');
  console.log('id para volver:', rawIdEvento);

  if (rawIdEvento && !isNaN(parseInt(rawIdEvento, 10))) {
    window.location.href = `infoevento.html?id=${rawIdEvento}`;
  } else {
    window.location.href = "pantaprincipal.html";
  }
}


window.onload = cargarNombreUsuario;

//CERRAR SESION
document.getElementById('btnLogout').addEventListener('click', () => {
  const confirmar = confirm("¿Estás seguro que quieres cerrar sesión?");
  if (confirmar) {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  }
});

//NAV ENTRE CATEGORIAS
document.getElementById('btnEstudiantiles').addEventListener('click', () => {
  window.location.href = 'estudiantiles.html?categoria=estudiantiles';
});

document.getElementById('btnAcademicos').addEventListener('click', () => {
  window.location.href = 'academicos.html?categoria=academicos';
});

document.getElementById('btnCulturales').addEventListener('click', () => {
  window.location.href = 'culturales.html?categoria=culturales';
});
