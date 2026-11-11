const db = require('../../db');

// Listar todos los comprobantes con detalles de quién los subió
const obtenerComprobantes = (req, res) => {
  const query = `
    SELECT 
      cp.*, 
      u1.nombre AS usuario_carga_nombre,
      u1.apellido AS usuario_carga_apellido,
      u2.nombre AS revisado_por_nombre
    FROM comprobante_pago cp
    JOIN usuario u1 ON cp.usuario_carga_id = u1.idusuario
    LEFT JOIN usuario u2 ON cp.revisado_por_id = u2.idusuario;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Buscar comprobante por ID
const obtenerComprobantePorId = (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM comprobante_pago WHERE idcomprobante_pago = ?';
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Comprobante no encontrado' });
    res.json(results[0]);
  });
};

// Crear/Subir un comprobante de pago
const crearComprobante = (req, res) => {
  const { 
    boleta_servicio_id, cuota_alquiler_id, usuario_carga_id, 
    fecha_pago_declarada, importe_declarado, archivo_path, 
    estado_revision, fecha_carga, observacion 
  } = req.body;

  const query = `
    INSERT INTO comprobante_pago 
    (boleta_servicio_id, cuota_alquiler_id, usuario_carga_id, fecha_pago_declarada, importe_declarado, archivo_path, estado_revision, fecha_carga, observacion) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(query, [
    boleta_servicio_id || null, cuota_alquiler_id || null, usuario_carga_id, 
    fecha_pago_declarada, importe_declarado, archivo_path, 
    estado_revision || 'pendiente', fecha_carga, observacion
  ], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Comprobante subido con éxito', id: results.insertId });
  });
};

// Actualizar estado de revisión (Aprobar o Rechazar por parte del admin/propietario)
const actualizarComprobante = (req, res) => {
  const { id } = req.params;
  const { estado_revision, revisado_por_id, fecha_revision, observacion } = req.body;
  const query = `
    UPDATE comprobante_pago 
    SET estado_revision = ?, revisado_por_id = ?, fecha_revision = ?, observacion = ? 
    WHERE idcomprobante_pago = ?
  `;

  db.query(query, [estado_revision, revisado_por_id, fecha_revision, observacion, id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Comprobante no encontrado' });
    res.json({ mensaje: 'Estado del comprobante actualizado con éxito' });
  });
};

// Borrar comprobante
const eliminarComprobante = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM comprobante_pago WHERE idcomprobante_pago = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Comprobante no encontrado' });
    res.json({ mensaje: 'Comprobante eliminado con éxito' });
  });
};

module.exports = {
  obtenerComprobantes,
  obtenerComprobantePorId,
  crearComprobante,
  actualizarComprobante,
  eliminarComprobante
};