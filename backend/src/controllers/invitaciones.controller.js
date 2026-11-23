const crypto = require('crypto');
const db = require('../../db');

// Propietario envía invitación de alquiler a un usuario registrado por email
const enviarInvitacion = (req, res) => {
  const propietarioUsuarioId = req.usuarioId;
  const { departamento_id, email_invitado, mensaje } = req.body;

  if (!departamento_id || !email_invitado) {
    return res.status(400).json({ error: 'departamento_id y email_invitado son obligatorios' });
  }

  // 1. Verificar que el usuario logueado sea propietario vigente del departamento
  const sqlTitularidad = `
    SELECT idtitularidad
    FROM titularidad_departamento
    WHERE departamento_id = ?
      AND propietario_id = ?
      AND (fecha_hasta IS NULL OR fecha_hasta >= CURDATE())
    LIMIT 1
  `;

  db.query(sqlTitularidad, [departamento_id, propietarioUsuarioId], (errTit, titResults) => {
    if (errTit) return res.status(500).json({ error: errTit.message });
    if (titResults.length === 0) {
      return res.status(403).json({ error: 'No eres propietario vigente de este departamento' });
    }

    const titularidadId = titResults[0].idtitularidad;

    // 2. Buscar al usuario invitado por email
    db.query(
      "SELECT idusuario, nombre, apellido, email FROM usuario WHERE email = ? AND estado = 'Alta'",
      [email_invitado.trim()],
      (errUser, userResults) => {
        if (errUser) return res.status(500).json({ error: errUser.message });
        if (userResults.length === 0) {
          return res.status(404).json({ error: 'No existe un usuario activo con ese email' });
        }

        const invitado = userResults[0];
        if (invitado.idusuario === propietarioUsuarioId) {
          return res.status(400).json({ error: 'No puedes invitarte a ti mismo' });
        }

        const tokenPlano = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex');

        // 3. Crear registro en codigo_vinculacion con AUTO_INCREMENT
        const sqlCodigo = `
          INSERT INTO codigo_vinculacion
            (titularidad_departamento_id, token_hash, fecha_creacion, fecha_expiracion, usos_maximos, usos_realizados, creado_por_id)
          VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 1, 1, ?)
        `;

        db.query(sqlCodigo, [titularidadId, tokenHash, propietarioUsuarioId], (errCod, codResult) => {
          if (errCod) return res.status(500).json({ error: errCod.message });

          const codigoVinculacionId = codResult.insertId;

          // 4. Crear solicitud_alquiler en estado 'Pendiente'
          const sqlSolicitud = `
            INSERT INTO solicitud_alquiler
              (titularidad_departamento_id, solicitante_id, codigo_vinculacion_id, estado, fecha_solicitud, mensaje)
            VALUES (?, ?, ?, 'Pendiente', NOW(), ?)
          `;

          db.query(
            sqlSolicitud,
            [titularidadId, invitado.idusuario, codigoVinculacionId, mensaje || null],
            (errSol, solResult) => {
              if (errSol) return res.status(500).json({ error: errSol.message });

              res.status(201).json({
                mensaje: `Invitación enviada a ${invitado.email}`,
                idsolicitud_alquiler: solResult.insertId,
              });
            }
          );
        });
      }
    );
  });
};

