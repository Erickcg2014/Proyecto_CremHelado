document.addEventListener('DOMContentLoaded', () => {
    configurarFormulario();
    document.getElementById('descripcion').addEventListener('blur', verificarSimilitud); 
});

let promotorAsignado = null; // Guardar el promotor asignado
let pdfUrl = ''; // Almacenar la URL del PDF cargado
let isSubmitting = false; // Controlar envío para evitar duplicados

const sedeMap = {
    'Bogotá': 1,
    'Villavicencio': 2,
    'Medellín': 3,
    'Barranquilla': 4,
    'Cartagena': 5,
    'Cali': 6,
    'Pasto': 7,
    'Bucaramanga': 8,
    'Cúcuta': 9,
    'Pereira': 10,
    'Manizales': 11,
    'Armenia': 12,
    'Neiva': 13,
    'Ibagué': 14,
};

// Asignar promotor según la gerencia seleccionada
async function asignarPromotor() {
    const idRol = parseInt(document.getElementById('gerencia-select').value);

    if (isNaN(idRol)) {
        console.error('ID de rol no válido:', idRol);
        alert('Seleccione una gerencia válida.');
        return;
    }

    try {
        console.log(`Buscando promotor para el idRol: ${idRol}`);
        const response = await fetch(`/api/promotor-disponible/${idRol}`);

        if (!response.ok) {
            throw new Error('No se pudo obtener el promotor');
        }

        promotorAsignado = await response.json();
        console.log('Promotor asignado:', promotorAsignado);

        const promotorNombre = document.getElementById('nombre-promotor');
        if (promotorNombre) {
            promotorNombre.innerHTML = `
                <strong>Tu promotor sería:</strong> ${promotorAsignado.nombre_apellido}
                <br><strong>Encargado de:</strong> ${promotorAsignado.cargo}
            `;
        } else {
            console.error('Elemento con ID "nombre-promotor" no encontrado en el DOM.');
        }
    } catch (error) {
        console.error('Error al asignar el promotor:', error);
        alert('No se pudo asignar un promotor. Intente nuevamente.');
    }
}

// Incrementar la carga del promotor seleccionado
async function incrementarCargaPromotor(promotorId) {
    try {
        const response = await fetch(`/api/incrementar-carga/${promotorId}`, {
            method: 'PUT',
        });

        if (!response.ok) {
            throw new Error('No se pudo incrementar la carga del promotor');
        }

        console.log(`Carga incrementada para el promotor ${promotorId}`);
    } catch (error) {
        console.error('Error al incrementar la carga del promotor:', error);
    }
}

// Configurar el formulario y los eventos
function configurarFormulario() {
    document.getElementById('tipo-solucion').addEventListener('change', mostrarSeccionSolucion);
    document.getElementById('archivo-pdf').addEventListener('change', mostrarArchivoCargado);

    const form = document.getElementById('crear-reto-form');
    form.addEventListener('submit', enviarFormulario); // Llama a enviarFormulario al hacer submit
}

// Verificar similitud y actualizar la barra de progreso sin redirigir
// Verificar similitud y actualizar la barra de progreso sin redirigir
async function verificarSimilitud() {
    const descripcion = document.getElementById('descripcion').value;

    console.log(`[Frontend Log] Enviando descripción para verificar similitud: ${descripcion}`);

    try {
        const response = await fetch('http://localhost:3000/api/verificar-similitud', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ descripcion })
        });

        const data = await response.json();
        
        // Log para verificar la respuesta del backend
        console.log(`[Frontend Log] Respuesta de similitud recibida: ${JSON.stringify(data)}`);

        // Asegurarse de que estamos obteniendo el valor correcto de similarity
        const porcentaje = data.most_similar_reto && data.most_similar_reto.similarity !== undefined 
            ? parseFloat(data.most_similar_reto.similarity).toFixed(2) 
            : 0;
        
        console.log(`[Frontend Log] Actualizando la barra de progreso a ${porcentaje}%`);
        actualizarBarraProgreso(porcentaje);
    } catch (error) {
        console.error(`[Frontend Log] Error al verificar similitud: ${error}`);
    }
}

function actualizarBarraProgreso(similarity) {
    const progressBar = document.getElementById('barra-progreso');
    const progressText = document.getElementById('porcentaje-coincidencia');

    if (progressBar && progressText) {
        console.log(`[Frontend Log] Estableciendo el ancho de la barra de progreso a ${similarity}%`);
        progressBar.style.width = `${similarity}%`;
        progressText.textContent = `${similarity}%`;
    } else {
        console.error("[Frontend Log] Los elementos de la barra de progreso no se encontraron en el DOM al intentar actualizar");
    }
}


