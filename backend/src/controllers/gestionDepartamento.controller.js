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

// POST /api/gestion-departamento/:departamentoId/servicios
// Crea un servicio (con nombre, precio y periodicidad) y lo asocia al departamento
const crearServicioDepartamento = (req, res) => {
  const { departamentoId } = req.params;
  const usuarioId = req.usuarioId;
  const {
    nombre,
    precio,
    frecuencia, // ej. 'Mensual', 'Bimestral', 'Trimestral', 'Anual'
    proveedor,
    identificador_cuenta,
    fecha_inicio,
    fecha_fin,
  } = req.body;

  if (!nombre || !frecuencia) {
    return res.status(400).json({ error: 'nombre y frecuencia (cada cuánto se paga) son obligatorios' });
  }

  resolverRolYDepartamento(departamentoId, usuarioId, (errRol, acceso) => {
    if (errRol) return res.status(500).json({ error: errRol.message });
    if (!acceso) {
      return res.status(403).json({ error: 'No tienes acceso a este departamento' });
    }

    const tipoServicioTexto = precio
      ? `${frecuencia.trim()} - $${Number(precio).toFixed(2)}`
      : frecuencia.trim();

    db.query('SELECT COALESCE(MAX(idservicio), 0) + 1 AS nextId FROM servicio', (errId, idRows) => {
      if (errId) return res.status(500).json({ error: errId.message });
      const nextServicioId = idRows[0].nextId;

      const sqlServ = 'INSERT INTO servicio (idservicio, nombre, tipo_de_servicio) VALUES (?, ?, ?)';
      db.query(sqlServ, [nextServicioId, nombre.trim(), tipoServicioTexto], (errServ) => {
        if (errServ) return res.status(500).json({ error: errServ.message });

        const sqlDeptoServ = `
          INSERT INTO departamento_servicio
            (departamento_id, servicio_id, proveedor, identificador_cuenta, fecha_inicio, fecha_fin)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        const inicioFinal = fecha_inicio || new Date().toISOString().slice(0, 10);

        db.query(
          sqlDeptoServ,
          [
            departamentoId,
            nextServicioId,
            proveedor || null,
            identificador_cuenta || null,
            inicioFinal,
            fecha_fin || null,
          ],
          (errDs, dsResult) => {
            if (errDs) return res.status(500).json({ error: errDs.message });
            res.status(201).json({
              mensaje: 'Servicio creado y asociado al departamento con éxito.',
              idservicio: nextServicioId,
              iddepartamento_servicio: dsResult.insertId,
            });
          }
        );
      });
    });
  });
};

// POST /api/gestion-departamento/:departamentoId/boletas
// Propietario o Inquilino puede subir/registrar una boleta de servicio
const crearBoletaServicio = (req, res) => {
  const { departamentoId } = req.params;
  const usuarioId = req.usuarioId;
  const {
    departamento_servicio_id,
    numero_boleta,
    periodo_desde,
    periodo_hasta,
    fecha_emision,
    fecha_vencimiento,
    importe,
    moneda,
    archivo_boleta,
  } = req.body;

  if (!departamento_servicio_id || !importe) {
    return res.status(400).json({ error: 'departamento_servicio_id e importe son obligatorios' });
  }

  resolverRolYDepartamento(departamentoId, usuarioId, (errRol, acceso) => {
    if (errRol) return res.status(500).json({ error: errRol.message });
    if (!acceso) {
      return res.status(403).json({ error: 'No tienes acceso a este departamento' });
    }

    const sql = `
      INSERT INTO boleta_servicio
        (departamento_servicio_id, alquiler_id, numero_boleta, periodo_desde, periodo_hasta, fecha_emision, fecha_vencimiento, importe, moneda, archivo_boleta, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')
    `;

    db.query(
      sql,
      [
        Number(departamento_servicio_id),
        acceso.info.idalquiler || null,
        numero_boleta || null,
        periodo_desde || null,
        periodo_hasta || null,
        fecha_emision || new Date().toISOString().slice(0, 10),
        fecha_vencimiento || null,
        Number(importe),
        (moneda || 'ARS').trim().toUpperCase().slice(0, 3),
        archivo_boleta || null,
      ],
      (errBol, result) => {
        if (errBol) return res.status(500).json({ error: errBol.message });
        res.status(201).json({
          mensaje: 'Boleta de servicio registrada como Pendiente.',
          idboleta_servicio: result.insertId,
        });
      }
    );
  });
};

// POST /api/gestion-departamento/:departamentoId/cuotas
// Propietario crea una cuota de alquiler adicional
const crearCuotaAlquiler = (req, res) => {
  const { departamentoId } = req.params;
  const usuarioId = req.usuarioId;
  const { periodo, fecha_vencimiento, importe, moneda } = req.body;

  if (!periodo || !importe) {
    return res.status(400).json({ error: 'periodo e importe son obligatorios' });
  }

  resolverRolYDepartamento(departamentoId, usuarioId, (errRol, acceso) => {
    if (errRol) return res.status(500).json({ error: errRol.message });
    if (!acceso || acceso.rol !== 'Propietario') {
      return res.status(403).json({ error: 'Solo el propietario puede crear cuotas de alquiler' });
    }
    if (!acceso.info.idalquiler) {
      return res.status(400).json({ error: 'El departamento aún no tiene un alquiler activo' });
    }

    const sql = `
      INSERT INTO cuota_alquiler
        (alquiler_id, periodo, fecha_vencimiento, importe, moneda, estado, fecha_generacion)
      VALUES (?, ?, ?, ?, ?, 'Pendiente', NOW())
    `;

    db.query(
      sql,
      [
        acceso.info.idalquiler,
        periodo,
        fecha_vencimiento || null,
        Number(importe),
        (moneda || 'ARS').trim().toUpperCase().slice(0, 3),
      ],
      (errCuo, result) => {
        if (errCuo) {
          if (errCuo.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya existe una cuota para ese período en este alquiler' });
          }
          return res.status(500).json({ error: errCuo.message });
        }
        res.status(201).json({
          mensaje: 'Cuota de alquiler creada en estado Pendiente.',
          idcuota_alquiler: result.insertId,
        });
      }
    );
  });
};


// PATCH /api/gestion-departamento/:departamentoId/comprobantes/:comprobanteId/revision
const revisarComprobante = (req, res) => {
  const { departamentoId, comprobanteId } = req.params;
  const usuarioId = req.usuarioId;
  const { estado_revision, observacion } = req.body;

  if (!['aprobado', 'rechazado'].includes(estado_revision)) {
    return res.status(400).json({ error: 'estado_revision debe ser aprobado o rechazado' });
  }

  resolverRolYDepartamento(departamentoId, usuarioId, (errRol, acceso) => {
    if (errRol) return res.status(500).json({ error: errRol.message });
    if (!acceso || acceso.rol !== 'Propietario') {
      return res.status(403).json({ error: 'Solo el propietario puede revisar comprobantes' });
    }

    const sqlBuscar = `
      SELECT
        cp.idcomprobante_pago,
        cp.boleta_servicio_id,
        cp.cuota_alquiler_id,
        ds.departamento_id AS depto_boleta,
        td.departamento_id AS depto_cuota
      FROM comprobante_pago cp
      LEFT JOIN boleta_servicio bs ON cp.boleta_servicio_id = bs.idboleta_servicio
      LEFT JOIN departamento_servicio ds ON bs.departamento_servicio_id = ds.iddepartamento_servicio
      LEFT JOIN cuota_alquiler ca ON cp.cuota_alquiler_id = ca.idcuota_alquiler
      LEFT JOIN alquiler a ON ca.alquiler_id = a.idalquiler
      LEFT JOIN solicitud_alquiler sa ON a.solicitud_alquiler_id = sa.idsolicitud_alquiler
      LEFT JOIN titularidad_departamento td ON sa.titularidad_departamento_id = td.idtitularidad
      WHERE cp.idcomprobante_pago = ?
      LIMIT 1
    `;

    db.query(sqlBuscar, [comprobanteId], (errBus, rows) => {
      if (errBus) return res.status(500).json({ error: errBus.message });
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Comprobante no encontrado' });
      }

      const comp = rows[0];
      const deptoIdComp = comp.depto_boleta || comp.depto_cuota;
      if (Number(deptoIdComp) !== Number(departamentoId)) {
        return res.status(403).json({ error: 'El comprobante no pertenece a este departamento' });
      }

      const sqlUpd = `
        UPDATE comprobante_pago
        SET estado_revision = ?,
            revisado_por_id = ?,
            observacion = COALESCE(?, observacion)
        WHERE idcomprobante_pago = ?
      `;

      db.query(
        sqlUpd,
        [estado_revision, usuarioId, observacion || null, comprobanteId],
        (errUpd) => {
          if (errUpd) return res.status(500).json({ error: errUpd.message });

          if (estado_revision === 'aprobado') {
            if (comp.cuota_alquiler_id) {
              db.query(
                "UPDATE cuota_alquiler SET estado = 'Pagada' WHERE idcuota_alquiler = ?",
                [comp.cuota_alquiler_id]
              );
            }
            if (comp.boleta_servicio_id) {
              db.query(
                "UPDATE boleta_servicio SET estado = 'Pagada' WHERE idboleta_servicio = ?",
                [comp.boleta_servicio_id]
              );
            }
          }

          res.json({ mensaje: `Comprobante marcado como ${estado_revision}.` });
        }
      );
    });
  });
};


module.exports = {
  obtenerDetalleGestion,
  subirComprobante,
  actualizarEstadoBoleta,
  actualizarEstadoCuota,
  crearServicioDepartamento,
  crearCuotaAlquiler,
  crearBoletaServicio,
  revisarComprobante,
};