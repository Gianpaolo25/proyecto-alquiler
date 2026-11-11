const db = require('../../db');

// Listar todas las cuotas con detalles del alquiler asociado
const obtenerCuotas = (req, res) => {
  const query = `
    SELECT 
      c.*, 
      a.fecha_inicio AS alquiler_inicio,
      a.fecha_fin AS alquiler_fin
    FROM cuota_alquiler c
    JOIN alquiler a ON c.alquiler_id = a.idalquiler;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Buscar cuota por ID
const obtenerCuotaPorId = (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM cuota_alquiler WHERE idcuota_alquiler = ?';
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Cuota no encontrada' });
    res.json(results[0]);
  });
};

// Crear una cuota de alquiler mensual
const crearCuota = (req, res) => {
  const { alquiler_id, periodo, fecha_vencimiento, importe, moneda, estado, fecha_generacion } = req.body;
  const query = `
    INSERT INTO cuota_alquiler 
    (alquiler_id, periodo, fecha_vencimiento, importe, moneda, estado, fecha_generacion) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(query, [alquiler_id, periodo, fecha_vencimiento, importe, moneda, estado, fecha_generacion], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Cuota creada con éxito', id: results.insertId });
  });
};

// Actualizar cuota (ej. cambiar estado a 'Pagada')
const actualizarCuota = (req, res) => {
  const { id } = req.params;
  const { fecha_vencimiento, importe, estado } = req.body;
  const query = `
    UPDATE cuota_alquiler 
    SET fecha_vencimiento = ?, importe = ?, estado = ? 
    WHERE idcuota_alquiler = ?
  `;

  db.query(query, [fecha_vencimiento, importe, estado, id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Cuota no encontrada' });
    res.json({ mensaje: 'Cuota actualizada con éxito' });
  });
};

// Borrar cuota
const eliminarCuota = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM cuota_alquiler WHERE idcuota_alquiler = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'No se puede eliminar la cuota porque tiene comprobantes asociados.' });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Cuota no encontrada' });
    res.json({ mensaje: 'Cuota eliminada con éxito' });
  });
};

module.exports = {
  obtenerCuotas,
  obtenerCuotaPorId,
  crearCuota,
  actualizarCuota,
  eliminarCuota
};