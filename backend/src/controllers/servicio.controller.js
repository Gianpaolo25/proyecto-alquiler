const db = require('../../db');

// 1. Listar el catálogo de servicios (Luz, Gas, etc.)
const obtenerServicios = (req, res) => {
  db.query('SELECT * FROM servicio', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Crear servicio en el catálogo
const crearServicio = (req, res) => {
  const { idservicio, nombre, tipo_de_servicio } = req.body;
  db.query('INSERT INTO servicio (idservicio, nombre, tipo_de_servicio) VALUES (?, ?, ?)', [idservicio, nombre, tipo_de_servicio], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Servicio creado con éxito' });
  });
};

// 2. Listar servicios asociados a departamentos (departamento_servicio)
const obtenerDepartamentoServicios = (req, res) => {
  const query = `
    SELECT 
      ds.*, 
      s.nombre AS servicio_nombre,
      s.tipo_de_servicio,
      d.identificador AS departamento_identificador
    FROM departamento_servicio ds
    JOIN servicio s ON ds.servicio_id = s.idservicio
    JOIN departamento d ON ds.departamento_id = d.iddepartamento;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Vincular un servicio a un departamento
const crearDepartamentoServicio = (req, res) => {
  const { departamento_id, servicio_id, proveedor, identificador_cuenta, fecha_inicio, fecha_fin } = req.body;
  const query = `
    INSERT INTO departamento_servicio 
    (departamento_id, servicio_id, proveedor, identificador_cuenta, fecha_inicio, fecha_fin) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(query, [departamento_id, servicio_id, proveedor, identificador_cuenta, fecha_inicio, fecha_fin || null], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Servicio vinculado al departamento con éxito', id: results.insertId });
  });
};

module.exports = {
  obtenerServicios,
  crearServicio,
  obtenerDepartamentoServicios,
  crearDepartamentoServicio
};