// Usuario invitado consulta sus invitaciones recibidas
const obtenerInvitacionesRecibidas = (req, res) => {
  const usuarioId = req.usuarioId;

  const sql = `
    SELECT
      sa.idsolicitud_alquiler,
      sa.estado,
      sa.fecha_solicitud,
      sa.mensaje,
      d.iddepartamento,
      d.identificador,
      d.piso,
      d.numero,
      e.nombre AS edificio_nombre,
      e.direccion AS edificio_direccion,
      u_prop.nombre AS propietario_nombre,
      u_prop.apellido AS propietario_apellido,
      u_prop.email AS propietario_email
    FROM solicitud_alquiler sa
    JOIN titularidad_departamento td ON sa.titularidad_departamento_id = td.idtitularidad
    JOIN departamento d ON td.departamento_id = d.iddepartamento
    JOIN edificio e ON d.edificio_id = e.idedificio
    JOIN usuario u_prop ON td.propietario_id = u_prop.idusuario
    WHERE sa.solicitante_id = ?
    ORDER BY sa.fecha_solicitud DESC
  `;

  db.query(sql, [usuarioId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Usuario invitado acepta la invitación y queda establecido como inquilino (crea registro en `alquiler`)
const aceptarInvitacion = (req, res) => {
  const usuarioId = req.usuarioId;
  const { id } = req.params;
  const { fecha_inicio, fecha_fin } = req.body;

  const sqlBuscar = `
    SELECT idsolicitud_alquiler, estado
    FROM solicitud_alquiler
    WHERE idsolicitud_alquiler = ? AND solicitante_id = ?
  `;

  db.query(sqlBuscar, [id, usuarioId], (errBus, rows) => {
    if (errBus) return res.status(500).json({ error: errBus.message });
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invitación no encontrada' });
    }
    if (rows[0].estado !== 'Pendiente') {
      return res.status(400).json({ error: `La invitación ya fue procesada (${rows[0].estado})` });
    }

    const fechaInicioFinal = fecha_inicio || new Date().toISOString().slice(0, 10);
    const fechaFinFinal = fecha_fin || null;

    db.beginTransaction((errTx) => {
      if (errTx) return res.status(500).json({ error: errTx.message });

      const sqlUpdateSol = `
        UPDATE solicitud_alquiler
        SET estado = 'Aceptada', fecha_respuesta = NOW(), respondido_por_id = ?
        WHERE idsolicitud_alquiler = ?
      `;

      db.query(sqlUpdateSol, [usuarioId, id], (errUpd) => {
        if (errUpd) {
          return db.rollback(() => res.status(500).json({ error: errUpd.message }));
        }

        const sqlInsertAlquiler = `
          INSERT INTO alquiler (solicitud_alquiler_id, fecha_inicio, fecha_fin)
          VALUES (?, ?, ?)
        `;

        db.query(sqlInsertAlquiler, [id, fechaInicioFinal, fechaFinFinal], (errAlq, alqResult) => {
          if (errAlq) {
            return db.rollback(() => res.status(500).json({ error: errAlq.message }));
          }

          db.commit((errCom) => {
            if (errCom) {
              return db.rollback(() => res.status(500).json({ error: errCom.message }));
            }

            res.status(201).json({
              mensaje: 'Invitación aceptada. Ahora figuras como inquilino del departamento.',
              idalquiler: alqResult.insertId,
            });
          });
        });
      });
    });
  });
};


const rechazarInvitacion = (req, res) => {
  const usuarioId = req.usuarioId;
  const { id } = req.params;
  const { observacion } = req.body || {};

  const sqlBuscar = `
    SELECT idsolicitud_alquiler, estado
    FROM solicitud_alquiler
    WHERE idsolicitud_alquiler = ? AND solicitante_id = ?
  `;

  db.query(sqlBuscar, [id, usuarioId], (errBus, rows) => {
    if (errBus) return res.status(500).json({ error: errBus.message });
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud/invitación no encontrada' });
    }
    if (rows[0].estado !== 'Pendiente') {
      return res.status(400).json({ error: `La solicitud ya fue procesada (${rows[0].estado})` });
    }

    const sqlUpdate = `
      UPDATE solicitud_alquiler
      SET estado = 'Rechazada', fecha_respuesta = NOW(), respondido_por_id = ?, observacion_respuesta = ?
      WHERE idsolicitud_alquiler = ?
    `;

    db.query(sqlUpdate, [usuarioId, observacion || null, id], (errUpd) => {
      if (errUpd) return res.status(500).json({ error: errUpd.message });
      res.json({ mensaje: 'Solicitud de alquiler rechazada.' });
    });
  });
};


module.exports = {
  enviarInvitacion,
  obtenerInvitacionesRecibidas,
  aceptarInvitacion,
  rechazarInvitacion,
};