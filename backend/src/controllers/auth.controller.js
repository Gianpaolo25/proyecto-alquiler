
const db = require('../../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { enviarCorreoVerificacion, enviarCorreoRecuperacion } = require('../config/mailer');

// 1. REGISTRO DE USUARIO (Con envío de correo)
const register = async (req, res) => {
  const { nombre, apellido, email, password } = req.body;

  if (!nombre || !apellido || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    db.query('SELECT idusuario FROM usuario WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length > 0) {
        return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
      }

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Creamos al usuario con estado 'Baja' (inactivo) hasta que verifique su correo
      const insertQuery = 'INSERT INTO usuario (nombre, apellido, email, password_hash, estado) VALUES (?, ?, ?, ?, ?)';
      db.query(insertQuery, [nombre, apellido, email, password_hash, 'Baja'], async (err, insertResult) => {
        if (err) return res.status(500).json({ error: err.message });

        const nuevoUsuarioId = insertResult.insertId;

        const verificationToken = jwt.sign(
          { id: nuevoUsuarioId, email },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        try {
          // Enviar correo real con Nodemailer
          await enviarCorreoVerificacion(email, verificationToken);
          res.status(201).json({
            mensaje: 'Usuario registrado exitosamente. Revisa tu correo para verificar tu cuenta.',
            idusuario: nuevoUsuarioId
          });
        } catch (mailError) {
          console.error('Error al enviar correo:', mailError);
          res.status(500).json({ error: 'Usuario registrado, pero falló el envío del correo de verificación.' });
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno al registrar' });
  }
};

// 2. VERIFICAR EMAIL
const verificarEmail = (req, res) => {
  const { token } = req.body;

  if (!token) return res.status(400).json({ error: 'Token de verificación faltante' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(400).json({ error: 'Token inválido o expirado' });

    const userId = decoded.id;

    // Cambiar estado del usuario a 'Alta'
    db.query("UPDATE usuario SET estado = 'Alta' WHERE idusuario = ?", [userId], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ mensaje: '¡Correo verificado con éxito! Ya puedes iniciar sesión.' });
    });
  });
};

// 3. SOLICITAR RECUPERACIÓN DE CONTRASEÑA
const forgotPassword = (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: 'Debe ingresar un correo electrónico' });

  db.query('SELECT * FROM usuario WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      // Por seguridad, respondemos genérico aunque no exista el mail
      return res.json({ mensaje: 'Si el correo está registrado, se ha enviado un enlace de recuperación.' });
    }

    const usuario = results[0];

    const resetToken = jwt.sign(
      { id: usuario.idusuario, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    try {
      await enviarCorreoRecuperacion(email, resetToken);
      res.json({ mensaje: 'Si el correo está registrado, se ha enviado un enlace de recuperación.' });
    } catch (mailError) {
      console.error('Error al enviar correo de recuperación:', mailError);
      res.status(500).json({ error: 'Error al enviar el correo de recuperación' });
    }
  });
};

// 4. RESTABLECER CONTRASEÑA
const resetPassword = async (req, res) => {
  const { token, nuevaPassword } = req.body;

  if (!token || !nuevaPassword) {
    return res.status(400).json({ error: 'Token y nueva contraseña son obligatorios' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(400).json({ error: 'Token inválido o expirado' });

    const userId = decoded.id;

    try {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(nuevaPassword, salt);

      db.query('UPDATE usuario SET password_hash = ? WHERE idusuario = ?', [password_hash, userId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.' });
      });
    } catch (error) {
      res.status(500).json({ error: 'Error al procesar la nueva contraseña' });
    }
  });
};

// 5. LOGIN DE USUARIO (El que ya teníamos)
const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Debe ingresar email y contraseña' });
  }

  const query = 'SELECT * FROM usuario WHERE email = ?';
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = results[0];

    if (usuario.estado !== 'Alta') {
      return res.status(403).json({ error: 'Su cuenta no ha sido verificada. Revise su correo electrónico.' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const rolesQuery = `
      SELECT r.idrol, r.nombre 
      FROM usuario_rol ur 
      JOIN rol r ON ur.rol_idrol = r.idrol 
      WHERE ur.usuario_idusuario = ?
    `;

    db.query(rolesQuery, [usuario.idusuario], (errRoles, rolesResults) => {
      if (errRoles) return res.status(500).json({ error: errRoles.message });

      const token = jwt.sign(
        { 
          idusuario: usuario.idusuario, 
          email: usuario.email,
          roles: rolesResults.map(r => r.nombre)
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({
        mensaje: 'Inicio de sesión exitoso',
        token,
        usuario: {
          idusuario: usuario.idusuario,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          roles: rolesResults
        }
      });
    });
  });
};

module.exports = {
  register,
  verificarEmail,
  forgotPassword,
  resetPassword,
  login
};