const db = require('../../db');

// Obtener todos los usuarios
const obtenerUsuarios = (req, res) => {
  const query = 'SELECT idusuario, nombre, apellido, email, estado FROM usuario';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    res.json(results);
  });
};

// Crear un nuevo usuario
const crearUsuario = (req, res) => {
  const { idusuario, nombre, apellido, email, password_hash, estado } = req.body;
  const query = 'INSERT INTO usuario (idusuario, nombre, apellido, email, password_hash, estado) VALUES (?, ?, ?, ?, ?, ?)';
  
  db.query(query, [idusuario, nombre, apellido, email, password_hash, estado], (err, results) => {
    if (err) {
      console.error('Error al crear usuario:', err);
      return res.status(500).json({ error: 'Error al registrar el usuario (verifique si el email o ID ya existen)' });
    }
    res.status(201).json({ mensaje: 'Usuario creado con éxito', id: idusuario });
  });
};

const listarUsuariosRegistrados = (req, res) => {
  const sql = `
    SELECT idusuario, nombre, apellido, email
    FROM usuario
    WHERE estado = 'Alta' AND idusuario <> ?
    ORDER BY nombre ASC, apellido ASC
  `;

  db.query(sql, [req.usuarioId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

module.exports = {
  obtenerUsuarios,
  crearUsuario,
  listarUsuariosRegistrados,
};