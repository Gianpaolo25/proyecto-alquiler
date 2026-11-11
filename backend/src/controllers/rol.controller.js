const db = require('../../db');

// Listar todos los roles del sistema
const obtenerRoles = (req, res) => {
  db.query('SELECT * FROM rol', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Crear un rol
const crearRol = (req, res) => {
  const { nombre, descripcion } = req.body;
  db.query('INSERT INTO rol (nombre, descripcion) VALUES (?, ?)', [nombre, descripcion], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Rol creado con éxito', id: results.insertId });
  });
};

// Asignar rol a un usuario (Tabla intermedia usuario_rol)
const asignarRolUsuario = (req, res) => {
  const { usuario_idusuario, rol_idrol, fecha_asignacion } = req.body;
  const query = 'INSERT INTO usuario_rol (usuario_idusuario, rol_idrol, fecha_asignacion) VALUES (?, ?, ?)';
  
  db.query(query, [usuario_idusuario, rol_idrol, fecha_asignacion], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Rol asignado al usuario con éxito' });
  });
};

// Obtener los roles de un usuario específico
const obtenerRolesDeUsuario = (req, res) => {
  const { idusuario } = req.params;
  const query = `
    SELECT r.idrol, r.nombre, r.descripcion, ur.fecha_asignacion
    FROM usuario_rol ur
    JOIN rol r ON ur.rol_idrol = r.idrol
    WHERE ur.usuario_idusuario = ?
  `;
  db.query(query, [idusuario], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

module.exports = {
  obtenerRoles,
  crearRol,
  asignarRolUsuario,
  obtenerRolesDeUsuario
};