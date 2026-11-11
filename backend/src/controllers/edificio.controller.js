const db = require('../../db');

// Listar todos los edificios
const obtenerEdificios = (req, res) => {
  db.query('SELECT * FROM edificio', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Buscar edificio por ID
const obtenerEdificioPorId = (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM edificio WHERE idedificio = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Edificio no encontrado' });
    res.json(results[0]);
  });
};

// Crear edificio
const crearEdificio = (req, res) => {
  const { idedificio, nombre, direccion } = req.body;
  const query = 'INSERT INTO edificio (idedificio, nombre, direccion) VALUES (?, ?, ?)';
  
  db.query(query, [idedificio, nombre, direccion], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Edificio creado con éxito', id: idedificio });
  });
};

// Actualizar edificio
const actualizarEdificio = (req, res) => {
  const { id } = req.params;
  const { nombre, direccion } = req.body;
  const query = 'UPDATE edificio SET nombre = ?, direccion = ? WHERE idedificio = ?';

  db.query(query, [nombre, direccion, id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Edificio no encontrado' });
    res.json({ mensaje: 'Edificio actualizado con éxito' });
  });
};

// Borrar edificio
const eliminarEdificio = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM edificio WHERE idedificio = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'No se puede eliminar el edificio porque tiene departamentos asociados.' });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Edificio no encontrado' });
    res.json({ mensaje: 'Edificio eliminado con éxito' });
  });
};

module.exports = {
  obtenerEdificios,
  obtenerEdificioPorId,
  crearEdificio,
  actualizarEdificio,
  eliminarEdificio
};