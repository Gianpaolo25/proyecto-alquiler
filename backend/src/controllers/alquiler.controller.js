const db = require('../../db');

// Obtener todos los alquileres con sus detalles completos (Edificio, Departamento e Inquilino)
const obtenerAlquileres = (req, res) => {
  const query = `
    SELECT 
      a.idalquiler, 
      a.fecha_inicio, 
      a.fecha_fin,
      e.nombre AS edificio_nombre,
      e.direccion AS edificio_direccion,
      d.identificador AS departamento_identificador,
      d.piso,
      d.numero,
      u.nombre AS inquilino_nombre,
      u.apellido AS inquilino_apellido,
      u.email AS inquilino_email,
      sa.estado AS estado_solicitud
    FROM alquiler a
    JOIN solicitud_alquiler sa ON a.solicitud_alquiler_id = sa.idsolicitud_alquiler
    JOIN titularidad_departamento td ON sa.titularidad_departamento_id = td.idtitularidad
    JOIN departamento d ON td.departamento_id = d.iddepartamento
    JOIN edificio e ON d.edificio_id = e.idedificio
    JOIN usuario u ON sa.solicitante_id = u.idusuario;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener los alquileres:', err);
      return res.status(500).json({ error: 'Error interno del servidor al consultar alquileres' });
    }
    res.json(results);
  });
};

// Crear un nuevo alquiler (asociado a una solicitud de alquiler existente)
const crearAlquiler = (req, res) => {
  const { solicitud_alquiler_id, fecha_inicio, fecha_fin } = req.body;

  if (!solicitud_alquiler_id || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Faltan datos obligatorios (solicitud_alquiler_id, fecha_inicio, fecha_fin)' });
  }

  const query = 'INSERT INTO alquiler (solicitud_alquiler_id, fecha_inicio, fecha_fin) VALUES (?, ?, ?)';

  db.query(query, [solicitud_alquiler_id, fecha_inicio, fecha_fin], (err, results) => {
    if (err) {
      console.error('Error al crear el alquiler:', err);
      return res.status(500).json({ error: 'Error al registrar el alquiler (verifique que la solicitud exista o no esté duplicada)' });
    }
    res.status(201).json({ 
      mensaje: 'Alquiler registrado con éxito', 
      idalquiler: results.insertId 
    });
  });
};

module.exports = {
  obtenerAlquileres,
  crearAlquiler
};