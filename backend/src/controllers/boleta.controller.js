const db = require('../../db');

// Listar todas las boletas con detalles del servicio asociado
const obtenerBoletas = (req, res) => {
  const query = `
    SELECT 
      bs.*, 
      s.nombre AS servicio_nombre, 
      s.tipo_de_servicio,
      ds.proveedor,
      ds.identificador_cuenta
    FROM boleta_servicio bs
    JOIN departamento_servicio ds ON bs.departamento_servicio_id = ds.iddepartamento_servicio
    JOIN servicio s ON ds.servicio_id = s.idservicio;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Buscar boleta por ID
const obtenerBoletaPorId = (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM boleta_servicio WHERE idboleta_servicio = ?';
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Boleta no encontrada' });
    res.json(results[0]);
  });
};

// Crear boleta de servicio
const crearBoleta = (req, res) => {
  const { departamento_servicio_id, alquiler_id, numero_boleta, periodo_desde, periodo_hasta, fecha_emision, fecha_vencimiento, importe, moneda, archivo_boleta, estado } = req.body;
  const query = `
    INSERT INTO boleta_servicio 
    (departamento_servicio_id, alquiler_id, numero_boleta, periodo_desde, periodo_hasta, fecha_emision, fecha_vencimiento, importe, moneda, archivo_boleta, estado) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(query, [departamento_servicio_id, alquiler_id, numero_boleta, periodo_desde, periodo_hasta, fecha_emision, fecha_vencimiento, importe, moneda, archivo_boleta, estado], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Boleta creada con éxito', id: results.insertId });
  });
};

// Actualizar boleta (por ejemplo, cambiar estado a 'Pagada')
const actualizarBoleta = (req, res) => {
  const { id } = req.params;
  const { numero_boleta, fecha_vencimiento, importe, estado } = req.body;
  const query = `
    UPDATE boleta_servicio 
    SET numero_boleta = ?, fecha_vencimiento = ?, importe = ?, estado = ? 
    WHERE idboleta_servicio = ?
  `;

  db.query(query, [numero_boleta, fecha_vencimiento, importe, estado, id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Boleta no encontrada' });
    res.json({ mensaje: 'Boleta actualizada con éxito' });
  });
};

// Borrar boleta
const eliminarBoleta = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM boleta_servicio WHERE idboleta_servicio = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Boleta no encontrada' });
    res.json({ mensaje: 'Boleta eliminada con éxito' });
  });
};

module.exports = {
  obtenerBoletas,
  obtenerBoletaPorId,
  crearBoleta,
  actualizarBoleta,
  eliminarBoleta
};