const db = require('../../db');

// Helper para determinar si el usuario es propietario o inquilino del departamento
function resolverRolYDepartamento(departamentoId, usuarioId, callback) {
  const sqlProp = `
    SELECT
      d.*,
      e.nombre AS edificio_nombre,
      e.direccion AS edificio_direccion,
      td.idtitularidad,
      td.propietario_id,
      td.fecha_desde,
      td.fecha_hasta,
      a.idalquiler,
      a.fecha_inicio AS alquiler_inicio,
      a.fecha_fin AS alquiler_fin,
      u_inq.nombre AS inquilino_nombre,
      u_inq.apellido AS inquilino_apellido,
      u_inq.email AS inquilino_email
    FROM titularidad_departamento td
    JOIN departamento d ON td.departamento_id = d.iddepartamento
    JOIN edificio e ON d.edificio_id = e.idedificio
    LEFT JOIN solicitud_alquiler sa ON sa.titularidad_departamento_id = td.idtitularidad AND sa.estado = 'Aceptada'
    LEFT JOIN alquiler a ON a.solicitud_alquiler_id = sa.idsolicitud_alquiler
    LEFT JOIN usuario u_inq ON sa.solicitante_id = u_inq.idusuario
    WHERE d.iddepartamento = ?
      AND td.propietario_id = ?
      AND (td.fecha_hasta IS NULL OR td.fecha_hasta >= CURDATE())
    LIMIT 1
  `;

  db.query(sqlProp, [departamentoId, usuarioId], (errProp, propRows) => {
    if (errProp) return callback(errProp);
    if (propRows.length > 0) {
      return callback(null, { rol: 'Propietario', info: propRows[0] });
    }

    const sqlInq = `
      SELECT
        d.*,
        e.nombre AS edificio_nombre,
        e.direccion AS edificio_direccion,
        td.idtitularidad,
        td.propietario_id,
        u_prop.nombre AS propietario_nombre,
        u_prop.apellido AS propietario_apellido,
        u_prop.email AS propietario_email,
        a.idalquiler,
        a.fecha_inicio AS alquiler_inicio,
        a.fecha_fin AS alquiler_fin
      FROM alquiler a
      JOIN solicitud_alquiler sa ON a.solicitud_alquiler_id = sa.idsolicitud_alquiler
      JOIN titularidad_departamento td ON sa.titularidad_departamento_id = td.idtitularidad
      JOIN departamento d ON td.departamento_id = d.iddepartamento
      JOIN edificio e ON d.edificio_id = e.idedificio
      JOIN usuario u_prop ON td.propietario_id = u_prop.idusuario
      WHERE d.iddepartamento = ?
        AND sa.solicitante_id = ?
        AND sa.estado = 'Aceptada'
      LIMIT 1
    `;

    db.query(sqlInq, [departamentoId, usuarioId], (errInq, inqRows) => {
      if (errInq) return callback(errInq);
      if (inqRows.length > 0) {
        return callback(null, { rol: 'Inquilino', info: inqRows[0] });
      }
      return callback(null, null);
    });
  });
}

