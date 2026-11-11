const db = require('../../db');

// Listar titularidades con datos del propietario y departamento
const obtenerTitularidades = (req, res) => {
  const query = `
    SELECT 
      t.*, 
      u.nombre AS propietario_nombre, 
      u.apellido AS propietario_apellido,
      d.identificador AS departamento_identificador
    FROM titularidad_departamento t
    JOIN usuario u ON t.propietario_id = u.idusuario
    JOIN departamento d ON t.departamento_id = d.iddepartamento;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Crear titularidad (Asociar propietario a un departamento)
const crearTitularidad = (req, res) => {
  const { departamento_id, propietario_id, fecha_desde, fecha_hasta } = req.body;
  const query = 'INSERT INTO titularidad_departamento (departamento_id, propietario_id, fecha_desde, fecha_hasta) VALUES (?, ?, ?, ?)';
  
  db.query(query, [departamento_id, propietario_id, fecha_desde, fecha_hasta || null], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Titularidad creada con éxito', id: results.insertId });
  });
};

module.exports = {
  obtenerTitularidades,
  crearTitularidad
};