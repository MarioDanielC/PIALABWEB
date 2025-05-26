function getEventoId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id_evento') || params.get('id');
  return id && !isNaN(id) ? parseInt(id) : null;
}

async function cargarResenas() {
  const idEvento = getEventoId();
  if (!idEvento) {
    alert('ID de evento inválido');
    return;
  }

  try {
    const res = await fetch(`/resenas/${idEvento}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Error al cargar reseñas');
    }

    const container = document.querySelector('.container');
    container.innerHTML = '';

    if (!data.resenas || data.resenas.length === 0) {
      container.innerHTML = '<p>No hay reseñas para este evento.</p>';
      return;
    }

    data.resenas.forEach(r => {
      const card = document.createElement('div');
      card.classList.add('card');
      card.innerHTML = `
        <h3>${r.nombre_usuario}</h3>
        <p>${r.comentario}</p>
        <small>${new Date(r.fecha_reseña).toLocaleString()}</small>
      `;
      container.appendChild(card);
    });

  } catch (error) {
    alert(error.message || 'Error al cargar reseñas');
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', cargarResenas);

//BOTON VOLVER
document.getElementById('volverBtn').addEventListener('click', () => {
  const idEvento = getEventoId();
  if (idEvento) {
    window.location.href = `infoevento.html?id=${idEvento}`;
  } else {
    alert('ID de evento no encontrado para volver');
  }
});

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

