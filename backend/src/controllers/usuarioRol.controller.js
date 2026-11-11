const db = require('../../db');

// Listar todas las relaciones usuario-rol
const obtenerUsuariosRoles = (req, res) => {
  const query = `
    SELECT 
      ur.*, 
      u.nombre AS usuario_nombre, 
      u.apellido AS usuario_apellido, 
      u.email AS usuario_email,
      r.nombre AS rol_nombre, 
      r.descripcion AS rol_descripcion
    FROM usuario_rol ur
    JOIN usuario u ON ur.usuario_idusuario = u.idusuario
    JOIN rol r ON ur.rol_idrol = r.idrol;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Asignar un rol a un usuario (Crear relación)
const crearUsuarioRol = (req, res) => {
  const { usuario_idusuario, rol_idrol, fecha_asignacion } = req.body;
  const query = 'INSERT INTO usuario_rol (usuario_idusuario, rol_idrol, fecha_asignacion) VALUES (?, ?, ?)';
  
  db.query(query, [usuario_idusuario, rol_idrol, fecha_asignacion], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Rol asignado al usuario con éxito' });
  });
};

// Eliminar un rol de un usuario (Borrar relación)
const eliminarUsuarioRol = (req, res) => {
  const { usuario_id, rol_id } = req.params;
  const query = 'DELETE FROM usuario_rol WHERE usuario_idusuario = ? AND rol_idrol = ?';
  
  db.query(query, [usuario_id, rol_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Relación usuario-rol no encontrada' });
    res.json({ mensaje: 'Rol revocado/eliminado del usuario con éxito' });
  });
};

module.exports = {
  obtenerUsuariosRoles,
  crearUsuarioRol,
  eliminarUsuarioRol
};