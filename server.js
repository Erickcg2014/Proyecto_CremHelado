const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg'); 
const multer = require('multer');
const path = require('path'); 
const app = express();
const axios = require('axios');
const router = express.Router();




// Configuración del puerto
const PORT = 3000;
const JWT_SECRET = '#ProyectoInnovación123';

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Conexión a PostgreSQL
const pool = new Pool({
  user: 'postgres',            
  host: 'localhost',            
  database: 'Innovacion',       
  password: 'nueva_contraseña', 
  port: 5432,                   
});
module.exports = pool;



// Middleware para interpretar JSON
app.use(express.json());

//FUNCIÓN PROPIA PARA CALCULAR LA SIMILITUD

app.use('/api', router); 

// Servir archivos estáticos desde la carpeta "login"
app.use('/login', express.static(path.join(__dirname, 'login')));
app.use('/usuario', express.static(path.join(__dirname, 'usuario')));
app.use('/promotor', express.static(path.join(__dirname, 'promotor')));


// Redirigir a la página de login en la raíz
app.get('/', (req, res) => {
  res.redirect('/login/html/loginSinGuardar.html');
});


app.post('/registro', async (req, res) => {
  console.log('Solicitud de registro recibida:', req.body);

  const { nombre, username, correo, contraseña, id_rol, id_sede } = req.body;

  try {
    // Verificar si el correo o el username ya existen
    const correoExistente = await pool.query(
      'SELECT correo FROM usuarios WHERE correo = $1',
      [correo]
    );

    const usernameExistente = await pool.query(
      'SELECT username FROM usuarios WHERE username = $1',
      [username]
    );

    if (correoExistente.rows.length > 0) {
      return res.status(400).json({ message: 'El correo ya está registrado.' });
    }

    if (usernameExistente.rows.length > 0) {
      return res.status(400).json({ message: 'El username ya está en uso.' });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(contraseña, 10);
    console.log('Contraseña encriptada:', hashedPassword);

    // Insertar el nuevo usuario con username y sede
    await pool.query(
      'INSERT INTO usuarios (nombre, username, correo, contraseña, id_rol, id_sede) VALUES ($1, $2, $3, $4, $5, $6)',
      [nombre, username, correo, hashedPassword, id_rol, id_sede]
    );

    console.log('Usuario registrado exitosamente.');
    res.status(201).json({ message: 'Usuario registrado exitosamente.' });
  } catch (error) {
    console.error('Error en el registro:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Ruta de login (ahora usando username en lugar de nombre)
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Solicitud de login recibida:', { username });

  try {
      const result = await pool.query(
          `SELECT u.id, u.username, u.contraseña, u.nombre, s.nombre AS sede, 
                  s.latitud, s.longitud, u.id_rol 
           FROM usuarios u 
           JOIN sedes s ON u.id_sede = s.id 
           WHERE u.username = $1`,
          [username]
      );

      if (result.rows.length === 0) {
          console.warn('Usuario no encontrado:', username);
          return res.status(401).json({ message: 'Usuario no encontrado' });
      }

      const user = result.rows[0];
      console.log('Datos del usuario recuperado:', user);

      const validPassword = await bcrypt.compare(password, user.contraseña);
      if (!validPassword) {
          console.warn('Contraseña incorrecta para el usuario:', username);
          return res.status(401).json({ message: 'Contraseña incorrecta' });
      }

      const token = jwt.sign(
          { 
              id: user.id, 
              username: user.username, 
              nombre: user.nombre, 
              sede: user.sede, 
              latitud: user.latitud, 
              longitud: user.longitud, 
              role: user.id_rol 
          },
          JWT_SECRET,
          { expiresIn: '1h' }
      );

      console.log('Token JWT generado:', token);

      let redirectUrl;
      if (user.id_rol === 1) {
          redirectUrl = '/usuario/home/usuario-dashboard.html';
      } else if (user.id_rol === 2) {
          redirectUrl = '/promotor/home/dashboard-principal.html';
      } else if (user.id_rol === 3) {
          redirectUrl = '/clienteInterno/home/cliente-dashboard.html';
      } else if (user.id_rol === 4) {
          redirectUrl = '/evaluador/home/evaluador-dashboard.html';
      } else {
          return res.status(403).json({ message: 'Rol no autorizado' });
      }

      res.json({
          message: 'Inicio de sesión exitoso',
          token,
          redirectUrl,  // Nueva propiedad para la URL de redirección
          user: {
              id: user.id,
              nombre: user.nombre,
              sede: user.sede,
              latitud: user.latitud,
              longitud: user.longitud,
              username: user.username,
              role: user.id_rol
          }
      });
  } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ message: 'Error en el servidor' });
  }
});


