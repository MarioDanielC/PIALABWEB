const express = require('express');
const bcrypt = require('bcrypt');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('./db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const autenticarToken = require('./middlewares/auth');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.static('pantallas'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

//REGISTRO ESTUDIANTE
app.post('/registro', async (req, res) => {
  const { nombre, correo, contraseña, captcha } = req.body;

  if (!nombre || !correo || !contraseña || !captcha) {
    return res.status(400).json({
      success: false,
      message: 'Por favor, completa todos los campos y resuelve el captcha.',
    });
  }

  if (!correo.endsWith('@uanl.edu.mx')) {
    return res.status(400).json({
      success: false,
      message: 'El correo debe ser institucional (@uanl.edu.mx).',
    });
  }

  try {
    const secretKey = '6LfqAzQrAAAAALCM2OEuglsde6Ol5FjZFclk2TBf';
    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captcha}`;

    const captchaRes = await axios.post(verifyURL);
    if (!captchaRes.data.success) {
      return res.status(400).json({
        success: false,
        message: 'Captcha inválido. Intenta nuevamente.',
      });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input('correo', sql.VarChar, correo)
      .query('SELECT * FROM Usuarios WHERE correo = @correo');

    if (result.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una cuenta registrada con este correo.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contraseña, salt);

    await pool.request()
      .input('nombre_usuario', sql.VarChar, nombre)
      .input('contraseña', sql.VarChar, hashedPassword)
      .input('correo', sql.VarChar, correo)
      .input('id_rol', sql.Int, 1)
      .query('INSERT INTO Usuarios (nombre_usuario, contraseña, correo, id_rol) VALUES (@nombre_usuario, @contraseña, @correo, @id_rol)');

    res.status(200).json({ success: true, message: 'Estudiante registrado correctamente' });

  } catch (error) {
    console.error('Error en /registro:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al registrar' });
  }
});

// INICIO SESIÓN ESTUDIANTE
app.post('/login', async (req, res) => {
  const { correo, contraseña } = req.body;

  if (!correo || !contraseña) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos son obligatorios.',
    });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('correo', sql.VarChar, correo)
      .query('SELECT * FROM Usuarios WHERE correo = @correo AND id_rol = 1');

    const user = result.recordset[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    const isMatch = await bcrypt.compare(contraseña, user.contraseña);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    const token = jwt.sign(
      { id: user.id_usuario, correo: user.correo, rol: user.id_rol },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso como estudiante.',
      token,
    });

  } catch (error) {
    console.error('Error en /login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
});

//RESTABLECER CONTRA ESTUDIANTE
app.post('/recuperar-estudiante', async (req, res) => {
  const { correo, captcha } = req.body;

  if (!correo || !captcha) {
    return res.status(400).json({ message: 'Correo y captcha requeridos.' });
  }

  if (!correo.endsWith('@uanl.edu.mx')) {
    return res.status(400).json({ message: 'Correo inválido para estudiante.' });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('correo', sql.VarChar, correo)
      .query(`
        SELECT u.id_usuario, r.nombre_rol
        FROM Usuarios u
        INNER JOIN Roles r ON u.id_rol = r.id_rol
        WHERE u.correo = @correo
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Correo no encontrado.' });
    }

    const user = result.recordset[0];

    if (user.nombre_rol !== 'Estudiante') {
      return res.status(403).json({ message: 'El usuario no es estudiante.' });
    }

    const token = jwt.sign(
      { userId: user.id_usuario, rol: 'estudiante' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const resetLink = `http://localhost:3000/restablecer.html?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: correo,
      subject: 'Recuperación de contraseña - Estudiante',
      html: `<p>Da clic en el siguiente enlace para restablecer tu contraseña:</p>
             <a href="${resetLink}">${resetLink}</a>`
    });

    res.json({ message: 'Instrucciones enviadas al correo.' });

  } catch (err) {
    console.error('Error al procesar la recuperación:', err);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

//REGISTRO ADMIN
app.post('/registro-admin', async (req, res) => {
  const { nombre, correo, contraseña, clave, captcha } = req.body;

  if (!nombre || !correo || !contraseña || !clave || !captcha) {
    return res.status(400).json({
      success: false,
      message: 'Por favor, completa todos los campos y resuelve el captcha.',
    });
  }

  if (clave !== "12345") {
    return res.status(401).json({
      success: false,
      message: 'Clave de administrador incorrecta.',
    });
  }

  try {
    const secretKey = '6LfqAzQrAAAAALCM2OEuglsde6Ol5FjZFclk2TBf';
    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captcha}`;

    const captchaRes = await axios.post(verifyURL);
    if (!captchaRes.data.success) {
      return res.status(400).json({
        success: false,
        message: 'Captcha inválido. Intenta nuevamente.',
      });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input('correo', sql.VarChar, correo)
      .query('SELECT * FROM Usuarios WHERE correo = @correo');

    if (result.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una cuenta registrada con este correo.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contraseña, salt);

    await pool.request()
      .input('nombre_usuario', sql.VarChar, nombre)
      .input('contraseña', sql.VarChar, hashedPassword)
      .input('correo', sql.VarChar, correo)
      .input('id_rol', sql.Int, 2)
      .query('INSERT INTO Usuarios (nombre_usuario, contraseña, correo, id_rol) VALUES (@nombre_usuario, @contraseña, @correo, @id_rol)');

    res.status(200).json({ success: true, message: 'Administrador registrado correctamente' });

  } catch (error) {
    console.error('Error en /registro-admin:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al registrar administrador' });
  }
});

//INICIO SESION ADMIN
app.post('/loginAdmin', async (req, res) => {
  const { correo, contraseña, clave } = req.body;

  if (!correo || !contraseña || !clave) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos son obligatorios.',
    });
  }

  const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;

  console.log('Clave recibida:', clave);
  console.log('Clave esperada:', ADMIN_SECRET_KEY);

  if (!ADMIN_SECRET_KEY) {
    return res.status(500).json({
      success: false,
      message: 'Clave de administrador no configurada en el servidor.',
    });
  }

  if (clave !== ADMIN_SECRET_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Clave de administrador incorrecta.',
    });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('correo', sql.VarChar, correo)
      .query('SELECT * FROM Usuarios WHERE correo = @correo AND id_rol = 2');

    const user = result.recordset[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    const isMatch = await bcrypt.compare(contraseña, user.contraseña);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    const token = jwt.sign(
      { id: user.id_usuario, correo: user.correo, rol: user.id_rol },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso como administrador.',
      token,
    });

  } catch (error) {
    console.error('Error en /loginAdmin:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
});