// GET /api/gestion-departamento/:departamentoId
const obtenerDetalleGestion = (req, res) => {
  const { departamentoId } = req.params;
  const usuarioId = req.usuarioId;

  resolverRolYDepartamento(departamentoId, usuarioId, (errRol, acceso) => {
    if (errRol) return res.status(500).json({ error: errRol.message });
    if (!acceso) {
      return res.status(403).json({ error: 'No tienes acceso de propietario ni inquilino a este departamento' });
    }

    const { rol, info } = acceso;
    const alquilerId = info.idalquiler;

    const sqlServicios = `
      SELECT
        ds.iddepartamento_servicio,
        ds.proveedor,
        ds.identificador_cuenta,
        ds.fecha_inicio,
        ds.fecha_fin,
        s.idservicio,
        s.nombre AS servicio_nombre,
        s.tipo_de_servicio
      FROM departamento_servicio ds
      JOIN servicio s ON ds.servicio_id = s.idservicio
      WHERE ds.departamento_id = ?
      ORDER BY ds.iddepartamento_servicio DESC
    `;

    const sqlBoletas = `
      SELECT
        bs.idboleta_servicio,
        bs.departamento_servicio_id,
        bs.alquiler_id,
        bs.numero_boleta,
        bs.periodo_desde,
        bs.periodo_hasta,
        bs.fecha_emision,
        bs.fecha_vencimiento,
        bs.importe,
        bs.moneda,
        bs.archivo_boleta,
        bs.estado,
        s.nombre AS servicio_nombre,
        ds.proveedor
      FROM boleta_servicio bs
      JOIN departamento_servicio ds ON bs.departamento_servicio_id = ds.iddepartamento_servicio
      JOIN servicio s ON ds.servicio_id = s.idservicio
      WHERE ds.departamento_id = ?
      ORDER BY bs.fecha_vencimiento DESC, bs.idboleta_servicio DESC
    `;

    const sqlCuotas = alquilerId
      ? 'SELECT * FROM cuota_alquiler WHERE alquiler_id = ? ORDER BY periodo DESC'
      : null;

    const sqlComprobantes = `
      SELECT
        cp.*,
        u.nombre AS cargado_por_nombre,
        u.apellido AS cargado_por_apellido
      FROM comprobante_pago cp
      JOIN usuario u ON cp.usuario_carga_id = u.idusuario
      LEFT JOIN boleta_servicio bs ON cp.boleta_servicio_id = bs.idboleta_servicio
      LEFT JOIN departamento_servicio ds ON bs.departamento_servicio_id = ds.iddepartamento_servicio
      LEFT JOIN cuota_alquiler ca ON cp.cuota_alquiler_id = ca.idcuota_alquiler
      WHERE ds.departamento_id = ? OR ca.alquiler_id = ?
      ORDER BY cp.fecha_carga DESC, cp.idcomprobante_pago DESC
    `;

    db.query(sqlServicios, [departamentoId], (errServ, servicios) => {
      if (errServ) return res.status(500).json({ error: errServ.message });

      db.query(sqlBoletas, [departamentoId], (errBol, boletas) => {
        if (errBol) return res.status(500).json({ error: errBol.message });

        const finalizarConCuotas = (cuotas) => {
          db.query(sqlComprobantes, [departamentoId, alquilerId || 0], (errComp, comprobantes) => {
            if (errComp) return res.status(500).json({ error: errComp.message });

            const cuotasPagadas = cuotas.filter((c) => c.estado === 'Pagada');
            const cuotasPendientes = cuotas.filter((c) => c.estado !== 'Pagada');
            const boletasPagadas = boletas.filter((b) => b.estado === 'Pagada');
            const boletasPendientes = boletas.filter((b) => b.estado !== 'Pagada');

            res.json({
              rol,
              departamento: info,
              servicios,
              boletas,
              boletasPagadas,
              boletasPendientes,
              cuotas,
              cuotasPagadas,
              cuotasPendientes,
              comprobantes,
            });
          });
        };

        if (!sqlCuotas) {
          return finalizarConCuotas([]);
        }

        db.query(sqlCuotas, [alquilerId], (errCuo, cuotas) => {
          if (errCuo) return res.status(500).json({ error: errCuo.message });
          finalizarConCuotas(cuotas);
        });
      });
    });
  });
};

