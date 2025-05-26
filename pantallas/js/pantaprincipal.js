const contenedor = document.getElementById('eventos-container');
const buscador = document.getElementById('buscador');

let eventos = [];
let eventosFiltrados = [];

async function obtenerEventos(categoriaId = 0) {
  try {
    const response = await fetch(`/eventos/${categoriaId}`);
    if (!response.ok) throw new Error('Error al obtener eventos');
    eventos = await response.json();
    eventosFiltrados = eventos;
    mostrarEventos(eventos);
  } catch (error) {
    contenedor.innerHTML = `<p style="color:white; font-weight:bold;">${error.message}</p>`;
  }
}

function mostrarEventos(listaEventos) {
  contenedor.innerHTML = '';
  if (listaEventos.length === 0) {
    contenedor.innerHTML = '<p style="color:white; font-weight:bold;">No hay eventos que coincidan.</p>';
    return;
  }
  listaEventos.forEach(evento => {
    const card = document.createElement('div');
    card.className = 'card';

    const fechaHora = new Date(evento.fecha_hora);
    const fecha = fechaHora.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    const hora = fechaHora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    card.innerHTML = `
      <h3>${evento.nombre_evento}</h3>
      <p>${fecha} <br>${hora} hrs <br>${evento.lugar}</p>
      <img src="${evento.imagen_url || 'images/default.jpg'}" alt="${evento.nombre_evento}">
    `;

//INFO EVENTO A infoevento.html
    card.onclick = () => {
      window.location.href = `infoevento.html?id=${evento.id_evento}`;
    };
    contenedor.appendChild(card);
  });
}

buscador.addEventListener('input', () => {
  const texto = buscador.value.toLowerCase();
  const filtrados = eventosFiltrados.filter(ev =>
    ev.nombre_evento.toLowerCase().includes(texto) ||
    ev.lugar.toLowerCase().includes(texto) ||
    (ev.categoria_nombre && ev.categoria_nombre.toLowerCase().includes(texto))
  );
  mostrarEventos(filtrados);
});

//FILTRO CATEGORIAS
document.getElementById('btnEstudiantiles').addEventListener('click', () => obtenerEventos(1));
document.getElementById('btnAcademicos').addEventListener('click', () => obtenerEventos(2));
document.getElementById('btnCulturales').addEventListener('click', () => obtenerEventos(3));

obtenerEventos(0);

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