async function cargarUsuarios() {
  try {
    const res = await fetch('/usuarios');
    const data = await res.json();

    if (!data.success) {
      alert('Error al cargar usuarios');
      return;
    }

    const tbody = document.getElementById('tablaUsuariosBody');
    tbody.innerHTML = '';

    data.usuarios.forEach(usuario => {
      let fechaHoraRegistro = "--:-- hrs / --/--/----";
      if (usuario.fecha_registro) {
        const fecha = new Date(usuario.fecha_registro);
        const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        const fechaFormateada = fecha.toLocaleDateString('es-MX');
        fechaHoraRegistro = `${hora} hrs / ${fechaFormateada}`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fechaHoraRegistro}</td>
        <td>${usuario.correo}</td>
        <td>${usuario.nombre_rol}</td>
        <td>
          <button class="btn btn-danger eliminar" data-id="${usuario.id_usuario}">
            Eliminar usuario permanente
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.eliminar').forEach(btn => {
      btn.addEventListener('click', eliminarUsuario);
    });

  } catch (error) {
    console.error('Error al cargar usuarios:', error);
  }
}

function filtrarUsuarios() {
  const input = document.getElementById('buscador').value.toLowerCase();
  const filas = document.querySelectorAll('#tablaUsuariosBody tr');

  filas.forEach(fila => {
    const correo = fila.cells[1].textContent.toLowerCase();
    const rol = fila.cells[2].textContent.toLowerCase();
    fila.style.display = correo.includes(input) || rol.includes(input) ? '' : 'none';
  });
}

async function eliminarUsuario(event) {
  const id = event.target.getAttribute('data-id');
  if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

  try {
    const res = await fetch(`/usuarios/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (data.success) {
      alert('Usuario eliminado correctamente');
      cargarUsuarios();
    } else {
      alert('Error al eliminar usuario');
    }
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
  }
}

window.addEventListener('load', cargarUsuarios);

function irMenuAdmin() {
  window.location.href = '/menuadmin.html';
}

//CERRAR SESION
document.getElementById('btnLogout').addEventListener('click', () => {
  const confirmar = confirm("¿Estás seguro que quieres cerrar sesión?");
  if (confirmar) {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  }
});

