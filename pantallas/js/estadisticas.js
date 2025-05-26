async function cargarEstadisticas() {
  try {
    const res = await fetch('/api/estadisticas');
    console.log('Fetch response status:', res.status);

    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

    const eventos = await res.json();
    console.log('Eventos recibidos:', eventos);

    const tbody = document.querySelector('#tablaEstadisticas tbody');
    if (!tbody) {
      console.error('No se encontró el tbody de la tabla #tablaEstadisticas');
      return;
    }
    const popularidadDiv = document.getElementById('popularidadContainer');
    if (!popularidadDiv) {
      console.error('No se encontró el contenedor con id popularidadContainer');
      return;
    }

    tbody.innerHTML = '';
    popularidadDiv.innerHTML = '';

    if (!Array.isArray(eventos) || eventos.length === 0) {
      console.warn('No hay eventos para mostrar');
      return;
    }

    const calcularPopularidad = ev => {
      const asistentes = Number(ev.total_asistentes) || 0;
      const comentarios = Number(ev.total_comentarios) || 0;
      const ranking = Number(ev.promedio_ranking) || 0;
      return (asistentes * 0.6 + comentarios * 0.3 + ranking * 2.5);
    };

    const conPopularidad = eventos.map(ev => ({
      ...ev,
      popularidad: calcularPopularidad(ev)
    }));

    conPopularidad.forEach(ev => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${ev.nombre_evento}</td>
        <td>${ev.fecha_hora}</td>
        <td>${ev.lugar}</td>
        <td>${ev.total_asistentes}</td>
        <td>${ev.total_comentarios}</td>
        <td>${Number(ev.promedio_ranking).toFixed(1)}</td>
      `;
      tbody.appendChild(tr);
    });

    conPopularidad
      .sort((a, b) => b.popularidad - a.popularidad)
      .forEach(ev => {
        const div = document.createElement('div');
        div.textContent = `${ev.nombre_evento} → ${ev.popularidad.toFixed(2)}`;
        popularidadDiv.appendChild(div);
      });

  } catch (err) {
    console.error('Error al cargar estadísticas:', err);
    alert('Error al cargar estadísticas: ' + err.message);
  }
}

window.addEventListener('DOMContentLoaded', cargarEstadisticas);

function exportarPDF() {
  window.open('/api/estadisticas/pdf', '_blank');
}
