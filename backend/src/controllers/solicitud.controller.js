const db = require('../../db');

// Listar todas las solicitudes con detalles del solicitante y departamento
const obtenerSolicitudes = (req, res) => {
  const query = `
    SELECT 
      sa.*, 
      u.nombre AS solicitante_nombre, 
      u.apellido AS solicitante_apellido,
      u.email AS solicitante_email,
      d.identificador AS departamento_identificador,
      e.nombre AS edificio_nombre
    FROM solicitud_alquiler sa
    JOIN usuario u ON sa.solicitante_id = u.idusuario
    JOIN titularidad_departamento td ON sa.titularidad_departamento_id = td.idtitularidad
    JOIN departamento d ON td.departamento_id = d.iddepartamento
    JOIN edificio e ON d.edificio_id = e.idedificio;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Buscar solicitud por ID
const obtenerSolicitudPorId = (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM solicitud_alquiler WHERE idsolicitud_alquiler = ?';
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json(results[0]);
  });
};

// Crear solicitud de alquiler
const crearSolicitud = (req, res) => {
  const { titularidad_departamento_id, solicitante_id, codigo_vinculacion_id, estado, fecha_solicitud, respondido_por_id, mensaje } = req.body;
  const query = `
    INSERT INTO solicitud_alquiler 
    (titularidad_departamento_id, solicitante_id, codigo_vinculacion_id, estado, fecha_solicitud, respondido_por_id, mensaje) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(query, [titularidad_departamento_id, solicitante_id, codigo_vinculacion_id, estado, fecha_solicitud, respondido_por_id, mensaje], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Solicitud creada con éxito', id: results.insertId });
  });
};

// Actualizar estado de la solicitud (Aceptar / Rechazar)
const actualizarSolicitud = (req, res) => {
  const { id } = req.params;
  const { estado, fecha_respuesta, respondido_por_id, observacion_respuesta } = req.body;
  const query = `
    UPDATE solicitud_alquiler 
    SET estado = ?, fecha_respuesta = ?, respondido_por_id = ?, observacion_respuesta = ? 
    WHERE idsolicitud_alquiler = ?
  `;

  db.query(query, [estado, fecha_respuesta, respondido_por_id, observacion_respuesta, id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json({ mensaje: 'Solicitud actualizada con éxito' });
  });
};

// Borrar solicitud
const eliminarSolicitud = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM solicitud_alquiler WHERE idsolicitud_alquiler = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'No se puede eliminar la solicitud porque tiene un contrato de alquiler asociado.' });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json({ mensaje: 'Solicitud eliminada con éxito' });
  });
};

module.exports = {
  obtenerSolicitudes,
  obtenerSolicitudPorId,
  crearSolicitud,
  actualizarSolicitud,
  eliminarSolicitud
};