document.addEventListener('DOMContentLoaded', () => {
    cargarRetos();
    configurarFiltros();
});

let retosGlobal = []; // Almacena los retos obtenidos del servidor
let paginaActual = 1; // Página inicial
const elementosPorPagina = 10; // Retos por página

// Función para cargar retos desde el servidor
async function cargarRetos() {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const idUsuario = usuario?.id;

    if (!idUsuario) {
        alert('No se encontró el usuario. Inicie sesión nuevamente.');
        return;
    }

    try {
        console.log(`Iniciando la carga de retos para el usuario con ID: ${idUsuario}`);
        const response = await fetch(`/api/retos-usuario/${idUsuario}`);

        if (!response.ok) {
            throw new Error('Error al obtener los retos.');
        }

        const { retos } = await response.json();
        console.log('Retos obtenidos:', retos);

        if (retos.length === 0) {
            alert('No hay retos creados por este usuario.');
        } else {
            retosGlobal = retos; // Guardar los retos globalmente
            mostrarRetos(retosGlobal);
        }
    } catch (error) {
        console.error('Error al cargar los retos:', error);
        alert('Hubo un problema al cargar los retos. Intente nuevamente.');
    }
}

// Función para mostrar los retos en la tabla
function mostrarRetos(retos) {
    const retosBody = document.getElementById('retos-body');
    retosBody.innerHTML = ''; // Limpiar contenido anterior

    const inicio = (paginaActual - 1) * elementosPorPagina;
    const fin = inicio + elementosPorPagina;
    const retosPagina = retos.slice(inicio, fin); // Retos de la página actual

    retosPagina.forEach((reto) => {
        const estado = reto.estado ? reto.estado.toLowerCase() : 'sin-estado';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${reto.titulo || 'Sin título'}</td>
            <td>${reto.area || 'Área no definida'}</td>
            <td>${reto.promotor_correo || 'Correo no disponible'}</td>
            <td>${reto.promotor_nombre || 'Promotor no asignado'}</td> <!-- Mostrar nombre del promotor -->
            <td>${reto.importancia || 'No definida'}</td>
            <td><span class="status ${estado}">${reto.estado || 'Sin estado'}</span></td>
            <td>
                <button class="edit-btn"><img src="../img/edit.png" alt="Editar" /></button>
                <button class="delete-btn"><img src="../img/delete.png" alt="Eliminar" /></button>
            </td>
        `;
        retosBody.appendChild(row);
    });

    actualizarPaginacion(retos.length); // Actualiza la barra de paginación
}

// Configurar eventos de filtros y búsqueda
function configurarFiltros() {
    const searchInput = document.getElementById('search-input');
    const sortDropdown = document.getElementById('sort-dropdown');

    searchInput.addEventListener('input', filtrarRetos);
    sortDropdown.addEventListener('change', () => ordenarRetosYMostrar());
}

// Función para filtrar retos por búsqueda
// Función para filtrar retos por búsqueda en campos específicos
function filtrarRetos() {
    const input = document.getElementById('search-input').value.toLowerCase();
    
    const retosFiltrados = retosGlobal.filter((reto) =>
        (reto.titulo && reto.titulo.toLowerCase().includes(input)) ||
        (reto.area && reto.area.toLowerCase().includes(input)) ||
        (reto.promotor_correo && reto.promotor_correo.toLowerCase().includes(input)) ||
        (reto.promotor_nombre && reto.promotor_nombre.toLowerCase().includes(input)) ||
        (reto.importancia && reto.importancia.toLowerCase().includes(input)) ||
        (reto.estado && reto.estado.toLowerCase().includes(input))
    );

    paginaActual = 1; // Reiniciar a la primera página al filtrar
    mostrarRetos(retosFiltrados);
}


// Función para ordenar los retos por el criterio seleccionado
function ordenarRetosYMostrar() {
    const criterio = document.getElementById('sort-dropdown').value;
    const retosOrdenados = ordenarRetosPorCriterio(criterio, retosGlobal);

    paginaActual = 1; // Reiniciar a la primera página al ordenar
    mostrarRetos(retosOrdenados);
}

// Función para ordenar los retos según un criterio
function ordenarRetosPorCriterio(criterio, retos) {
    return [...retos].sort((a, b) => {
        const valorA = (a[criterio] || '').toString().toLowerCase();
        const valorB = (b[criterio] || '').toString().toLowerCase();
        return valorA.localeCompare(valorB);
    });
}
function crearNuevoReto() {
    window.location.href = './crearRetoConSolucion.html'; // Redirige a la pantalla de creación de retos
  }
  

// Función para actualizar la barra de paginación
function actualizarPaginacion(totalElementos) {
    const paginacion = document.querySelector('.pagination');
    paginacion.innerHTML = ''; // Limpiar paginación anterior

    const totalPaginas = Math.ceil(totalElementos / elementosPorPagina);

    // Botón de página anterior
    const prevButton = document.createElement('button');
    prevButton.textContent = '<';
    prevButton.disabled = paginaActual === 1;
    prevButton.addEventListener('click', () => {
        if (paginaActual > 1) {
            paginaActual--;
            mostrarRetos(retosGlobal);
        }
    });
    paginacion.appendChild(prevButton);

    // Botones de páginas numeradas
    for (let i = 1; i <= totalPaginas; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.classList.toggle('active', i === paginaActual);
        pageButton.addEventListener('click', () => {
            paginaActual = i;
            mostrarRetos(retosGlobal);
        });
        paginacion.appendChild(pageButton);
    }

    // Botón de página siguiente
    const nextButton = document.createElement('button');
    nextButton.textContent = '>';
    nextButton.disabled = paginaActual === totalPaginas;
    nextButton.addEventListener('click', () => {
        if (paginaActual < totalPaginas) {
            paginaActual++;
            mostrarRetos(retosGlobal);
        }
    });
    paginacion.appendChild(nextButton);
}