// Verificar si el username ya existe
app.get('/registro/username/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query('SELECT 1 FROM usuarios WHERE username = $1', [username]);

    res.json({ exists: result.rows.length > 0 });
  } catch (error) {
    console.error('Error al verificar el username:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

//-------------------------SEDES
app.get('/api/sedes', async (req, res) => {
  try {
      console.log('Obteniendo sedes...');
      const { rows } = await pool.query('SELECT id, nombre, latitud, longitud FROM sedes');

      if (rows.length === 0) {
          console.warn('No se encontraron sedes.');
          return res.status(404).json({ message: 'No se encontraron sedes.' });
      }

      console.log('Sedes obtenidas:', rows);
      res.status(200).json(rows);
  } catch (error) {
      console.error('Error al obtener las sedes:', error);
      res.status(500).json({ error: 'Error al obtener las sedes.' });
  }
});


app.get('/api/sedes/:id/retos-ideas', async (req, res) => {
  const { id } = req.params;
  
  try {
    const retos = await pool.query(
      'SELECT * FROM retos WHERE id_sede = $1', [id]
    );

    const ideas = await pool.query(
      'SELECT * FROM ideas_innovadoras WHERE id_sede = $1', [id]
    );

    res.json({
      retos: retos.rows,
      ideas: ideas.rows,
    });
  } catch (error) {
    console.error('Error al obtener retos e ideas:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});



// Middleware para verificar JWT
function authenticateToken(req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1];
  
    if (!token) {
      return res.status(401).json({ message: 'Acceso denegado. No se proporcionó un token.' });
    }
  
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Token no válido' });
      }
      req.user = user;
      next();
    });
  }

  app.get('/api/retos', async (req, res) => {
    const limit = parseInt(req.query.limite) || 10; // Por defecto 10 retos por página
    const page = parseInt(req.query.page) || 1; // Página actual, por defecto 1
    const offset = (page - 1) * limit; // Cálculo del offset

    try {
        console.log('Obteniendo los retos desde la base de datos...');
        const { rows } = await pool.query(
            `SELECT 
                r.id, 
                r.titulo, 
                r.descripcion, 
                r.importancia, 
                r.estado, 
                rp.nombre AS area, 
                u.nombre AS nombreCreador, 
                p.nombre_apellido AS nombrePromotor, 
                p.cargo AS cargoPromotor, 
                p.correo AS correoPromotor
            FROM retos r
            JOIN roles_promotor rp ON r.id_rol_promotor = rp.id
            JOIN usuarios u ON r.id_usuario = u.id
            LEFT JOIN promotores p ON r.id_promotor = p.id
            ORDER BY r.fecha_inicio DESC
            LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        console.log('Retos obtenidos:', rows);
        res.status(200).json(rows); // Devolver los retos obtenidos
    } catch (error) {
        console.error('Error al obtener los retos:', error);
        res.status(500).json({ error: 'Error al obtener los retos. Inténtalo más tarde.' });
    }
});


app.get('/api/retos-usuario/:idUsuario', async (req, res) => {
  const { idUsuario } = req.params;

  try {
      console.log(`Obteniendo retos creados por el usuario con ID: ${idUsuario}`);

      const query = `
          SELECT 
              r.id, 
              r.titulo, 
              rp.nombre AS area,  -- Nombre del área correspondiente al rol del promotor
              COALESCE(r.importancia, 'No definida') AS importancia, 
              r.estado, 
              p.correo AS promotor_correo, 
              p.nombre_apellido AS promotor_nombre
          FROM retos r
          LEFT JOIN promotores p ON r.id_promotor = p.id
          LEFT JOIN roles_promotor rp ON r.id_rol_promotor = rp.id  -- JOIN con roles_promotor
          WHERE r.id_usuario = $1
          ORDER BY r.fecha_inicio DESC;
      `;

      const { rows } = await pool.query(query, [idUsuario]);

      if (rows.length === 0) {
          console.warn(`No se encontraron retos para el usuario con ID: ${idUsuario}`);
          return res.status(404).json({ message: 'No se encontraron retos para este usuario.' });
      }

      console.log('Retos obtenidos:', rows);
      res.status(200).json({ retos: rows });
  } catch (error) {
      console.error('Error al obtener los retos del usuario:', error);
      res.status(500).json({ error: 'Error al obtener los retos del usuario.' });
  }
});




  //------------------------------------ENDPOINTS ESTADÍSTICAS------------------------------------------------------

  // Endpoint para obtener retos activos por sede

  app.get('/api/retos-sede/:idSede', async (req, res) => {
    const { idSede } = req.params;
    const limit = parseInt(req.query.limit) || 10; // Límite por defecto de 10

    try {
        console.log(`Obteniendo los últimos ${limit} retos activos de la sede con ID: ${idSede}`);

        const query = `
            SELECT 
                r.id, 
                r.titulo, 
                r.descripcion, 
                r.importancia, 
                r.estado, 
                rp.nombre AS area, 
                u.nombre AS nombrecreador
            FROM retos r
            JOIN usuarios u ON r.id_usuario = u.id
            LEFT JOIN roles_promotor rp ON r.id_rol_promotor = rp.id
            WHERE r.id_sede = $1 AND r.estado = 'activo'
            ORDER BY r.fecha_inicio DESC
            LIMIT $2;
        `;

        const { rows } = await pool.query(query, [idSede, limit]);

        console.log('Retos obtenidos:', rows);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No existen actualmente retos activos para esta sede.' });
        }

        res.status(200).json({ retos: rows });
    } catch (error) {
        console.error('Error al obtener los retos de la sede:', error);
        res.status(500).json({ error: 'Error al obtener los retos de la sede.' });
    }
});




  app.get('/api/retos/activos', async (req, res) => {
    const { sede } = req.query;
    if (!sede) {
        return res.status(400).json({ error: 'Falta el parámetro de sede.' });
    }

    try {
        const resultado = await pool.query(
            'SELECT COUNT(*) AS activos FROM retos WHERE id_sede = $1 AND estado = $2',
            [sede, 'activo']
        );
        res.json(resultado.rows[0]); // Devuelve la cantidad de retos activos
    } catch (error) {
        console.error('Error al obtener retos activos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.post('/crear-reto', upload.single('archivo_pdf'), async (req, res) => {
  console.log('Solicitud recibida para crear un reto');

  try {
      // Verificar los datos recibidos del cuerpo de la solicitud
      console.log('Datos recibidos:', req.body);

      const {
          titulo,
          descripcion,
          beneficios,
          solucion,
          enlaceCanva,
          idSede,
          idUsuario,
          idPromotor,
      } = req.body;

      // Validar que los campos requeridos estén presentes
      if (!titulo || !descripcion || !beneficios || !idSede || !idUsuario) {
          throw new Error('Datos incompletos. Asegúrate de enviar todos los campos requeridos.');
      }

      const archivoPDF = req.file ? req.file.buffer : null;
      console.log('Archivo PDF recibido:', archivoPDF ? 'Sí' : 'No');

      // Valor por defecto para 'importancia'
      const importancia = 'no definido';

      // Recuperar 'id_rol_promotor' a partir del ID del promotor
      const promotorQuery = `SELECT id_rol FROM promotores WHERE id = $1`;
      const promotorResult = await pool.query(promotorQuery, [idPromotor]);

      if (promotorResult.rows.length === 0) {
          throw new Error('Promotor no encontrado.');
      }

      const idRolPromotor = promotorResult.rows[0].id_rol;

      // Establecer 'fecha_inicio' como ahora y 'fecha_fin' un mes después
      const fechaInicio = new Date();
      const fechaFin = new Date(fechaInicio);
      fechaFin.setMonth(fechaInicio.getMonth() + 1);

      // Inserción del reto en la base de datos
      const query = `
          INSERT INTO retos (
              titulo, descripcion, beneficios, solucion_propuesta, enlace_canva,
              archivo_pdf, id_promotor, tiene_solucion, fecha_inicio, fecha_fin, 
              estado, id_sede, id_usuario, id_rol_promotor, importancia
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'activo', $11, $12, $13, $14)
          RETURNING id;
      `;

      const values = [
          titulo,
          descripcion,
          beneficios,
          solucion || 'Sin solución',
          enlaceCanva || null,
          archivoPDF,
          idPromotor ? parseInt(idPromotor) : null,
          !!solucion, // true si hay solución, false si no
          fechaInicio,
          fechaFin,
          parseInt(idSede),
          parseInt(idUsuario),
          parseInt(idRolPromotor),
          importancia
      ];

      console.log('Valores para la consulta:', values);

      // Ejecutar la consulta en la base de datos
      const { rows } = await pool.query(query, values);

      if (rows.length === 0) {
          throw new Error('No se pudo crear el reto.');
      }

      const retoId = rows[0].id;
      console.log(`Reto creado exitosamente con ID: ${retoId}`);

      res.status(201).json({ message: 'Reto creado exitosamente', id: retoId });
  } catch (error) {
      console.error('Error al crear el reto:', error.message);
      res.status(500).json({ error: error.message });
  }
});

  // Endpoint para obtener la cantidad de retos por mes
  app.get('/api/retos/mes', async (req, res) => {
    const { sede, anio } = req.query;

    if (!sede || !anio) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos.' });
    }

    try {
        const resultado = await pool.query(
            `SELECT EXTRACT(MONTH FROM fecha_inicio) AS mes, COUNT(*) AS cantidad_retos 
             FROM retos 
             WHERE id_sede = $1 AND EXTRACT(YEAR FROM fecha_inicio) = $2
             GROUP BY mes 
             ORDER BY mes`,
            [sede, anio]
        );
        res.json(resultado.rows); // Devuelve la cantidad de retos por mes
    } catch (error) {
        console.error('Error al obtener retos por mes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


 // Endpoint para obtener la cantidad de ideas innovadoras por sede
  app.get('/api/ideas', async (req, res) => {
  const { sedeId } = req.query;  // Asegurar que sedeId proviene de la query

  try {
      // Realizar la consulta utilizando id_sede
      const result = await pool.query(
          'SELECT id, titulo, descripcion, fecha_creacion FROM ideas WHERE id_sede = $1',
          [sedeId]
      );

      res.json(result.rows);  // Devolver todas las ideas de la sede seleccionada
  } catch (error) {
      console.error('Error al obtener ideas innovadoras:', error);
      res.status(500).send('Error al obtener ideas innovadoras');
  }
});

/**--------------CARGAS-------- */

app.get('/api/promotor-disponible/:idRol', async (req, res) => {
  const { idRol } = req.params;

  try {
      console.log(`Buscando promotor para la gerencia con idRol: ${idRol}`);
      
      const query = `
          SELECT 
              p.id, 
              p.nombre_apellido, 
              p.cargo, 
              pc.total_retos
          FROM promotores p
          JOIN promotor_cargas pc ON p.id = pc.id_promotor
          WHERE p.id_rol = $1
          ORDER BY pc.total_retos ASC
          LIMIT 1
      `;

      const { rows } = await pool.query(query, [parseInt(idRol)]);

      if (rows.length > 0) {
          console.log('Promotor encontrado:', rows[0]);
          res.status(200).json(rows[0]); // Retorna el promotor con menor carga
      } else {
          console.warn('No se encontraron promotores para esta gerencia.');
          res.status(404).json({ error: 'No se encontraron promotores para esta gerencia.' });
      }
  } catch (error) {
      console.error('Error al obtener el promotor:', error);
      res.status(500).json({ error: 'Error al obtener el promotor.' });
  }
});

// Obtener detalles de un reto específico junto con la información del promotor
app.get('/api/retos/:id', async (req, res) => {
  const retoId = parseInt(req.params.id);

  if (isNaN(retoId)) {
      return res.status(400).json({ error: 'ID de reto inválido.' });
  }

  try {
      console.log(`Obteniendo detalles del reto con ID: ${retoId}`);

      const queryReto = `
          SELECT 
              r.id, r.titulo, r.descripcion, r.beneficios, r.solucion_propuesta AS solucion, 
              r.fecha_inicio, r.id_sede, s.nombre AS sede, p.nombre_apellido AS promotor_nombre,
              p.cargo AS promotor_cargo, p.email AS promotor_email, p.telefono AS promotor_telefono
          FROM retos r
          JOIN sedes s ON r.id_sede = s.id
          LEFT JOIN promotores p ON r.id_promotor = p.id
          WHERE r.id = $1;
      `;

      const { rows } = await pool.query(queryReto, [retoId]);

      if (rows.length === 0) {
          return res.status(404).json({ error: 'Reto no encontrado.' });
      }

      const reto = rows[0];
      console.log('Detalles del reto:', reto);

      res.status(200).json(reto);
  } catch (error) {
      console.error('Error al obtener el reto:', error);
      res.status(500).json({ error: 'Error al obtener el reto. Inténtalo más tarde.' });
  }
});

// Endpoint para incrementar la carga del promotor
app.put('/api/incrementar-carga/:idPromotor', async (req, res) => {
  const idPromotor = parseInt(req.params.idPromotor);

  if (isNaN(idPromotor)) {
      return res.status(400).json({ error: 'ID de promotor no válido.' });
  }

  try {
      const query = `
          UPDATE promotor_cargas 
          SET total_retos = total_retos + 1 
          WHERE id_promotor = $1
          RETURNING *;
      `;
      const { rows } = await pool.query(query, [idPromotor]);

      if (rows.length > 0) {
          res.status(200).json({ message: 'Carga incrementada exitosamente.' });
      } else {
          res.status(404).json({ error: 'Promotor no encontrado.' });
      }
  } catch (error) {
      console.error('Error al incrementar la carga del promotor:', error);
      res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

//ENDPOINT VERIFICAR SOLICITUD
app.post('/api/verificar-similitud', async (req, res) => {
  const { descripcion } = req.body;
  
  // Log para verificar la descripción recibida
  console.log(`[Node Log] Descripción recibida para verificar similitud: ${descripcion}`);

  try {
      const response = await axios.post('http://localhost:5001/similarity-check', { descripcion });
      const { similarity, most_similar_reto } = response.data;

      // Log para verificar la respuesta recibida del servicio de Python
      console.log(`[Node Log] Respuesta del servicio de similitud: Similarity=${similarity}, Most Similar Reto=${JSON.stringify(most_similar_reto)}`);

      if (similarity > 75) {
          res.json({ redirect: true, most_similar_reto });
      } else {
          res.json({ redirect: false, similarity });
      }
  } catch (error) {
      console.error('[Node Log] Error en la verificación de similitud:', error);
      res.status(500).json({ error: 'Error en la verificación de similitud' });
  }
});


module.exports = router;


// Rutas protegidas
app.get('/usuario', authenticateToken, (req, res) => {
  res.json({ message: `Bienvenido Usuario ${req.user.username}!` });
});

app.get('/promotor', authenticateToken, (req, res) => {
  res.json({ message: `Bienvenido Promotor ${req.user.username}!` });
});

// -------------------- INICIO DEL SERVIDOR --------------------
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
