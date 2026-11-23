const db = require('../../db');

const obtenerMisDepartamentos = (req, res) => {
  const usuarioId = req.usuarioId;

  const sqlPropietario = `
    SELECT
      d.iddepartamento,
      d.identificador,
      d.piso,
      d.numero,
      e.idedificio,
      e.nombre AS edificio_nombre,
      e.direccion AS edificio_direccion,
      td.idtitularidad,
      td.fecha_desde,
      td.fecha_hasta
    FROM titularidad_departamento td
    JOIN departamento d ON td.departamento_id = d.iddepartamento
    JOIN edificio e ON d.edificio_id = e.idedificio
    WHERE td.propietario_id = ?
      AND (td.fecha_hasta IS NULL OR td.fecha_hasta >= CURDATE())
  `;

  const sqlInquilino = `
    SELECT
      d.iddepartamento,
      d.identificador,
      d.piso,
      d.numero,
      e.idedificio,
      e.nombre AS edificio_nombre,
      e.direccion AS edificio_direccion,
      a.idalquiler,
      a.fecha_inicio,
      a.fecha_fin,
      sa.idsolicitud_alquiler
    FROM alquiler a
    JOIN solicitud_alquiler sa ON a.solicitud_alquiler_id = sa.idsolicitud_alquiler
    JOIN titularidad_departamento td ON sa.titularidad_departamento_id = td.idtitularidad
    JOIN departamento d ON td.departamento_id = d.iddepartamento
    JOIN edificio e ON d.edificio_id = e.idedificio
    WHERE sa.solicitante_id = ?
      AND sa.estado = 'Aceptada'
  `;

  db.query(sqlPropietario, [usuarioId], (errProp, propietarios) => {
    if (errProp) return res.status(500).json({ error: errProp.message });

    db.query(sqlInquilino, [usuarioId], (errInq, inquilinos) => {
      if (errInq) return res.status(500).json({ error: errInq.message });

      res.json({
        propietario: propietarios,
        inquilino: inquilinos,
      });
    });
  });
};

const registrarComoPropietario = (req, res) => {
  const usuarioId = req.usuarioId;
  const { departamento_id, fecha_desde, fecha_hasta } = req.body;

  if (!departamento_id || !fecha_desde) {
    return res.status(400).json({ error: 'departamento_id y fecha_desde son obligatorios' });
  }

  const sql = `
    INSERT INTO titularidad_departamento (departamento_id, propietario_id, fecha_desde, fecha_hasta)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [departamento_id, usuarioId, fecha_desde, fecha_hasta || null], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      mensaje: 'Registrado como propietario del departamento con éxito',
      idtitularidad: result.insertId,
    });
  });
};

module.exports = {
  obtenerMisDepartamentos,
  registrarComoPropietario,
};