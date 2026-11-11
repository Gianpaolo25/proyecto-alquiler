const db = require('../../db');

// Listar códigos de vinculación
const obtenerCodigos = (req, res) => {
  db.query('SELECT * FROM codigo_vinculacion', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Crear código de vinculación (para que el inquilino se conecte)
const crearCodigo = (req, res) => {
  const { 
    idcodigo_vinculacion, titularidad_departamento_id, token_hash, 
    fecha_creacion, fecha_expiracion, usos_maximos, usos_realizados, creado_por_id 
  } = req.body;

  const query = `
    INSERT INTO codigo_vinculacion 
    (idcodigo_vinculacion, titularidad_departamento_id, token_hash, fecha_creacion, fecha_expiracion, usos_maximos, usos_realizados, creado_por_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [
    idcodigo_vinculacion, titularidad_departamento_id, token_hash, 
    fecha_creacion, fecha_expiracion, usos_maximos, usos_realizados, creado_por_id
  ], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Código de vinculación generado con éxito' });
  });
};

module.exports = {
  obtenerCodigos,
  crearCodigo
};