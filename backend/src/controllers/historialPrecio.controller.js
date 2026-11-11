const db = require('../../db');

// Listar historial de precios
const obtenerHistorialPrecios = (req, res) => {
  db.query('SELECT * FROM hisotorial_precio_alquiler', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Crear registro en el historial de precios
const crearHistorialPrecio = (req, res) => {
  const { idhisotorial_precio_alquiler, alquiler_id, monto, moneda, vigencia_desde, vigencia_hasta } = req.body;
  const query = `
    INSERT INTO hisotorial_precio_alquiler 
    (idhisotorial_precio_alquiler, alquiler_id, monto, moneda, vigencia_desde, vigencia_hasta) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(query, [idhisotorial_precio_alquiler, alquiler_id, monto, moneda, vigencia_desde, vigencia_hasta], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Historial de precio registrado con éxito' });
  });
};

module.exports = {
  obtenerHistorialPrecios,
  crearHistorialPrecio
};