const params = new URLSearchParams(window.location.search);
const eventoId = params.get('id');

async function cargarComentarios() {
  if (!eventoId) {
    alert('No se especificó evento.');
    return;
  }
  try {
    const res = await fetch(`/api/comentarios?evento=${eventoId}`);
    if (!res.ok) throw new Error('Error al cargar comentarios');
    const comentarios = await res.json();

    console.log('Comentarios recibidos:', comentarios); // DEBUG, borrar luego

    const tbody = document.querySelector('#comentariosTable tbody');
    tbody.innerHTML = '';

    comentarios.forEach(c => {
      // Debug para ver qué valor llega
      console.log('calificacion:', c.calificacion);

      // Convertir a número y asegurar 0 si es null, undefined o NaN
      const calificacion = Number(c.calificacion);
      const estrellas = isNaN(calificacion) ? 0 : calificacion;

      let estrellasHTML = '';
      for (let i = 0; i < 5; i++) {
        estrellasHTML += i < estrellas ? '<span class="llena">★</span>' : '<span class="vacia">☆</span>';
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.usuario}</td>
        <td>${c.comentario || 'Sin comentario'}</td>
        <td class="estrellas">${estrellasHTML}</td>
        <td><button onclick="eliminarComentario(${c.id_usuario}, ${eventoId})">Eliminar</button></td>
      `;
      tbody.appendChild(tr);
    });

  } catch (error) {
    alert(error.message);
  }
}

function eliminarComentario(id_usuario, id_evento) {
  if (!confirm('¿Seguro que quieres eliminar este comentario?')) return;

  fetch(`/api/comentarios?id_usuario=${id_usuario}&id_evento=${id_evento}`, {
    method: 'DELETE'
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || 'Comentario eliminado.');
      cargarComentarios();
    })
    .catch(error => alert('Error al eliminar: ' + error.message));
}

function volver() {
  window.location.href = 'admin_comentarios.html';
}

window.onload = cargarComentarios;

//CERRAR SESION
document.getElementById('btnLogout').addEventListener('click', () => {
  const confirmar = confirm("¿Estás seguro que quieres cerrar sesión?");
  if (confirmar) {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  }
});

