function verEventos() {
  window.location.href = "admin_comentarios.html";
}

function gestionarEvento() {
  window.location.href = "crear_eventos.html";
}

function verUsuarios() {
  window.location.href = "usuarios_registrados.html";
}

//CERRAR SESION
document.getElementById('btnLogout').addEventListener('click', () => {
  const confirmar = confirm("¿Estás seguro que quieres cerrar sesión?");
  if (confirmar) {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  }
});