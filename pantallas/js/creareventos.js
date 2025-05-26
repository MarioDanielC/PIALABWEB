$(document).ready(function () {
    let filaEditando = null;

    $('#formulario').on('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);

        if (filaEditando) {
            $.ajax({
                url: `/eventos/${filaEditando}`,
                type: 'PUT',
                data: formData,
                contentType: false,
                processData: false,
                success: function(response) {
                    alert(response.message);
                    if(response.success) {
                        cargarEventos();
                        $('#formulario')[0].reset();
                        filaEditando = null;
                        $('button[type="submit"]').text('Agregar');
                    }
                },
                error: function(xhr) {
                    alert('Error al editar evento: ' + (xhr.responseJSON?.message || 'Error desconocido'));
                }
            });
        } else {

//CREAR NUEVO EVENTO
            $.ajax({
                url: '/crear-evento',
                type: 'POST',
                data: formData,
                contentType: false,
                processData: false,
                success: function(response) {
                    alert(response.message);
                    if(response.success) {
                        cargarEventos();
                        $('#formulario')[0].reset();
                    }
                },
                error: function(xhr) {
                    alert('Error al crear evento: ' + (xhr.responseJSON?.message || 'Error desconocido'));
                }
            });
        }
    });

    function cargarEventos() {
        $.ajax({
            url: '/eventos/0',
            method: 'GET',
            success: function(eventos) {
                const tbody = $('#tabla tbody');
                tbody.empty();
                eventos.forEach(ev => {
                    const categoriaTexto = categoriaIdATexto(ev.id_categoria);
                    const fechaHora = new Date(ev.fecha_hora).toLocaleString();
                    const fila = `
                        <tr>
                            <td>${ev.nombre_evento}</td>
                            <td>${fechaHora}</td>
                            <td>${ev.lugar}</td>
                            <td>${categoriaTexto}</td>
                            <td>
                                <button class="editar"
                                    data-id="${ev.id_evento}"
                                    data-nombre="${ev.nombre_evento}"
                                    data-fecha="${ev.fecha_hora}"
                                    data-lugar="${ev.lugar}"
                                    data-categoria="${ev.id_categoria}">
                                    Editar
                                </button>
                                <button class="eliminar" data-id="${ev.id_evento}">Eliminar</button>
                            </td>
                        </tr>
                    `;
                    tbody.append(fila);
                });
            }
        });
    }

    function categoriaIdATexto(id) {
        switch(id) {
            case 1: return 'Estudiantiles';
            case 2: return 'Académicos';
            case 3: return 'Culturales';
            default: return 'Desconocida';
        }
    }

    $('#tabla').on('click', '.eliminar', function () {
        const id = $(this).data('id');
        if(confirm('¿Eliminar evento?')) {
            $.ajax({
                url: `/eventos/${id}`,
                type: 'DELETE',
                success: function(response) {
                    alert(response.message);
                    cargarEventos();
                },
                error: function() {
                    alert('Error eliminando evento.');
                }
            });
        }
    });

    $('#tabla').on('click', '.editar', function () {
        filaEditando = $(this).data('id');
        $('#nombre').val($(this).data('nombre'));
        $('#diah').val(new Date($(this).data('fecha')).toISOString().slice(0,16));
        $('#lugar').val($(this).data('lugar'));
        $('#cat').val($(this).data('categoria'));
        $('button[type="submit"]').text('Guardar cambios');
    });

//CERRAR SESION
    document.getElementById('btnLogout').addEventListener('click', () => {
        const confirmar = confirm("¿Estás seguro que quieres cerrar sesión?");
        if (confirmar) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    });

    cargarEventos();
});
