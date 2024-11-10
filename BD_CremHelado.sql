-- Tabla de regionales
CREATE TABLE regionales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- Tabla de sedes (ciudades) asociadas a regionales
CREATE TABLE sedes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    id_regional INT REFERENCES regionales(id) ON DELETE CASCADE,
    UNIQUE (nombre, id_regional) -- Evitar duplicados de sede dentro de una misma regional
);

-- Tabla de roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

-- Tabla de usuarios, asociados a una sede específica
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL CHECK (char_length(nombre) <= 100),
    username VARCHAR(50) UNIQUE NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    contraseña TEXT NOT NULL,
    id_rol INT REFERENCES roles(id) ON DELETE SET NULL,
    id_sede INT REFERENCES sedes(id) ON DELETE SET NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla de retos, vinculados a sedes específicas
-- Crear tabla retos con todas las columnas necesarias
CREATE TABLE retos (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    tiene_solucion BOOLEAN NOT NULL DEFAULT FALSE, -- Indica si tiene solución o no
    solucion_propuesta TEXT, -- Solo se llena si tiene solución
    beneficios TEXT NOT NULL, -- Beneficios propuestos
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'activo',
    importancia VARCHAR(50), -- Grado de importancia
    id_sede INTEGER NOT NULL, -- Clave foránea a la tabla sedes
    id_rol_promotor INTEGER, -- Clave foránea a la tabla roles_promotor
    id_promotor INTEGER, -- Clave foránea a la tabla promotores
    archivo_pdf TEXT, -- Ruta o nombre del archivo PDF (puede ser null si se usa enlace)
    enlace_canva TEXT, -- Enlace a Canva (puede ser null si se usa PDF)
    
    -- Claves foráneas
    CONSTRAINT fk_sede FOREIGN KEY (id_sede) REFERENCES sedes (id) ON DELETE CASCADE,
    CONSTRAINT fk_rol_promotor FOREIGN KEY (id_rol_promotor) REFERENCES roles_promotor (id),
    CONSTRAINT fk_promotor FOREIGN KEY (id_promotor) REFERENCES promotores (id) ON DELETE SET NULL
);

-- Agregar restricciones para garantizar que al menos una de las dos columnas (archivo_pdf o enlace_canva) esté presente
ALTER TABLE retos 
ADD CONSTRAINT chk_archivo_o_enlace 
CHECK (
    (archivo_pdf IS NOT NULL AND enlace_canva IS NULL) OR 
    (archivo_pdf IS NULL AND enlace_canva IS NOT NULL)
);

-- Asegurarse de que solución propuesta sea null si el reto no tiene solución
ALTER TABLE retos
ADD CONSTRAINT chk_solucion_propuesta
CHECK (
    (tiene_solucion = TRUE AND solucion_propuesta IS NOT NULL) OR 
    (tiene_solucion = FALSE AND solucion_propuesta IS NULL)
);

ALTER TABLE retos
DROP COLUMN archivo_pdf;

ALTER TABLE retos
ADD COLUMN archivo_pdf BYTEA;

ALTER TABLE retos
ADD COLUMN id_usuario INT NOT NULL;

ALTER TABLE retos
ADD CONSTRAINT fk_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id) ON DELETE CASCADE;

ALTER TABLE retos
ALTER COLUMN importancia SET DEFAULT 'no definido';

ALTER TABLE retos
ALTER COLUMN fecha_fin SET DEFAULT (CURRENT_DATE + INTERVAL '1 month');


-- Tabla de sesiones de ideación
CREATE TABLE sesiones_ideacion (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha TIMESTAMP NOT NULL,
    id_reto INT REFERENCES retos(id)
);

CREATE TABLE ideas_innovadoras (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    foto_url TEXT,
    id_sede INT NOT NULL,
    FOREIGN KEY (id_sede) REFERENCES sedes(id)
);
-- otra versión de ideas_innovadoras pero sin foto
CREATE TABLE ideas (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha_creacion DATE DEFAULT CURRENT_DATE,
    id_sede INTEGER NOT NULL,
    FOREIGN KEY (id_sede) REFERENCES sedes (id) ON DELETE CASCADE
);



-- Tabla de programas
CREATE TABLE programas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'activo'
);

