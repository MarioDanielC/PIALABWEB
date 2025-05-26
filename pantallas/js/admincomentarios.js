window.onload = async function() {
  try {
    const res = await fetch('/api/eventos');
    if (!res.ok) throw new Error('Error cargando eventos');
    const eventos = await res.json();

    const table = document.getElementById('eventTable');
    table.innerHTML = '';

    eventos.forEach(evento => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${evento.nombre_evento}</td>
        <td>${new Date(evento.fecha_hora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} <br> ${new Date(evento.fecha_hora).toLocaleDateString()}</td>
        <td>${evento.lugar}</td>
        <td>
          <button onclick="administrarComentarios(${evento.id_evento})">Administrar Comentarios</button>
        </td>
      `;
      table.appendChild(row);
    });
  } catch (error) {
    alert(error.message);
    console.error(error);
  }
};

function administrarComentarios(idEvento) {
  window.location.href = `comentarios.html?id=${idEvento}`;
}

function verEstadisticas() {
  console.log('Función verEstadisticas llamada');
  window.location.href = 'estadisticas.html';
}

document.getElementById('btnVolver').addEventListener('click', () => {
  window.location.href = 'menuadmin.html';
});

//CERRAR SESION
document.getElementById('btnLogout').addEventListener('click', () => {
  const confirmar = confirm("¿Estás seguro que quieres cerrar sesión?");
  if (confirmar) {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  }
});
