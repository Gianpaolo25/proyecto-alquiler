const db = require('../../db');

// Listar departamentos junto con el nombre de su edificio (usando JOIN)
const obtenerDepartamentos = (req, res) => {
  const query = `
    SELECT d.iddepartamento, d.identificador, d.piso, d.numero, 
           e.idedificio, e.nombre AS edificio_nombre, e.direccion AS edificio_direccion
    FROM departamento d
    JOIN edificio e ON d.edificio_id = e.idedificio;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Buscar departamento por ID
const obtenerDepartamentoPorId = (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT d.*, e.nombre AS edificio_nombre 
    FROM departamento d 
    JOIN edificio e ON d.edificio_id = e.idedificio 
    WHERE d.iddepartamento = ?
  `;
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Departamento no encontrado' });
    res.json(results[0]);
  });
};

// Crear departamento
const crearDepartamento = (req, res) => {
  const { edificio_id, identificador, piso, numero } = req.body;
  const query = 'INSERT INTO departamento (edificio_id, identificador, piso, numero) VALUES (?, ?, ?, ?)';
  
  db.query(query, [edificio_id, identificador, piso, numero], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Departamento creado con éxito', id: results.insertId });
  });
};

// Actualizar departamento
const actualizarDepartamento = (req, res) => {
  const { id } = req.params;
  const { edificio_id, identificador, piso, numero } = req.body;
  const query = 'UPDATE departamento SET edificio_id = ?, identificador = ?, piso = ?, numero = ? WHERE ididdepartamento = ?';

  db.query(query, [edificio_id, identificador, piso, numero, id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Departamento no encontrado' });
    res.json({ mensaje: 'Departamento actualizado con éxito' });
  });
};

// Borrar departamento
const eliminarDepartamento = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM departamento WHERE iddepartamento = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'No se puede eliminar el departamento porque tiene registros asociados (titularidad, servicios, etc.).' });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Departamento no encontrado' });
    res.json({ mensaje: 'Departamento eliminado con éxito' });
  });
};

module.exports = {
  obtenerDepartamentos,
  obtenerDepartamentoPorId,
  crearDepartamento,
  actualizarDepartamento,
  eliminarDepartamento
};