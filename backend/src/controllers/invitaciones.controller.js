const crypto = require('crypto');
const db = require('../../db');

// Helper para generar fechas mensuales entre fechaInicio y fechaFin
function generarPeriodosMensuales(fechaInicioStr, fechaFinStr) {
  const periodos = [];
  const inicio = new Date(`${fechaInicioStr}T00:00:00`);
  if (Number.isNaN(inicio.getTime())) {
    const hoy = new Date();
    hoy.setDate(1);
    periodos.push(hoy.toISOString().slice(0, 10));
    return periodos;
  }

  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  let limite;

  if (fechaFinStr) {
    const fin = new Date(`${fechaFinStr}T00:00:00`);
    limite = Number.isNaN(fin.getTime())
      ? new Date(inicio.getFullYear() + 1, inicio.getMonth(), 1)
      : new Date(fin.getFullYear(), fin.getMonth(), 1);
  } else {
    // Si no se indica fecha_fin, generamos 12 cuotas mensuales por defecto
    limite = new Date(inicio.getFullYear() + 1, inicio.getMonth(), 1);
  }

  let seguridad = 0;
  while (cursor <= limite && seguridad < 120) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    periodos.push(`${y}-${m}-01`);
    cursor.setMonth(cursor.getMonth() + 1);
    seguridad += 1;
  }

  if (periodos.length === 0) {
    const y = inicio.getFullYear();
    const m = String(inicio.getMonth() + 1).padStart(2, '0');
    periodos.push(`${y}-${m}-01`);
  }

  return periodos;
}

// Propietario envía invitación de alquiler con fechas y valor de cuota
const enviarInvitacion = (req, res) => {
  const propietarioUsuarioId = req.usuarioId;
  const {
    departamento_id,
    email_invitado,
    fecha_inicio,
    fecha_fin,
    importe_mensual,
    moneda,
    mensaje,
  } = req.body;

  if (!departamento_id || !email_invitado) {
    return res.status(400).json({ error: 'departamento_id y email_invitado son obligatorios' });
  }

  const importeNum = Number(importe_mensual);
  if (!importe_mensual || Number.isNaN(importeNum) || importeNum <= 0) {
    return res.status(400).json({ error: 'Debes indicar un valor de cuota de alquiler mayor a 0' });
  }

  const fechaInicioFinal = fecha_inicio || new Date().toISOString().slice(0, 10);
  const fechaFinFinal = fecha_fin || null;
  const monedaFinal = (moneda || 'ARS').trim().toUpperCase().slice(0, 3);

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

        const sqlCodigo = `
          INSERT INTO codigo_vinculacion
            (titularidad_departamento_id, token_hash, fecha_creacion, fecha_expiracion, usos_maximos, usos_realizados, creado_por_id)
          VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 1, 1, ?)
        `;

        db.query(sqlCodigo, [titularidadId, tokenHash, propietarioUsuarioId], (errCod, codResult) => {
          if (errCod) return res.status(500).json({ error: errCod.message });

          const codigoVinculacionId = codResult.insertId;
          const detalleContrato = JSON.stringify({
            fecha_inicio: fechaInicioFinal,
            fecha_fin: fechaFinFinal,
            importe_mensual: importeNum,
            moneda: monedaFinal,
            nota: mensaje || '',
          });

          const sqlSolicitud = `
            INSERT INTO solicitud_alquiler
              (titularidad_departamento_id, solicitante_id, codigo_vinculacion_id, estado, fecha_solicitud, mensaje)
            VALUES (?, ?, ?, 'Pendiente', NOW(), ?)
          `;

          db.query(
            sqlSolicitud,
            [titularidadId, invitado.idusuario, codigoVinculacionId, detalleContrato],
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

    const enriquecidos = results.map((row) => {
      let contrato = null;
      if (row.mensaje) {
        try {
          contrato = JSON.parse(row.mensaje);
        } catch {
          contrato = { nota: row.mensaje };
        }
      }
      return { ...row, contrato };
    });

    res.json(enriquecidos);
  });
};

// Aceptar invitación: crea alquiler y genera cuotas mensuales en estado 'Pendiente'
const aceptarInvitacion = (req, res) => {
  const usuarioId = req.usuarioId;
  const { id } = req.params;

  const sqlBuscar = `
    SELECT idsolicitud_alquiler, estado, mensaje
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

    let contrato = {};
    if (rows[0].mensaje) {
      try {
        contrato = JSON.parse(rows[0].mensaje);
      } catch {
        contrato = {};
      }
    }

    const fechaInicioFinal =
      req.body?.fecha_inicio || contrato.fecha_inicio || new Date().toISOString().slice(0, 10);
    const fechaFinFinal = req.body?.fecha_fin ?? contrato.fecha_fin ?? null;
    const importeMensual = Number(req.body?.importe_mensual ?? contrato.importe_mensual ?? 0);
    const monedaFinal = (req.body?.moneda || contrato.moneda || 'ARS')
      .trim()
      .toUpperCase()
      .slice(0, 3);

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

          const alquilerId = alqResult.insertId;
          const periodos = generarPeriodosMensuales(fechaInicioFinal, fechaFinFinal);

          const insertarCuotasRecursivo = (idx) => {
            if (idx >= periodos.length) {
              return db.commit((errCom) => {
                if (errCom) {
                  return db.rollback(() => res.status(500).json({ error: errCom.message }));
                }
                res.status(201).json({
                  mensaje: `Invitación aceptada. Se generaron ${periodos.length} cuotas mensuales pendientes.`,
                  idalquiler: alquilerId,
                  cuotasGeneradas: periodos.length,
                });
              });
            }

            const periodo = periodos[idx];
            const [y, m] = periodo.split('-').map(Number);
            const vencimiento = new Date(y, m - 1, 10).toISOString().slice(0, 10);

            const sqlCuota = `
              INSERT INTO cuota_alquiler
                (alquiler_id, periodo, fecha_vencimiento, importe, moneda, estado, fecha_generacion)
              VALUES (?, ?, ?, ?, ?, 'Pendiente', NOW())
            `;

            db.query(
              sqlCuota,
              [alquilerId, periodo, vencimiento, importeMensual, monedaFinal],
              (errCuo) => {
                if (errCuo) {
                  return db.rollback(() => res.status(500).json({ error: errCuo.message }));
                }
                insertarCuotasRecursivo(idx + 1);
              }
            );
          };

          insertarCuotasRecursivo(0);
        });
      });
    });
  });
};

// Rechazar invitación
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
      return res.status(404).json({ error: 'Invitación no encontrada' });
    }
    if (rows[0].estado !== 'Pendiente') {
      return res.status(400).json({ error: `La invitación ya fue procesada (${rows[0].estado})` });
    }

    const sqlUpdate = `
      UPDATE solicitud_alquiler
      SET estado = 'Rechazada',
          fecha_respuesta = NOW(),
          respondido_por_id = ?,
          observacion_respuesta = ?
      WHERE idsolicitud_alquiler = ?
    `;

    db.query(sqlUpdate, [usuarioId, observacion || null, id], (errUpd) => {
      if (errUpd) return res.status(500).json({ error: errUpd.message });
      res.json({ mensaje: 'Invitación de alquiler rechazada.' });
    });
  });
};

module.exports = {
  enviarInvitacion,
  obtenerInvitacionesRecibidas,
  aceptarInvitacion,
  rechazarInvitacion,
};