const db = require('../../db');

// Listar todos los edificios
const obtenerEdificios = (req, res) => {
  db.query('SELECT * FROM edificio ORDER BY idedificio DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Obtener un edificio por ID
const obtenerEdificioPorId = (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM edificio WHERE idedificio = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Edificio no encontrado' });
    res.json(results[0]);
  });
};

// Crear un edificio (usa AUTO_INCREMENT en idedificio)
const crearEdificio = (req, res) => {
  const { nombre, direccion } = req.body;

  if (!nombre || !direccion) {
    return res.status(400).json({ error: 'nombre y direccion son obligatorios' });
  }

  const sql = 'INSERT INTO edificio (nombre, direccion) VALUES (?, ?)';
  db.query(sql, [nombre.trim(), direccion.trim()], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    res.status(201).json({
      mensaje: 'Edificio creado con éxito',
      idedificio: result.insertId,
      nombre: nombre.trim(),
      direccion: direccion.trim(),
    });
  });
};

// Actualizar un edificio por ID
const actualizarEdificio = (req, res) => {
  const { id } = req.params;
  const { nombre, direccion } = req.body;

  if (!nombre || !direccion) {
    return res.status(400).json({ error: 'nombre y direccion son obligatorios' });
  }

  const sql = 'UPDATE edificio SET nombre = ?, direccion = ? WHERE idedificio = ?';
  db.query(sql, [nombre.trim(), direccion.trim(), id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Edificio no encontrado' });
    }
    res.json({ mensaje: 'Edificio actualizado con éxito' });
  });
};

// Eliminar un edificio por ID
const eliminarEdificio = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM edificio WHERE idedificio = ?', [id], (err, result) => {
    if (err) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({
          error: 'No se puede eliminar el edificio porque tiene departamentos asociados.',
        });
      }
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Edificio no encontrado' });
    }
    res.json({ mensaje: 'Edificio eliminado con éxito' });
  });
};

module.exports = {
  obtenerEdificios,
  obtenerEdificioPorId,
  crearEdificio,
  actualizarEdificio,
  eliminarEdificio,
};