-- Tabla de colaboraciones de usuarios en retos
CREATE TABLE colaboraciones (
    id SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES usuarios(id),
    id_reto INT REFERENCES retos(id),
    fecha_participacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de notificaciones para los usuarios
CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    mensaje TEXT NOT NULL,
    leido BOOLEAN DEFAULT FALSE,
    id_usuario INT REFERENCES usuarios(id),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de logs de eventos del sistema
CREATE TABLE logs_eventos (
    id SERIAL PRIMARY KEY,
    descripcion TEXT NOT NULL,
    tipo VARCHAR(50),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de calificaciones de retos
CREATE TABLE calificaciones_retos (
    id SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES usuarios(id),
    id_reto INT REFERENCES retos(id),
    calificacion NUMERIC(2,1) CHECK (calificacion BETWEEN 0 AND 5),
    comentario TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE promotor_cargas (
    id_promotor INT PRIMARY KEY,
    total_retos INT DEFAULT 0,
    FOREIGN KEY (id_promotor) REFERENCES promotores(id)
);


-- Insertar datos iniciales de roles
INSERT INTO roles (id, nombre) VALUES 
(1, 'Usuario'),
(2, 'Promotor');

-- Insertar datos iniciales de regionales
INSERT INTO regionales (nombre) VALUES
('Central'),
('Antioquia'),
('Costa'),
('Occidental'),
('Santander'),
('Eje Cafetero'),
('Tolhuca');


INSERT INTO sedes (id, nombre, id_regional, latitud, longitud) VALUES
(1, 'Bogotá', 1, 4.695381, -74.078240),
(2, 'Villavicencio', 1, 4.142523, -73.624718),
(3, 'Medellín', 2, 6.234452, -75.600197),
(4, 'Barranquilla', 3, 10.950578, -74.837543),
(5, 'Cartagena', 3, 10.377466, -75.502541),
(6, 'Cali', 4, 3.517201, -76.500528),
(7, 'Pasto', 4, 1.206801, -77.264138),
(8, 'Bucaramanga', 5, 7.085446, -73.136168),
(9, 'Cúcuta', 5, 7.915705, -72.500200),
(10, 'Pereira', 6, 4.840627, -75.682749),
(11, 'Manizales', 6, 5.060039, -75.509855),
(12, 'Armenia', 6, 4.454114, -75.774112),
(13, 'Neiva', 7, 2.907994, -75.281023),
(14, 'Ibagué', 7, 4.426851, -75.176935);

ALTER TABLE sedes
ADD COLUMN latitud DECIMAL(9,6),
ADD COLUMN longitud DECIMAL(9,6);

CREATE TABLE promotores (
    id SERIAL PRIMARY KEY,
    nombre_apellido VARCHAR(100) NOT NULL,
    id_rol INTEGER NOT NULL,
    id_sede INTEGER NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    nivel VARCHAR(20) NOT NULL,
    CONSTRAINT fk_roles FOREIGN KEY (id_rol) REFERENCES roles_promotor (id) ON DELETE CASCADE,
    CONSTRAINT fk_sedes FOREIGN KEY (id_sede) REFERENCES sedes (id) ON DELETE CASCADE
);

-- Crear la tabla de autenticación de promotores
CREATE TABLE promotores_login (
    id SERIAL PRIMARY KEY,
    promotor_id INTEGER NOT NULL,  -- Clave foránea hacia la tabla promotores
    usuario VARCHAR(50) UNIQUE NOT NULL,  -- Nombre de usuario único para autenticación
    contraseña VARCHAR(255) NOT NULL,     -- Almacena la contraseña (se recomienda encriptar)
    CONSTRAINT fk_promotor FOREIGN KEY (promotor_id) REFERENCES promotores (id) ON DELETE CASCADE
);

-- Índice opcional para mejorar las consultas de autenticación
CREATE INDEX idx_promotor_usuario ON promotores_login (usuario);



CREATE TABLE roles_promotor (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO promotor_cargas (id_promotor, total_retos)
SELECT id, 0
FROM promotores
WHERE id NOT IN (SELECT id_promotor FROM promotor_cargas);


INSERT INTO roles_promotor (nombre) VALUES
('Ventas'),
('Financiera'),
('Cadena'),
('Mercadeo'),
('DHCO');

--parte para el nuevo agregamiento de los nuevos usuarios 
-- Tabla para credenciales de acceso de clientes internos
CREATE TABLE clientes_internos (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL
);

-- Tabla con la información detallada del cliente interno
CREATE TABLE informacion_cliente_interno (
    id_cliente INTEGER PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    sede INTEGER NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    FOREIGN KEY (id_cliente) REFERENCES clientes_internos(id) ON DELETE CASCADE
);

-- Tabla para credenciales de acceso de evaluadores
CREATE TABLE evaluadores (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL
);

-- Tabla con la información detallada del evaluador
CREATE TABLE informacion_evaluador (
    id_evaluador INTEGER PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    sede INTEGER NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    FOREIGN KEY (id_evaluador) REFERENCES evaluadores(id) ON DELETE CASCADE
);


INSERT INTO promotores (nombre_apellido, id_rol, id_sede, cargo, correo, nivel) VALUES
-- Nivel PRO
('Carlos Alberto Serrano Moreno', 1, 8, 'Soporte De Mantenimiento Activos Comerciales', 'caserrano@cremhelado.com.co', 'PRO'),
('Germán David Navas Mojica', 2, 1, 'Analista De Mejora Continua', 'gdnavas@cremhelado.com.co', 'PRO'),
('Juan Camilo Mahecha Rivas', 3, 1, 'Auxiliar De Educación Y Entrenamiento', 'jcmahecha@cremhelado.com.co', 'PRO'),
('Laura Rocío Moreno Mendoza', 1, 1, 'Analista Ventas', 'lrmoreno@cremhelado.com.co', 'PRO'),
('Geovanny Arias Garcia', 1, 4, 'Supervisor(A) De Ventas', 'garias@cremhelado.com.co', 'PRO'),
('David Julian Garcia Aristizabal', 3, 11, 'Coordinador De Operaciones', 'djgarcia@cremhelado.com.co', 'PRO'),

-- Nivel EXPERTO
('Alirio Ferney Parra Cigua', 3, 1, 'Coordinador De Operaciones', 'aparra@cremhelado.com.co', 'EXPERTO'),
('Álvaro Becerra', 1, 2, 'Supervisor(A) De Ventas', 'abecerra@cremhelado.com.co', 'EXPERTO'),
('Nathalia Andrea Rojas', 1, 2, 'Supervisor(A) De Ventas', 'narojas@cremhelado.com.co', 'EXPERTO'),
('Tatiana Luengas', 4, 1, 'Jefe De Investigación', 'tluengas@cremhelado.com.co', 'EXPERTO'),
('Beyba Deyanira Romero Garzón', 1, 1, 'Jefe De Ventas Canal Alternativo', 'bromero@cremhelado.com.co', 'EXPERTO'),

-- Nivel MASTER
('Ana María Ramón', 1, 1, 'Jefe De Ventas Canal Institucional', 'amramon@cremhelado.com.co', 'MASTER'),
('Cristina Espinosa Cuéllar', 4, 1, 'Director De Nuevos Proyectos', 'cespinosa@cremhelado.com.co', 'MASTER'),
('Margarita Vallejo Combariza', 5, 1, 'Jefe De Comunicaciones Y RS', 'mvallejo@cremhelado.com.co', 'MASTER'),
('Sara Lancheros Rojas', 4, 1, 'Analista de Innovación', 'slancheros@meals.com.co', 'MASTER'),
('Carlos Alberto Flórez', 4, 2, 'Director De Innovación', 'caflorez@meals.com.co', 'MASTER'),
('Camilo González Castro', 2, 1, 'Analista De Tecnología E Información', 'cgonzalez@meals.com.co', 'MASTER');

-- Inserción de más promotores para todas las sedes
INSERT INTO promotores (nombre_apellido, id_rol, id_sede, cargo, correo, nivel) VALUES
-- PRO Nivel
('Andrés Felipe Caro Ramírez', 1, 3, 'Analista de Ventas', 'acaroramirez@cremhelado.com.co', 'PRO'),
('Camila Pérez Londoño', 4, 4, 'Ejecutivo de Marca', 'clondono@cremhelado.com.co', 'PRO'),
('Luis Miguel Gutiérrez Salazar', 2, 5, 'Auxiliar Contable', 'lgutierrez@cremhelado.com.co', 'PRO'),
('Sofía Rodríguez Acosta', 3, 6, 'Coordinador de Planta', 'srodriguez@cremhelado.com.co', 'PRO'),
('Julián Vargas Nieto', 5, 7, 'Jefe de Comunicaciones', 'jvargas@cremhelado.com.co', 'PRO'),
('Daniela Parra Montoya', 4, 8, 'Ejecutivo de Marketing', 'dparramontoya@cremhelado.com.co', 'PRO'),

-- Nivel EXPERTO
('Marcela Peña Castaño', 2, 9, 'Jefe Financiero', 'mpena@cremhelado.com.co', 'EXPERTO'),
('Esteban Hernández Gómez', 3, 10, 'Coordinador de Logística', 'ehernandez@cremhelado.com.co', 'EXPERTO'),
('Catalina Ríos Torres', 4, 11, 'Ejecutivo de Marca', 'crios@cremhelado.com.co', 'EXPERTO'),
('Jorge Luis Rincón Ávila', 1, 12, 'Supervisor de Ventas', 'jrincon@cremhelado.com.co', 'EXPERTO'),
('Mariana Gómez Sierra', 5, 13, 'Directora de Proyectos', 'mgomez@cremhelado.com.co', 'EXPERTO'),
('Carlos Andrés Romero Suárez', 1, 14, 'Supervisor de Zona', 'cromero@cremhelado.com.co', 'EXPERTO'),

-- Nivel MASTER
('Fernando Lara Méndez', 3, 2, 'Gerente de Operaciones', 'flaramendez@cremhelado.com.co', 'MASTER'),
('Valentina Quintero Lozano', 2, 5, 'Analista Financiero', 'vquintero@cremhelado.com.co', 'MASTER'),
('Mateo Restrepo Arias', 4, 7, 'Director de Marca', 'mrestrepo@cremhelado.com.co', 'MASTER'),
('Laura Camila Soto Vega', 1, 9, 'Coordinadora de Ventas', 'lsotovega@cremhelado.com.co', 'MASTER'),
('Pablo Martínez Garzón', 3, 10, 'Jefe de Planta', 'pmartinez@cremhelado.com.co', 'MASTER'),
('Claudia Jiménez Vargas', 5, 13, 'Jefe de Innovación', 'cjimenez@cremhelado.com.co', 'MASTER'),
('Manuel Rodríguez Pérez', 2, 14, 'Analista Financiero', 'mrodriguezperez@cremhelado.com.co', 'MASTER');


INSERT INTO retos (titulo, descripcion, fecha_inicio, fecha_fin, estado, id_sede) VALUES
('Reto de Innovación en Marketing', 'Crear una estrategia de marketing innovadora para la región.', '2024-01-10 08:00:00', '2024-01-20 18:00:00', 'activo', 1),
('Reto de Sostenibilidad', 'Implementar medidas sostenibles en la planta de producción.', '2024-02-01 09:00:00', '2024-02-15 17:00:00', 'activo', 2),
('Optimización de Procesos', 'Reducir tiempos en la cadena logística.', '2024-03-05 08:00:00', '2024-03-25 17:00:00', 'inactivo', 3),
('Reto de Nuevos Productos', 'Desarrollar tres nuevos sabores de helados.', '2024-04-10 09:00:00', '2024-04-30 16:00:00', 'activo', 4),
('Reducción de Desperdicios', 'Propuesta para reducir los desperdicios en un 15%.', '2024-05-01 08:30:00', '2024-05-15 18:00:00', 'activo', 5),
('Mejora de Experiencia del Cliente', 'Implementar un nuevo canal de atención al cliente.', '2024-06-01 10:00:00', '2024-06-30 18:00:00', 'activo', 6),
('Automatización de Procesos', 'Automatizar tareas repetitivas en la planta.', '2024-07-01 09:00:00', '2024-07-15 17:00:00', 'inactivo', 7),
('Expansión Internacional', 'Abrir operaciones en nuevos mercados internacionales.', '2024-08-01 08:00:00', '2024-08-20 17:00:00', 'activo', 8),
('Integración Tecnológica', 'Implementar un sistema ERP en todas las sedes.', '2024-09-10 09:00:00', '2024-09-30 18:00:00', 'activo', 9),
('Innovación en Productos', 'Crear una nueva línea de productos veganos.', '2024-10-05 09:30:00', '2024-10-25 17:00:00', 'activo', 10),
('Optimización de Recursos', 'Reducir los costos de producción en un 10%.', '2024-11-01 08:00:00', '2024-11-15 17:00:00', 'activo', 11),
('Reto de Responsabilidad Social', 'Lanzar una campaña en colaboración con ONGs.', '2024-12-01 10:00:00', '2024-12-20 18:00:00', 'activo', 12),
('Transformación Digital', 'Digitalizar todos los procesos de ventas y logística.', '2024-01-05 08:00:00', '2024-01-25 17:00:00', 'activo', 13),
('Innovación en Mercadeo', 'Crear campañas de marketing basadas en inteligencia artificial.', '2024-02-01 09:00:00', '2024-02-28 17:00:00', 'activo', 14);


