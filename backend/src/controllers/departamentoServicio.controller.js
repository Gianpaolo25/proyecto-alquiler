const db = require('../../db');

// Listar todas las asociaciones departamento-servicio
const obtenerDepartamentoServicios = (req, res) => {
  const query = `
    SELECT 
      ds.*, 
      d.identificador AS departamento_identificador, 
      d.piso, 
      d.numero,
      e.nombre AS edificio_nombre,
      s.nombre AS servicio_nombre, 
      s.tipo_de_servicio
    FROM departamento_servicio ds
    JOIN departamento d ON ds.departamento_id = d.iddepartamento
    JOIN edificio e ON d.edificio_id = e.idedificio
    JOIN servicio s ON ds.servicio_id = s.idservicio;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Buscar asociación por ID
const obtenerDepartamentoServicioPorId = (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM departamento_servicio WHERE iddepartamento_servicio = ?';
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Asociación departamento-servicio no encontrada' });
    res.json(results[0]);
  });
};

// Vincular un servicio a un departamento (Crear)
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

// Actualizar datos del servicio en el departamento
const actualizarDepartamentoServicio = (req, res) => {
  const { id } = req.params;
  const { proveedor, identificador_cuenta, fecha_fin } = req.body;
  const query = `
    UPDATE departamento_servicio 
    SET proveedor = ?, identificador_cuenta = ?, fecha_fin = ? 
    WHERE iddepartamento_servicio = ?
  `;

  db.query(query, [proveedor, identificador_cuenta, fecha_fin, id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Asociación departamento-servicio no encontrada' });
    res.json({ mensaje: 'Información del servicio actualizada con éxito' });
  });
};

// Desvincular/Eliminar servicio de un departamento
const eliminarDepartamentoServicio = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM departamento_servicio WHERE iddepartamento_servicio = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'No se puede eliminar porque tiene boletas de servicio asociadas.' });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Asociación departamento-servicio no encontrada' });
    res.json({ mensaje: 'Servicio desvinculado del departamento con éxito' });
  });
};

module.exports = {
  obtenerDepartamentoServicios,
  obtenerDepartamentoServicioPorId,
  crearDepartamentoServicio,
  actualizarDepartamentoServicio,
  eliminarDepartamentoServicio
};