//RECUPERAR CONTRA ADMIN 
app.post('/recuperar-admin', async (req, res) => {
  const { correo, captcha } = req.body;

  if (!correo || !captcha) {
    return res.status(400).json({ message: 'Correo y captcha requeridos.' });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('correo', sql.VarChar, correo)
      .query(`
        SELECT u.id_usuario, r.nombre_rol
        FROM Usuarios u
        INNER JOIN Roles r ON u.id_rol = r.id_rol
        WHERE u.correo = @correo
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Correo no encontrado.' });
    }

    const user = result.recordset[0];

    if (user.nombre_rol !== 'Administrador') {
      return res.status(403).json({ message: 'El usuario no es administrador.' });
    }

    const token = jwt.sign(
      { userId: user.id_usuario, rol: 'administrador' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const resetLink = `http://localhost:3000/restablecer.html?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: correo,
      subject: 'Recuperación de contraseña - Administrador',
      html: `<p>Da clic en el siguiente enlace para restablecer tu contraseña:</p>
             <a href="${resetLink}">${resetLink}</a>`
    });

    res.json({ message: 'Instrucciones enviadas al correo.' });

  } catch (err) {
    console.error('Error al procesar la recuperación:', err);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

//RESTABLECER CONTRA ESTUDIANTE/ADMIN
app.post('/restablecer-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token y nueva contraseña son requeridos.' });
  }

  try {
 
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const hashedPassword = await bcrypt.hash(password, 10);
    const pool = await getPool();

    await pool.request()
      .input('id_usuario', sql.Int, payload.userId)
      .input('password', sql.VarChar, hashedPassword)
      .query('UPDATE Usuarios SET contraseña = @password WHERE id_usuario = @id_usuario');

    res.json({ message: 'Contraseña restablecida correctamente.' });

  } catch (err) {
    console.error('Error al restablecer contraseña:', err);
    res.status(400).json({ message: 'Token inválido o expirado.' });
  }
});