function validarTitulo() {
    const tituloInput = document.getElementById('titulo-reto');
    const errorText = document.getElementById('titulo-error');
    const palabras = tituloInput.value.trim().split(' ');

    if (palabras.length > 3) {
        errorText.textContent = 'El título no debe exceder las 3 palabras.';
        errorText.style.display = 'block';
    } else {
        errorText.style.display = 'none';
    }
}

// Mostrar información del archivo PDF cargado
function mostrarArchivoCargado() {
    const archivoInput = document.getElementById('archivo-pdf');
    const archivoInfo = document.getElementById('archivo-info');
    const archivoNombre = document.getElementById('archivo-nombre');
    const btnCargar = document.getElementById('btn-cargar');

    if (archivoInput.files.length > 0) {
        const archivo = archivoInput.files[0];
        archivoNombre.textContent = `Archivo cargado: ${archivo.name}`;
        archivoInfo.style.display = 'flex';
        btnCargar.textContent = 'Cambia tu presentación';
        pdfUrl = URL.createObjectURL(archivo);
    } else {
        archivoInfo.style.display = 'none';
        btnCargar.textContent = 'Cargar aquí tu presentación';
        pdfUrl = '';
    }
}

// Abrir el PDF cargado en una nueva pestaña
function abrirPDF() {
    if (pdfUrl) {
        window.open(pdfUrl, '_blank');
    } else {
        alert('No hay PDF cargado.');
    }
}

// Mostrar sección de solución propuesta según el tipo de solución
function mostrarSeccionSolucion() {
    const tipoSolucion = document.getElementById('tipo-solucion').value;
    const seccionSolucion = document.getElementById('seccion-solucion');
    seccionSolucion.style.display = tipoSolucion === 'conSolucion' ? 'block' : 'none';
}

// Enviar el formulario con verificación de similitud
async function enviarFormulario(event) {
    event.preventDefault(); // Prevenir el envío por defecto

    if (isSubmitting) return; // Verificar si ya se está enviando

    isSubmitting = true; // Marcar el envío como en proceso

    const titulo = document.getElementById('titulo-reto').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const beneficios = document.getElementById('beneficios').value.trim();
    const archivoPDF = document.getElementById('archivo-pdf').files[0];
    const enlaceCanva = document.getElementById('enlace-canva').value.trim();
    const solucion = document.getElementById('solucion').value.trim();

    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const nombreSede = usuario ? usuario.sede : null;
    const idSede = sedeMap[nombreSede];
    const idUsuario = usuario ? usuario.id : null;

    if (!idUsuario || !idSede) {
        alert('Información de usuario o sede no disponible. Inicie sesión nuevamente.');
        isSubmitting = false;
        return;
    }

    if (titulo.split(' ').length > 3) {
        alert('El título no debe exceder las 3 palabras.');
        isSubmitting = false;
        return;
    }

    if (!descripcion || !beneficios) {
        alert('Por favor completa la descripción y los beneficios.');
        isSubmitting = false;
        return;
    }

    if (!archivoPDF && !enlaceCanva) {
        alert('Debes subir un PDF o proporcionar un enlace de Canva.');
        isSubmitting = false;
        return;
    }

    try {
        const similarityResponse = await fetch('/api/verificar-similitud', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descripcion })
        });

        if (!similarityResponse.ok) {
            throw new Error('Error al verificar similitud');
        }

        const similarityData = await similarityResponse.json();
        const similarityPercentage = similarityData.similarity;

        if (similarityPercentage > 75) {
            window.location.href = '/usuario/Retos/retoSimilar.html';
            isSubmitting = false;
            return;
        }
    } catch (error) {
        console.error('Error al verificar similitud:', error);
        alert('Hubo un problema al verificar la similitud. Intente nuevamente.');
        isSubmitting = false;
        return;
    }

    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('descripcion', descripcion);
    formData.append('beneficios', beneficios);
    formData.append('solucion', solucion || 'Sin solución');
    formData.append('enlaceCanva', enlaceCanva || '');
    formData.append('idSede', idSede);
    formData.append('idUsuario', idUsuario);
    if (archivoPDF) formData.append('archivo_pdf', archivoPDF);
    if (promotorAsignado) formData.append('idPromotor', promotorAsignado.id);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/crear-reto', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Error al crear el reto.');
        }

        const result = await response.json();
        console.log('Reto creado:', result);
        alert('Reto enviado exitosamente.');

        if (promotorAsignado) {
            await incrementarCargaPromotor(promotorAsignado.id);
        }

        window.location.href = '/usuario/Retos/verMisRetos-Dashboard.html';
    } catch (error) {
        console.error('Error al enviar el reto:', error);
        alert('Hubo un problema al enviar el reto. Intente nuevamente.');
    } finally {
        isSubmitting = false;
    }
}