// POST /api/gestion-departamento/:departamentoId/comprobantes (Inquilino sube comprobante de boleta o cuota)
const subirComprobante = (req, res) => {
  const { departamentoId } = req.params;
  const usuarioId = req.usuarioId;
  const {
    boleta_servicio_id,
    cuota_alquiler_id,
    fecha_pago_declarada,
    importe_declarado,
    archivo_path,
    observacion,
  } = req.body;

  if (!boleta_servicio_id && !cuota_alquiler_id) {
    return res.status(400).json({ error: 'Debes indicar una boleta de servicio o una cuota de alquiler' });
  }
  if (!fecha_pago_declarada || !importe_declarado) {
    return res.status(400).json({ error: 'fecha_pago_declarada e importe_declarado son obligatorios' });
  }

  resolverRolYDepartamento(departamentoId, usuarioId, (errRol, acceso) => {
    if (errRol) return res.status(500).json({ error: errRol.message });
    if (!acceso || acceso.rol !== 'Inquilino') {
      return res.status(403).json({ error: 'Solo el inquilino del departamento puede subir comprobantes de pago' });
    }

    const sql = `
      INSERT INTO comprobante_pago
        (boleta_servicio_id, cuota_alquiler_id, usuario_carga_id, fecha_pago_declarada, importe_declarado, archivo_path, estado_revision, fecha_carga, observacion)
      VALUES (?, ?, ?, ?, ?, ?, 'pendiente', NOW(), ?)
    `;

    db.query(
      sql,
      [
        boleta_servicio_id || null,
        cuota_alquiler_id || null,
        usuarioId,
        fecha_pago_declarada,
        Number(importe_declarado),
        archivo_path || 'comprobante_cargado.pdf',
        observacion || null,
      ],
      (errIns, result) => {
        if (errIns) return res.status(500).json({ error: errIns.message });
        res.status(201).json({
          mensaje: 'Comprobante de pago registrado en estado pendiente de revisión.',
          idcomprobante_pago: result.insertId,
        });
      }
    );
  });
};

// PATCH /api/gestion-departamento/:departamentoId/boletas/:boletaId/estado (Propietario marca si está pagada o no)
const actualizarEstadoBoleta = (req, res) => {
  const { departamentoId, boletaId } = req.params;
  const usuarioId = req.usuarioId;
  const { estado } = req.body;

  if (!['Pagada', 'Pendiente', 'Vencida'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido. Usa Pagada, Pendiente o Vencida' });
  }

  resolverRolYDepartamento(departamentoId, usuarioId, (errRol, acceso) => {
    if (errRol) return res.status(500).json({ error: errRol.message });
    if (!acceso || acceso.rol !== 'Propietario') {
      return res.status(403).json({ error: 'Solo el propietario puede cambiar el estado de las boletas' });
    }

    const sql = `
      UPDATE boleta_servicio bs
      JOIN departamento_servicio ds ON bs.departamento_servicio_id = ds.iddepartamento_servicio
      SET bs.estado = ?
      WHERE bs.idboleta_servicio = ? AND ds.departamento_id = ?
    `;

    db.query(sql, [estado, boletaId, departamentoId], (errUpd, result) => {
      if (errUpd) return res.status(500).json({ error: errUpd.message });
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Boleta no encontrada en este departamento' });
      }
      res.json({ mensaje: `Boleta marcada como ${estado}.` });
    });
  });
};

// PATCH /api/gestion-departamento/:departamentoId/cuotas/:cuotaId/estado (Propietario marca cuota Pagada o Pendiente)
const actualizarEstadoCuota = (req, res) => {
  const { departamentoId, cuotaId } = req.params;
  const usuarioId = req.usuarioId;
  const { estado } = req.body;

  if (!['Pagada', 'Pendiente', 'Parcial'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido. Usa Pagada, Pendiente o Parcial' });
  }

  resolverRolYDepartamento(departamentoId, usuarioId, (errRol, acceso) => {
    if (errRol) return res.status(500).json({ error: errRol.message });
    if (!acceso || acceso.rol !== 'Propietario') {
      return res.status(403).json({ error: 'Solo el propietario puede cambiar el estado de las cuotas' });
    }

    const sql = `
      UPDATE cuota_alquiler ca
      JOIN alquiler a ON ca.alquiler_id = a.idalquiler
      JOIN solicitud_alquiler sa ON a.solicitud_alquiler_id = sa.idsolicitud_alquiler
      JOIN titularidad_departamento td ON sa.titularidad_departamento_id = td.idtitularidad
      SET ca.estado = ?
      WHERE ca.idcuota_alquiler = ? AND td.departamento_id = ?
    `;

    db.query(sql, [estado, cuotaId, departamentoId], (errUpd, result) => {
      if (errUpd) return res.status(500).json({ error: errUpd.message });
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Cuota no encontrada en este departamento' });
      }
      res.json({ mensaje: `Cuota marcada como ${estado}.` });
    });
  });
};

module.exports = {
  obtenerDetalleGestion,
  subirComprobante,
  actualizarEstadoBoleta,
  actualizarEstadoCuota,
};