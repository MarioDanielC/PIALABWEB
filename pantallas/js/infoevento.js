function getEventoId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

const eventoId = getEventoId();

const titulo = document.querySelector('.evento-info h2');
const detalles = document.querySelector('.evento-info p');
const imagenes = document.querySelectorAll('.evento-info img');
const likeBtn = document.getElementById('likeBtn');
const likeDisplay = document.getElementById('likeCount');
const estrellas = document.querySelectorAll('#estrellas span');
const escribirResenaLink = document.getElementById('escribirResenaLink');
const verResenasBtn = document.getElementById('verResenasBtn');

const userId = 1;
const token = localStorage.getItem('token');

let usuarioAsistio = false;

async function cargarEvento(id) {
  try {
    const response = await fetch(`/api/eventos/${id}`);
    if (!response.ok) throw new Error('No se encontró el evento');
    const evento = await response.json();

    titulo.textContent = evento.nombre_evento;
    detalles.innerHTML = `${new Date(evento.fecha_hora).toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric' })} <br>
                          ${new Date(evento.fecha_hora).toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})} hrs <br>
                          ${evento.lugar}`;

    imagenes[0].src = evento.imagen_url || 'images/default.jpg';

  } catch (error) {
    alert(error.message);
  }
}

async function cargarEstadoUsuario(eventoId, userId) {
  try {
    const resAsistencia = await fetch(`/api/asistencias/check?id_usuario=${userId}&id_evento=${eventoId}`);
    if (!resAsistencia.ok) throw new Error('Error al cargar estado asistencia');
    const dataAsistencia = await resAsistencia.json();

    usuarioAsistio = dataAsistencia.asistio;
    likeBtn.disabled = false;
    likeBtn.style.opacity = usuarioAsistio ? '0.6' : '1';

    const resCount = await fetch(`/api/asistencias/count/${eventoId}`);
    if (!resCount.ok) throw new Error('Error al obtener total de asistentes');
    const countData = await resCount.json();
    likeDisplay.textContent = countData.total || 0;

    const resCalif = await fetch(`/api/calificaciones/check?id_usuario=${userId}&id_evento=${eventoId}`);
    if (!resCalif.ok) throw new Error('Error al cargar calificación');
    const dataCalif = await resCalif.json();

    if (dataCalif.cal_estrellas) {
      estrellas.forEach((estrella, idx) => {
        if (idx < dataCalif.cal_estrellas) {
          estrella.classList.add('seleccionada');
        } else {
          estrella.classList.remove('seleccionada');
        }
      });
    } else {
      estrellas.forEach(e => e.classList.remove('seleccionada'));
    }
  } catch (error) {
    console.error(error);
  }
}

likeBtn.addEventListener('click', async () => {
  try {
    if (!token) throw new Error('No estás autenticado');

    if (!usuarioAsistio) {
      const res = await fetch(`/api/asistencias`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id_evento: eventoId })
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.message === 'Asistencia ya registrada') {
          const confirmar = confirm('Ya tienes registrada la asistencia. ¿Quieres cancelar tu asistencia?');
          if (confirmar) {
            const resDel = await fetch(`/api/asistencias`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ id_evento: eventoId })
            });
            if (!resDel.ok) {
              const errDel = await resDel.json();
              throw new Error(errDel.message || 'Error cancelando asistencia');
            }
            usuarioAsistio = false;
            likeBtn.style.opacity = '1';
            const countRes = await fetch(`/api/asistencias/count/${eventoId}`);
            const countData = await countRes.json();
            likeDisplay.textContent = countData.total || 0;
            alert('Asistencia cancelada correctamente');
            return;
          } else {
            return;
          }
        } else {
          throw new Error(err.message || 'Error guardando asistencia');
        }
      } else {
        usuarioAsistio = true;
        likeBtn.style.opacity = '0.6';
      }

    } else {
      const confirmar = confirm('¿Quieres cancelar tu asistencia?');
      if (!confirmar) return;

      const res = await fetch(`/api/asistencias`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id_evento: eventoId })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error cancelando asistencia');
      }
      usuarioAsistio = false;
      likeBtn.style.opacity = '1';
    }

    const countRes = await fetch(`/api/asistencias/count/${eventoId}`);
    const countData = await countRes.json();
    likeDisplay.textContent = countData.total || 0;

  } catch (error) {
    alert(error.message);
  }
});

// ESTRELLAS
estrellas.forEach((estrella, index) => {
  estrella.addEventListener('click', async () => {
    try {
      if (!token) throw new Error('No estás autenticado');

      const res = await fetch(`/api/calificaciones`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id_evento: eventoId, cal_estrellas: index + 1 })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error guardando calificación');
      }

      estrellas.forEach((e, i) => e.classList.toggle('seleccionada', i <= index));

      alert(`Evento calificado con ${index + 1} estrella${index + 1 > 1 ? 's' : ''}`);

    } catch (error) {
      alert(error.message);
    }
  });
});

// BOTÓN VER RESEÑAS
if (verResenasBtn) {
  verResenasBtn.addEventListener('click', () => {
    if (eventoId) {
      window.location.href = `ver-reseñas.html?id=${eventoId}`;
    } else {
      alert('No se encontró el ID del evento');
    }
  });
}

// ENLACE A REDACTAR RESEÑA
if (escribirResenaLink) {
  if (eventoId) {
    escribirResenaLink.href = `resena.html?id=${encodeURIComponent(eventoId)}`;
    escribirResenaLink.style.pointerEvents = 'auto';
    escribirResenaLink.style.opacity = '1';
  } else {
    escribirResenaLink.href = '#';
    escribirResenaLink.style.pointerEvents = 'none';
    escribirResenaLink.style.opacity = '0.5';
  }
}

// CARGA INICIAL
if (eventoId) {
  cargarEvento(eventoId);
  cargarEstadoUsuario(eventoId, userId);
} else {
  alert('No se especificó un evento válido en la URL.');
  likeBtn.disabled = true;
  if (escribirResenaLink) {
    escribirResenaLink.href = '#';
    escribirResenaLink.style.pointerEvents = 'none';
    escribirResenaLink.style.opacity = '0.5';
  }
}

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
