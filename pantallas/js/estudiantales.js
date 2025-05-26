document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('eventos-container');
  const categoria = 'estudiantiles';

  try {
    const response = await fetch(`/eventos?categoria=${categoria}`);
    if (!response.ok) throw new Error('Error al cargar eventos');

    const eventos = await response.json();

    if (eventos.length === 0) {
      container.innerHTML = `<p style="color:white; font-weight:bold;">No hay eventos ${categoria} disponibles.</p>`;
      return;
    }

    eventos.forEach(evento => {
      const card = document.createElement('div');
      card.classList.add('card');

      const fechaHora = new Date(evento.fecha_hora);
      const fecha = fechaHora.toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
      const hora = fechaHora.toLocaleTimeString('es-ES', {
        hour: '2-digit', minute: '2-digit'
      });

      card.innerHTML = `
        <h3>${evento.nombre_evento}</h3>
        <p>${fecha} <br>${hora} hrs <br>${evento.lugar}</p>
        ${evento.imagen_url ? `<img src="${evento.imagen_url}" alt="${evento.nombre_evento}" />` : ''}
      `;

      card.onclick = () => {
        window.location.href = `infoevento.html?id=${evento.id_evento}`;
      };

      container.appendChild(card);
    });

  } catch (error) {
    container.innerHTML = `<p style="color:white; font-weight:bold;">Error cargando eventos: ${error.message}</p>`;
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

//CERRAR SESION
document.getElementById('btnLogout').addEventListener('click', () => {
  const confirmar = confirm("¿Estás seguro que quieres cerrar sesión?");
  if (confirmar) {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  }
});