//VER USUARIOS
app.get('/usuarios', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT id_usuario, nombre_usuario, correo, id_rol,
        fecha_registro,
        CASE id_rol 
          WHEN 1 THEN 'Estudiante'
          WHEN 2 THEN 'Administrador'
        END AS nombre_rol
      FROM Usuarios`);

    res.json({ success: true, usuarios: result.recordset });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al obtener usuarios' });
  }
});

// ELIMINAR USUARIOS
app.delete('/usuarios/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    await pool.request()
      .input('id_usuario', sql.Int, id)
      .query('DELETE FROM Asistencias WHERE id_usuario = @id_usuario');

    await pool.request()
      .input('id_usuario', sql.Int, id)
      .query('DELETE FROM Calificaciones WHERE id_usuario = @id_usuario');

    await pool.request()
      .input('id_usuario', sql.Int, id)
      .query('DELETE FROM Reseñas WHERE id_usuario = @id_usuario');

    await pool.request()
      .input('id_usuario', sql.Int, id)
      .query('DELETE FROM Usuarios WHERE id_usuario = @id_usuario');

    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ success: false, message: 'Error interno al eliminar usuario' });
  }
});

//LIBRERIA MULTER PARA IMAGENES
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/eventos';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const nombreUnico = Date.now() + path.extname(file.originalname);
    cb(null, nombreUnico);
  }
});
const upload = multer({ storage });

//CRUD CREAR EVENTOS
app.post('/crear-evento', upload.single('imagen'), async (req, res) => {
  try {
    const { nombre, diah, lugar, cat } = req.body;
    const imagenUrl = req.file ? `/uploads/eventos/${req.file.filename}` : null;

    console.log('Datos recibidos:', req.body);
    console.log('Imagen:', req.file);

    const pool = await getPool();

    await pool.request()
      .input('nombre_evento', sql.VarChar, nombre)
      .input('fecha_hora', sql.DateTime, new Date(diah))
      .input('lugar', sql.VarChar, lugar)
      .input('imagen_url', sql.VarChar, imagenUrl)
      .input('id_categoria', sql.Int, parseInt(cat))
      .query(`
        INSERT INTO Evento (nombre_evento, fecha_hora, lugar, imagen_url, id_categoria)
        VALUES (@nombre_evento, @fecha_hora, @lugar, @imagen_url, @id_categoria)
      `);

    res.status(200).json({ success: true, message: 'Evento creado correctamente' });
  } catch (error) {
    console.error('Error al crear evento:', error);
    res.status(500).json({ success: false, message: 'Error al crear evento' });
  }
});

//DEVOLVER EVENTOS
app.get('/eventos/:categoriaId', async (req, res) => {
  const { categoriaId } = req.params;
  try {
    const pool = await getPool();

    const query = categoriaId == 0
      ? `
        SELECT E.*, C.nombre_categoria AS categoria_nombre
        FROM Evento E
        JOIN Categorias C ON E.id_categoria = C.id_categoria
        ORDER BY fecha_hora ASC
      `
      : `
        SELECT E.*, C.nombre_categoria AS categoria_nombre
        FROM Evento E
        JOIN Categorias C ON E.id_categoria = C.id_categoria
        WHERE E.id_categoria = @categoriaId
        ORDER BY fecha_hora ASC
      `;

    const result = await pool.request()
      .input('categoriaId', sql.Int, categoriaId)
      .query(query);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({ message: 'Error al obtener eventos' });
  }
});

// DETALLES EVENTO para infoevento.html
app.get('/api/eventos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id_evento', sql.Int, id)
      .query(`
        SELECT E.*, C.nombre_categoria AS categoria_nombre
        FROM Evento E
        JOIN Categorias C ON E.id_categoria = C.id_categoria
        WHERE E.id_evento = @id_evento
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error al obtener detalle del evento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ASISTENCIAS DE EVENTO - CHECK USUARIO
app.get('/api/asistencias/check', async (req, res) => {
  const { id_usuario, id_evento } = req.query;
  if (!id_usuario || !id_evento) {
    return res.status(400).json({ success: false, message: 'Faltan datos' });
  }
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_evento', sql.Int, id_evento)
      .query('SELECT * FROM Asistencias WHERE id_usuario = @id_usuario AND id_evento = @id_evento');

    res.json({ asistio: result.recordset.length > 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error servidor' });
  }
});

//REGISTRO ASISTENCIAS
app.post('/api/asistencias', autenticarToken, async (req, res) => {
  try {
    const id_usuario = req.user.id;
    const { id_evento } = req.body;

    if (!id_evento) {
      return res.status(400).json({ success: false, message: 'Faltan datos: id_evento requerido' });
    }

    const pool = await getPool();

    const existing = await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_evento', sql.Int, id_evento)
      .query('SELECT * FROM Asistencias WHERE id_usuario = @id_usuario AND id_evento = @id_evento');

    if (existing.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Asistencia ya registrada' });
    }

    await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_evento', sql.Int, id_evento)
      .query('INSERT INTO Asistencias (id_usuario, id_evento, fecha_confir) VALUES (@id_usuario, @id_evento, GETDATE())');

    return res.json({ success: true, message: 'Asistencia registrada' });

  } catch (error) {
    console.error('Error guardando asistencia:', error);
    return res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

//ELIMINAR ASISTENCIA
app.delete('/api/asistencias', autenticarToken, async (req, res) => {
  const { id_evento } = req.body;
  const id_usuario = req.user.id;

  try {
    const pool = await getPool();
    await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_evento', sql.Int, id_evento)
      .query('DELETE FROM Asistencias WHERE id_usuario = @id_usuario AND id_evento = @id_evento');

    res.json({ message: 'Asistencia cancelada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error cancelando asistencia' });
  }
});

//CONTADOR ASISTENCIAS
app.get('/api/asistencias/count/:id_evento', async (req, res) => {
  const { id_evento } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id_evento', sql.Int, id_evento)
      .query('SELECT COUNT(*) AS total FROM Asistencias WHERE id_evento = @id_evento');
    res.json({ total: result.recordset[0].total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ total: 0 });
  }
});

//CALIFICACIONES ESTRELLAS - CHECK CAL USUARIO
app.get('/api/calificaciones/check', async (req, res) => {
  const { id_usuario, id_evento } = req.query;
  if (!id_usuario || !id_evento) {
    return res.status(400).json({ success: false, message: 'Faltan datos' });
  }
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_evento', sql.Int, id_evento)
      .query('SELECT cal_estrellas FROM Calificaciones WHERE id_usuario = @id_usuario AND id_evento = @id_evento');

    if (result.recordset.length > 0) {
      res.json({ cal_estrellas: result.recordset[0].cal_estrellas });
    } else {
      res.json({ cal_estrellas: null });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ cal_estrellas: null });
  }
});

// REGISTRO CALIFICACION
app.post('/api/calificaciones', autenticarToken, async (req, res) => {
  const id_usuario = req.user.id;
  const { id_evento, cal_estrellas } = req.body;

  if (!id_usuario || !id_evento || !cal_estrellas) {
    return res.status(400).json({ success: false, message: 'Faltan datos' });
  }

  try {
    const pool = await getPool();

    const existing = await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_evento', sql.Int, id_evento)
      .query('SELECT * FROM Calificaciones WHERE id_usuario = @id_usuario AND id_evento = @id_evento');

    if (existing.recordset.length > 0) {
      await pool.request()
        .input('cal_estrellas', sql.Int, cal_estrellas)
        .input('id_usuario', sql.Int, id_usuario)
        .input('id_evento', sql.Int, id_evento)
        .query('UPDATE Calificaciones SET cal_estrellas = @cal_estrellas, fecha_cal = GETDATE() WHERE id_usuario = @id_usuario AND id_evento = @id_evento');
      res.json({ success: true, message: 'Calificación actualizada' });
    } else {
      await pool.request()
        .input('id_usuario', sql.Int, id_usuario)
        .input('id_evento', sql.Int, id_evento)
        .input('cal_estrellas', sql.Int, cal_estrellas)
        .query('INSERT INTO Calificaciones (id_usuario, id_evento, cal_estrellas, fecha_cal) VALUES (@id_usuario, @id_evento, @cal_estrellas, GETDATE())');
      res.json({ success: true, message: 'Calificación registrada' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error servidor' });
  }
});


// PROMEDIO CALIFICACIONES
app.get('/api/calificaciones/promedio/:id_evento', async (req, res) => {
  const { id_evento } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id_evento', sql.Int, id_evento)
      .query('SELECT AVG(CAST(cal_estrellas AS FLOAT)) AS promedio, COUNT(*) AS total FROM Calificaciones WHERE id_evento = @id_evento');
    res.json({ promedio: result.recordset[0].promedio || 0, total: result.recordset[0].total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ promedio: 0, total: 0 });
  }
});

//OBTENER USUARIO RESEÑA
app.get('/usuario', autenticarToken, async (req, res) => {
  try {
    const pool = await getPool();
    const user = await pool.request()
      .input('id_usuario', sql.Int, req.user.id)
      .query('SELECT nombre_usuario FROM Usuarios WHERE id_usuario = @id_usuario');
    if (!user.recordset.length) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json({ nombre_usuario: user.recordset[0].nombre_usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error interno' });
  }
});

//GUARDAR RESEÑAS
app.post('/resenas', autenticarToken, async (req, res) => {
  try {
    console.log('POST /resenas recibido');
    console.log('req.user:', req.user);
    console.log('req.body:', req.body);

    const { id_evento, comentario } = req.body;

    if (!id_evento || !comentario || comentario.trim() === '') {
      console.log('Datos incompletos o comentario vacío');
      return res.status(400).json({ success: false, message: 'Datos incompletos o comentario vacío' });
    }

    const pool = await getPool();
    await pool.request()
      .input('id_usuario', sql.Int, req.user.id)
      .input('id_evento', sql.Int, id_evento)
      .input('comentario', sql.VarChar, comentario.trim())
      .query(`
        INSERT INTO Reseñas (id_usuario, id_evento, comentario, fecha_reseña)
        VALUES (@id_usuario, @id_evento, @comentario, GETDATE())
      `);

    res.status(200).json({ success: true, message: 'Reseña guardada correctamente' });
  } catch (error) {
    console.error('Error guardando reseña:', error);
    res.status(500).json({ success: false, message: 'Error interno al guardar reseña' });
  }
});

//MOSTRAR RESEÑAS
app.get('/resenas/:idEvento', async (req, res) => {
  const idEvento = parseInt(req.params.idEvento);
  if (isNaN(idEvento)) {
    return res.status(400).json({ message: 'ID de evento inválido' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('idEvento', sql.Int, idEvento)
      .query(`
        SELECT r.comentario, r.fecha_reseña, u.nombre_usuario
        FROM reseñas r
        JOIN usuarios u ON r.id_usuario = u.id_usuario
        WHERE r.id_evento = @idEvento
        ORDER BY r.fecha_reseña DESC
      `);

    res.json({ resenas: result.recordset });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener reseñas' });
  }
});

//DEVOLVER EVENTOS ADMIN
app.get('/api/eventos', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id_evento, nombre_evento, fecha_hora, lugar 
      FROM dbo.Evento
      ORDER BY fecha_hora ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo eventos' });
  }
});

//ELIMINAR EVENTOS
app.delete('/eventos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    //Eliminar calificaciones
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Calificaciones WHERE id_evento = @id');

    //Eliminar reseñas
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Reseñas WHERE id_evento = @id');

    //Eliminar asistencias
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Asistencias WHERE id_evento = @id');

    //Eliminar el evento
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Evento WHERE id_evento = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Evento no encontrado.' });
    }

    res.json({ message: 'Evento eliminado correctamente junto con sus relaciones.' });

  } catch (err) {
    console.error('Error al eliminar evento:', err);
    res.status(500).json({ message: 'Error interno al eliminar evento.' });
  }
});

//EDITAR EVENTO
app.put('/eventos/:id', upload.single('imagen'), async (req, res) => {
  try {
    const pool = await getPool();

    const id = parseInt(req.params.id);
    const { nombre, diah, lugar, cat } = req.body;
    const imagen = req.file ? req.file.filename : null;

    let query = `
      UPDATE Evento
      SET nombre_evento = @nombre,
          fecha_hora = @diah,
          lugar = @lugar,
          id_categoria = @cat
    `;

    if (imagen) {
      query += `, imagen_url = @imagen_url`;
    }

    query += ` WHERE id_evento = @id`;

    const request = pool.request()
      .input('id', sql.Int, id)
      .input('nombre', sql.VarChar(100), nombre)
      .input('diah', sql.DateTime, new Date(diah))
      .input('lugar', sql.Text, lugar)
      .input('cat', sql.Int, parseInt(cat));

    if (imagen) {
      request.input('imagen_url', sql.VarChar(255), imagen);
    }

    await request.query(query);

    res.json({ success: true, message: 'Evento actualizado correctamente' });
  } catch (err) {
    console.error('Error al editar evento:', err);
    res.status(500).json({ success: false, message: 'Error al editar evento' });
  }
});

//COMENTARIOS ADMIN
app.get('/api/comentarios', async (req, res) => {
  const id_evento = req.query.evento;
  if (!id_evento) {
    return res.status(400).json({ message: 'Falta id de evento' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id_evento', sql.Int, id_evento)
      .query(`
        SELECT 
          r.id_usuario, 
          u.nombre_usuario AS usuario, 
          r.comentario, 
          r.fecha_reseña,
          ISNULL(c.cal_estrellas, 0) AS calificacion
        FROM Reseñas r
        JOIN Usuarios u ON r.id_usuario = u.id_usuario
        LEFT JOIN Calificaciones c 
          ON r.id_usuario = c.id_usuario AND r.id_evento = c.id_evento
        WHERE r.id_evento = @id_evento
        ORDER BY r.fecha_reseña DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo comentarios' });
  }
});


//ELIMINAR COMENTARIOS ADMIN
app.delete('/api/comentarios', async (req, res) => {
  const { id_usuario, id_evento } = req.query;

  if (!id_usuario || !id_evento) {
    return res.status(400).json({ message: 'Faltan parámetros: id_usuario o id_evento' });
  }

  try {
    const pool = await getPool();

    await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_evento', sql.Int, id_evento)
      .query(`
        DELETE FROM Calificaciones 
        WHERE id_usuario = @id_usuario AND id_evento = @id_evento
      `);

    await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_evento', sql.Int, id_evento)
      .query(`
        DELETE FROM Reseñas 
        WHERE id_usuario = @id_usuario AND id_evento = @id_evento
      `);

    res.json({ message: 'Comentario eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar comentario' });
  }
});

//ESTADISTICAS
app.get('/api/estadisticas', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
  e.id_evento,
  e.nombre_evento,
  FORMAT(e.fecha_hora, 'HH:mm') + ' hrs ' + FORMAT(e.fecha_hora, 'dd/MM/yyyy') AS fecha_hora,
  e.lugar,
  ISNULL(a.total_asistentes, 0) AS total_asistentes,
  ISNULL(r.total_comentarios, 0) AS total_comentarios,
  ROUND(ISNULL(c.promedio_calificacion, 0), 1) AS promedio_ranking
FROM Evento e
LEFT JOIN (
  SELECT id_evento, COUNT(*) AS total_asistentes
  FROM Asistencias
  WHERE confirmacion = 1
  GROUP BY id_evento
) a ON e.id_evento = a.id_evento
LEFT JOIN (
  SELECT id_evento, COUNT(*) AS total_comentarios
  FROM Reseñas
  GROUP BY id_evento
) r ON e.id_evento = r.id_evento
LEFT JOIN (
  SELECT id_evento, AVG(cal_estrellas) AS promedio_calificacion
  FROM Calificaciones
  GROUP BY id_evento
) c ON e.id_evento = c.id_evento
ORDER BY e.fecha_hora;
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
});

//PDF ESTADISTICAS
app.get('/api/estadisticas/pdf', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        e.nombre_evento,
        FORMAT(e.fecha_hora, 'HH:mm') + ' hrs ' + FORMAT(e.fecha_hora, 'dd/MM/yyyy') AS fecha_hora,
        e.lugar,
        ISNULL(a.total_asistentes, 0) AS total_asistentes,
        ISNULL(r.total_comentarios, 0) AS total_comentarios,
        ROUND(ISNULL(c.promedio_calificacion, 0), 1) AS promedio_ranking
      FROM Evento e
      LEFT JOIN (
        SELECT id_evento, COUNT(*) AS total_asistentes
        FROM Asistencias
        WHERE confirmacion = 1
        GROUP BY id_evento
      ) a ON e.id_evento = a.id_evento
      LEFT JOIN (
        SELECT id_evento, COUNT(*) AS total_comentarios
        FROM Reseñas
        GROUP BY id_evento
      ) r ON e.id_evento = r.id_evento
      LEFT JOIN (
        SELECT id_evento, AVG(cal_estrellas) AS promedio_calificacion
        FROM Calificaciones
        GROUP BY id_evento
      ) c ON e.id_evento = c.id_evento
      ORDER BY e.fecha_hora;
    `);

    const eventos = result.recordset;

    const calcularPopularidad = ev => {
      const asistentes = Number(ev.total_asistentes) || 0;
      const comentarios = Number(ev.total_comentarios) || 0;
      const ranking = Number(ev.promedio_ranking) || 0;
      return asistentes * 0.6 + comentarios * 0.3 + ranking * 2.5;
    };

    eventos.forEach(ev => {
      ev.popularidad = calcularPopularidad(ev);
    });

    const popularidadPromedio = eventos.length
      ? eventos.reduce((sum, ev) => sum + ev.popularidad, 0) / eventos.length
      : 0;

    let html = fs.readFileSync(path.join(__dirname, 'pantallas', 'reporte.html'), 'utf8');

    const filasEventos = eventos.map(ev => `
      <tr>
        <td>${ev.nombre_evento}</td>
        <td>${ev.fecha_hora}</td>
        <td>${ev.lugar}</td>
        <td class="numeric">${ev.total_asistentes}</td>
        <td class="numeric">${ev.total_comentarios}</td>
        <td class="numeric">${ev.promedio_ranking.toFixed(1)}</td>
      </tr>
    `).join('');
    html = html.replace('<!-- Aquí van las filas de eventos -->', filasEventos);

    const filasPopularidad = eventos.map(ev => `
      <tr>
        <td>${ev.nombre_evento}</td>
        <td class="numeric">${ev.popularidad.toFixed(2)}</td>
      </tr>
    `).join('');

    const filaPromedioTotal = `
      <tr>
        <td><strong>Promedio General</strong></td>
        <td class="numeric"><strong>${popularidadPromedio.toFixed(2)}</strong></td>
      </tr>
    `;

    html = html.replace('<!-- Aquí van las filas de popularidad -->', filasPopularidad);
    html = html.replace('<!-- Aquí va el promedio general -->', popularidadPromedio.toFixed(2));

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.addStyleTag({ path: path.join(__dirname, 'pantallas', 'css', 'reporte.css') });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=estadisticas.pdf');
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ message: 'Error al generar PDF', error: error.message });
  }
});

//EVENTOS CATEGORIAS
app.get('/eventos', async (req, res) => {
  const categoria = req.query.categoria;

  if (!categoria) {
    return res.status(400).json({ success: false, message: 'Falta categoría' });
  }

  const categoriasMap = {
    estudiantiles: 1,
    academicos: 2,
    culturales: 3
  };

  const categoriaId = categoriasMap[categoria.toLowerCase()];
  if (!categoriaId) {
    return res.status(400).json({ success: false, message: 'Categoría inválida' });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('id_categoria', sql.Int, categoriaId)
      .query('SELECT * FROM Evento WHERE id_categoria = @id_categoria');

    res.json(result.recordset);
  } catch (error) {
    console.error('Error en /eventos:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

app.listen(3000, () => console.log('Servidor corriendo en http://localhost:3000'));
