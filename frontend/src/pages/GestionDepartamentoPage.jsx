import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

function obtenerSesionGuardada() {
  const token = localStorage.getItem('token');
  const datosGuardados = localStorage.getItem('usuario');
  if (!token || !datosGuardados) return { token: null, usuario: null };
  try {
    return { token, usuario: JSON.parse(datosGuardados) };
  } catch {
    return { token: null, usuario: null };
  }
}

async function fetchDetalleDepartamento(departamentoId) {
  const res = await api.get(`/gestion-departamento/${departamentoId}`);
  return res.data;
}

function GestionDepartamentoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [{ token, usuario }] = useState(obtenerSesionGuardada);

  const [detalle, setDetalle] = useState(null);
  const [feedback, setFeedback] = useState({ tipo: '', texto: '' });

  // Crear servicio
  const [servicioForm, setServicioForm] = useState({
    nombre: '',
    precio: '',
    frecuencia: 'Mensual',
    proveedor: '',
    identificador_cuenta: '',
  });

  // Crear boleta de servicio
  const [boletaForm, setBoletaForm] = useState({
    departamento_servicio_id: '',
    numero_boleta: '',
    periodo_desde: '',
    periodo_hasta: '',
    fecha_vencimiento: '',
    importe: '',
    moneda: 'ARS',
    archivo_boleta: '',
  });

  // Crear cuota de alquiler (Propietario)
  const [cuotaForm, setCuotaForm] = useState({
    periodo: new Date().toISOString().slice(0, 7) + '-01',
    fecha_vencimiento: '',
    importe: '',
    moneda: 'ARS',
  });

  // Subir comprobante (Inquilino) — puede abrirse desde una cuota específica o boleta
  const [comprobanteForm, setComprobanteForm] = useState({
    abierto: false,
    tipoDestino: 'cuota', // 'cuota' | 'boleta'
    cuota_alquiler_id: '',
    boleta_servicio_id: '',
    fecha_pago_declarada: new Date().toISOString().slice(0, 10),
    importe_declarado: '',
    archivo_path: '',
    observacion: '',
  });

  const aplicarDetalle = (data) => {
    setDetalle(data);

    if (data.servicios?.length > 0) {
      setBoletaForm((prev) => {
        const existeActual = data.servicios.some(
          (s) => String(s.iddepartamento_servicio) === String(prev.departamento_servicio_id)
        );
        return {
          ...prev,
          departamento_servicio_id: existeActual
            ? prev.departamento_servicio_id
            : String(data.servicios[0].iddepartamento_servicio),
        };
      });
    }

  };

  useEffect(() => {
    if (!token || !usuario) {
      navigate('/login');
      return;
    }

    let activo = true;
    fetchDetalleDepartamento(id)
      .then((data) => {
        if (!activo) return;
        aplicarDetalle(data);
      })
      .catch((err) => {
        if (!activo) return;
        setFeedback({
          tipo: 'error',
          texto: err.response?.data?.error || 'Error al cargar el detalle del departamento',
        });
      });

    return () => {
      activo = false;
    };
  }, [id, token, usuario, navigate]);

  const abrirModalComprobanteCuota = (cuota) => {
    setComprobanteForm({
      abierto: true,
      tipoDestino: 'cuota',
      cuota_alquiler_id: String(cuota.idcuota_alquiler),
      boleta_servicio_id: '',
      fecha_pago_declarada: new Date().toISOString().slice(0, 10),
      importe_declarado: String(cuota.importe || ''),
      archivo_path: '',
      observacion: `Pago alquiler período ${cuota.periodo}`,
    });
  };

  const abrirModalComprobanteBoleta = (boleta) => {
    setComprobanteForm({
      abierto: true,
      tipoDestino: 'boleta',
      cuota_alquiler_id: '',
      boleta_servicio_id: String(boleta.idboleta_servicio),
      fecha_pago_declarada: new Date().toISOString().slice(0, 10),
      importe_declarado: String(boleta.importe || ''),
      archivo_path: '',
      observacion: `Pago boleta ${boleta.servicio_nombre} #${boleta.numero_boleta || boleta.idboleta_servicio}`,
    });
  };

  const handleCrearServicio = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.post(`/gestion-departamento/${id}/servicios`, servicioForm);
      setFeedback({ tipo: 'ok', texto: res.data.mensaje || 'Servicio creado.' });
      setServicioForm({
        nombre: '',
        precio: '',
        frecuencia: 'Mensual',
        proveedor: '',
        identificador_cuenta: '',
      });
      const actualizado = await fetchDetalleDepartamento(id);
      aplicarDetalle(actualizado);
    } catch (err) {
      setFeedback({ tipo: 'error', texto: err.response?.data?.error || 'Error al crear servicio' });
    }
  };

  const handleCrearBoleta = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.post(`/gestion-departamento/${id}/boletas`, boletaForm);
      setFeedback({ tipo: 'ok', texto: res.data.mensaje || 'Boleta creada.' });
      setBoletaForm((prev) => ({
        ...prev,
        numero_boleta: '',
        importe: '',
        archivo_boleta: '',
      }));
      const actualizado = await fetchDetalleDepartamento(id);
      aplicarDetalle(actualizado);
    } catch (err) {
      setFeedback({ tipo: 'error', texto: err.response?.data?.error || 'Error al crear boleta' });
    }
  };

  const handleCrearCuota = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.post(`/gestion-departamento/${id}/cuotas`, cuotaForm);
      setFeedback({ tipo: 'ok', texto: res.data.mensaje || 'Cuota creada.' });
      setCuotaForm((prev) => ({ ...prev, importe: '' }));
      const actualizado = await fetchDetalleDepartamento(id);
      aplicarDetalle(actualizado);
    } catch (err) {
      setFeedback({ tipo: 'error', texto: err.response?.data?.error || 'Error al crear cuota' });
    }
  };

  const handleSubirComprobante = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });

    const payload = {
      cuota_alquiler_id:
        comprobanteForm.tipoDestino === 'cuota' ? Number(comprobanteForm.cuota_alquiler_id) : null,
      boleta_servicio_id:
        comprobanteForm.tipoDestino === 'boleta' ? Number(comprobanteForm.boleta_servicio_id) : null,
      fecha_pago_declarada: comprobanteForm.fecha_pago_declarada,
      importe_declarado: comprobanteForm.importe_declarado,
      archivo_path: comprobanteForm.archivo_path || 'comprobante_pago.pdf',
      observacion: comprobanteForm.observacion || null,
    };

    try {
      const res = await api.post(`/gestion-departamento/${id}/comprobantes`, payload);
      setFeedback({ tipo: 'ok', texto: res.data.mensaje || 'Comprobante enviado.' });
      setComprobanteForm((prev) => ({
        ...prev,
        abierto: false,
        importe_declarado: '',
        archivo_path: '',
        observacion: '',
      }));
      const actualizado = await fetchDetalleDepartamento(id);
      aplicarDetalle(actualizado);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al subir comprobante',
      });
    }
  };

  const handleCambiarEstadoBoleta = async (boletaId, nuevoEstado) => {
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.patch(`/gestion-departamento/${id}/boletas/${boletaId}/estado`, {
        estado: nuevoEstado,
      });
      setFeedback({ tipo: 'ok', texto: res.data.mensaje });
      const actualizado = await fetchDetalleDepartamento(id);
      aplicarDetalle(actualizado);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al actualizar estado de boleta',
      });
    }
  };

  const handleCambiarEstadoCuota = async (cuotaId, nuevoEstado) => {
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.patch(`/gestion-departamento/${id}/cuotas/${cuotaId}/estado`, {
        estado: nuevoEstado,
      });
      setFeedback({ tipo: 'ok', texto: res.data.mensaje });
      const actualizado = await fetchDetalleDepartamento(id);
      aplicarDetalle(actualizado);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al actualizar estado de cuota',
      });
    }
  };

  /* NUEVO */

  const handleRevisarComprobante = async (comprobanteId, nuevoEstado) => {
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.patch(
        `/gestion-departamento/${id}/comprobantes/${comprobanteId}/revision`,
        { estado_revision: nuevoEstado }
      );
      setFeedback({ tipo: 'ok', texto: res.data.mensaje });
      const actualizado = await fetchDetalleDepartamento(id);
      aplicarDetalle(actualizado);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al revisar el comprobante',
      });
    }
  };


  if (!token || !usuario) return null;

  return (
    <div style={{ maxWidth: '1080px', margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/dashboard">← Volver al Menú Principal</Link>
      </div>

      {feedback.texto && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            color: feedback.tipo === 'error' ? '#922b21' : '#1e8449',
            background: feedback.tipo === 'error' ? '#fadbd8' : '#d4efdf',
          }}
        >
          {feedback.texto}
        </div>
      )}

      {!detalle ? (
        <p>Cargando información del departamento...</p>
      ) : (
        <>
          {/* Información detallada del departamento */}
          <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <h2 style={{ marginTop: 0 }}>
              {detalle.departamento.edificio_nombre} — Depto {detalle.departamento.identificador}
            </h2>
            <p style={{ margin: '4px 0' }}>
              <strong>Dirección:</strong> {detalle.departamento.edificio_direccion} |{' '}
              <strong>Piso:</strong> {detalle.departamento.piso || '-'} |{' '}
              <strong>Número:</strong> {detalle.departamento.numero || '-'}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>Tu rol:</strong> {detalle.rol}
            </p>
            {detalle.departamento.alquiler_inicio && (
              <p style={{ margin: '4px 0', color: '#555' }}>
                <strong>Contrato de alquiler:</strong> {detalle.departamento.alquiler_inicio} al{' '}
                {detalle.departamento.alquiler_fin || 'Vigente'}
              </p>
            )}
          </section>

          {/* Cuotas del alquiler: Pagadas vs Pendientes + Comprobantes por mes */}
          <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <h3>Cuotas de Alquiler</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              <div>
                <h4>Períodos Pagados ({detalle.cuotasPagadas.length})</h4>
                {detalle.cuotasPagadas.length === 0 ? (
                  <p style={{ color: '#666' }}>Sin cuotas pagadas registradas.</p>
                ) : (
                  <ul>
                    {detalle.cuotasPagadas.map((c) => {
                      const compsCuota = detalle.comprobantes.filter(
                        (cp) => cp.cuota_alquiler_id === c.idcuota_alquiler
                      );
                      return (
                        <li key={c.idcuota_alquiler} style={{ marginBottom: '10px' }}>
                          <div>
                            Período: <strong>{c.periodo}</strong> — {c.moneda} {c.importe} ({c.estado})
                            {detalle.rol === 'Propietario' && (
                              <button
                                type="button"
                                onClick={() => handleCambiarEstadoCuota(c.idcuota_alquiler, 'Pendiente')}
                                style={{ marginLeft: '8px', cursor: 'pointer' }}
                              >
                                Marcar Pendiente
                              </button>
                            )}
                          </div>
                          {compsCuota.length > 0 && (
                            <ul style={{ fontSize: '12px', color: '#444', marginTop: '4px' }}>
                              {compsCuota.map((cp) => (
                                <li key={cp.idcomprobante_pago}>
                                  Comprobante: {cp.archivo_path} — ${cp.importe_declarado} ({cp.estado_revision})
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <h4>Períodos Adeudados / Pendientes ({detalle.cuotasPendientes.length})</h4>
                {detalle.cuotasPendientes.length === 0 ? (
                  <p style={{ color: '#666' }}>No hay cuotas pendientes.</p>
                ) : (
                  <ul>
                    {detalle.cuotasPendientes.map((c) => {
                      const compsCuota = detalle.comprobantes.filter(
                        (cp) => cp.cuota_alquiler_id === c.idcuota_alquiler
                      );
                      return (
                        <li key={c.idcuota_alquiler} style={{ marginBottom: '10px' }}>
                          <div>
                            Período: <strong>{c.periodo}</strong> — {c.moneda} {c.importe} (Vence:{' '}
                            {c.fecha_vencimiento || '-'} | {c.estado})
                          </div>
                          <div style={{ marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {detalle.rol === 'Inquilino' && (
                              <button
                                type="button"
                                onClick={() => abrirModalComprobanteCuota(c)}
                                style={{ cursor: 'pointer' }}
                              >
                                Pagar alquiler / Subir comprobante
                              </button>
                            )}
                            {detalle.rol === 'Propietario' && (
                              <button
                                type="button"
                                onClick={() => handleCambiarEstadoCuota(c.idcuota_alquiler, 'Pagada')}
                                style={{ cursor: 'pointer' }}
                              >
                                Marcar Pagada
                              </button>
                            )}
                          </div>
                          {compsCuota.length > 0 && (
                            <ul style={{ fontSize: '12px', color: '#444', marginTop: '4px' }}>
                              {compsCuota.map((cp) => (
                                <li key={cp.idcomprobante_pago}>
                                  Comprobante: {cp.archivo_path} — ${cp.importe_declarado} ({cp.estado_revision})
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Formulario para que el Propietario cree cuotas adicionales */}
            {detalle.rol === 'Propietario' && (
              <form
                onSubmit={handleCrearCuota}
                style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}
              >
                <strong>Nueva Cuota de Alquiler:</strong>
                <input
                  type="date"
                  value={cuotaForm.periodo}
                  onChange={(e) => setCuotaForm({ ...cuotaForm, periodo: e.target.value })}
                  required
                />
                <input
                  type="date"
                  value={cuotaForm.fecha_vencimiento}
                  onChange={(e) => setCuotaForm({ ...cuotaForm, fecha_vencimiento: e.target.value })}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Importe"
                  value={cuotaForm.importe}
                  onChange={(e) => setCuotaForm({ ...cuotaForm, importe: e.target.value })}
                  required
                />
                <button type="submit" style={{ cursor: 'pointer' }}>Agregar Cuota</button>
              </form>
            )}
          </section>

          {/* Servicios y Boletas de Servicios */}
          <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <h3>Servicios del Departamento</h3>
            {detalle.servicios.length === 0 ? (
              <p style={{ color: '#666' }}>No hay servicios asociados a este departamento.</p>
            ) : (
              <ul>
                {detalle.servicios.map((s) => (
                  <li key={s.iddepartamento_servicio}>
                    <strong>{s.servicio_nombre}</strong> — Periodicidad / Precio: <em>{s.tipo_de_servicio || '-'}</em> |
                    Proveedor: {s.proveedor || '-'} | Cuenta: {s.identificador_cuenta || '-'}
                  </li>
                ))}
              </ul>
            )}

            {/* Formulario para crear nuevo servicio */}
            <form
              onSubmit={handleCrearServicio}
              style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}
            >
              <strong>Nuevo Servicio:</strong>
              <input
                type="text"
                placeholder="Nombre (ej. Luz, Agua, Expensas)"
                value={servicioForm.nombre}
                onChange={(e) => setServicioForm({ ...servicioForm, nombre: e.target.value })}
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Precio del servicio"
                value={servicioForm.precio}
                onChange={(e) => setServicioForm({ ...servicioForm, precio: e.target.value })}
              />
              <select
                value={servicioForm.frecuencia}
                onChange={(e) => setServicioForm({ ...servicioForm, frecuencia: e.target.value })}
              >
                <option value="Mensual">Cada mes (Mensual)</option>
                <option value="Bimestral">Cada 2 meses (Bimestral)</option>
                <option value="Trimestral">Cada 3 meses (Trimestral)</option>
                <option value="Anual">Anual</option>
              </select>
              <input
                type="text"
                placeholder="Proveedor (opcional)"
                value={servicioForm.proveedor}
                onChange={(e) => setServicioForm({ ...servicioForm, proveedor: e.target.value })}
              />
              <button type="submit" style={{ cursor: 'pointer' }}>Crear Servicio</button>
            </form>

            <h3 style={{ marginTop: '1.5rem' }}>Boletas de Servicios (Pendientes y Pagadas)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              <div>
                <h4>Boletas Pendientes / Vencidas ({detalle.boletasPendientes.length})</h4>
                {detalle.boletasPendientes.length === 0 ? (
                  <p style={{ color: '#666' }}>No hay boletas pendientes.</p>
                ) : (
                  <ul>
                    {detalle.boletasPendientes.map((b) => (
                      <li key={b.idboleta_servicio} style={{ marginBottom: '10px' }}>
                        <div>
                          <strong>{b.servicio_nombre}</strong> #{b.numero_boleta || b.idboleta_servicio} —{' '}
                          {b.moneda} {b.importe} (Vence: {b.fecha_vencimiento || '-'} | <strong>{b.estado}</strong>)
                        </div>
                        <div style={{ marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {detalle.rol === 'Inquilino' && (
                            <button
                              type="button"
                              onClick={() => abrirModalComprobanteBoleta(b)}
                              style={{ cursor: 'pointer' }}
                            >
                              Subir comprobante boleta
                            </button>
                          )}
                          {detalle.rol === 'Propietario' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCambiarEstadoBoleta(b.idboleta_servicio, 'Pagada')}
                                style={{ cursor: 'pointer' }}
                              >
                                Pagada
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCambiarEstadoBoleta(b.idboleta_servicio, 'Vencida')}
                                style={{ cursor: 'pointer' }}
                              >
                                Vencida
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCambiarEstadoBoleta(b.idboleta_servicio, 'Pendiente')}
                                style={{ cursor: 'pointer' }}
                              >
                                Pendiente
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4>Boletas Pagadas ({detalle.boletasPagadas.length})</h4>
                {detalle.boletasPagadas.length === 0 ? (
                  <p style={{ color: '#666' }}>No hay boletas pagadas.</p>
                ) : (
                  <ul>
                    {detalle.boletasPagadas.map((b) => (
                      <li key={b.idboleta_servicio} style={{ marginBottom: '10px' }}>
                        <div>
                          <strong>{b.servicio_nombre}</strong> #{b.numero_boleta || b.idboleta_servicio} —{' '}
                          {b.moneda} {b.importe} (<strong>{b.estado}</strong>)
                        </div>
                        {detalle.rol === 'Propietario' && (
                          <div style={{ marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleCambiarEstadoBoleta(b.idboleta_servicio, 'Pendiente')}
                              style={{ cursor: 'pointer' }}
                            >
                              Marcar Pendiente
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCambiarEstadoBoleta(b.idboleta_servicio, 'Vencida')}
                              style={{ cursor: 'pointer' }}
                            >
                              Marcar Vencida
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Formulario para cargar nueva boleta de servicio */}
            {detalle.servicios.length > 0 && (
              <form
                onSubmit={handleCrearBoleta}
                style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}
              >
                <strong>Nueva Boleta de Servicio:</strong>
                <select
                  value={boletaForm.departamento_servicio_id}
                  onChange={(e) =>
                    setBoletaForm({ ...boletaForm, departamento_servicio_id: e.target.value })
                  }
                  required
                >
                  {detalle.servicios.map((s) => (
                    <option key={s.iddepartamento_servicio} value={s.iddepartamento_servicio}>
                      {s.servicio_nombre}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="N° boleta"
                  value={boletaForm.numero_boleta}
                  onChange={(e) => setBoletaForm({ ...boletaForm, numero_boleta: e.target.value })}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Importe"
                  value={boletaForm.importe}
                  onChange={(e) => setBoletaForm({ ...boletaForm, importe: e.target.value })}
                  required
                />
                <input
                  type="date"
                  value={boletaForm.fecha_vencimiento}
                  onChange={(e) => setBoletaForm({ ...boletaForm, fecha_vencimiento: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Archivo / enlace boleta"
                  value={boletaForm.archivo_boleta}
                  onChange={(e) => setBoletaForm({ ...boletaForm, archivo_boleta: e.target.value })}
                />
                <button type="submit" style={{ cursor: 'pointer' }}>Subir / Registrar Boleta</button>
              </form>
            )}
          </section>

          {/* Modal / Panel para subir comprobante de pago (Inquilino) */}
          {detalle.rol === 'Inquilino' && comprobanteForm.abierto && (
            <section style={{ border: '2px solid #2c3e50', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', background: '#f9fbfc' }}>
              <h3>Subir Comprobante de Pago ({comprobanteForm.tipoDestino === 'cuota' ? 'Cuota de Alquiler' : 'Boleta de Servicio'})</h3>
              <form onSubmit={handleSubirComprobante} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '500px' }}>
                <input
                  type="date"
                  value={comprobanteForm.fecha_pago_declarada}
                  onChange={(e) =>
                    setComprobanteForm({ ...comprobanteForm, fecha_pago_declarada: e.target.value })
                  }
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Importe abonado"
                  value={comprobanteForm.importe_declarado}
                  onChange={(e) =>
                    setComprobanteForm({ ...comprobanteForm, importe_declarado: e.target.value })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="Nombre o referencia del comprobante (ej. comprobante_enero.pdf)"
                  value={comprobanteForm.archivo_path}
                  onChange={(e) =>
                    setComprobanteForm({ ...comprobanteForm, archivo_path: e.target.value })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="Observación opcional"
                  value={comprobanteForm.observacion}
                  onChange={(e) =>
                    setComprobanteForm({ ...comprobanteForm, observacion: e.target.value })
                  }
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ padding: '8px 14px', cursor: 'pointer' }}>
                    Guardar Comprobante
                  </button>
                  <button
                    type="button"
                    onClick={() => setComprobanteForm((prev) => ({ ...prev, abierto: false }))}
                    style={{ padding: '8px 14px', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Historial general de comprobantes */}
          <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
            <h3>Todos los Comprobantes Cargados</h3>
            {detalle.comprobantes.length === 0 ? (
              <p style={{ color: '#666' }}>No hay comprobantes cargados aún.</p>
            ) : (
              <ul>
                {detalle.comprobantes.map((cp) => (
                  <li key={cp.idcomprobante_pago} style={{ marginBottom: '10px' }}>
                    <div>
                      <strong>${cp.importe_declarado}</strong> — Fecha pago: {cp.fecha_pago_declarada} |
                      Estado revisión: <strong>{cp.estado_revision}</strong> | Archivo: {cp.archivo_path}
                      {cp.observacion ? ` (${cp.observacion})` : ''}
                    </div>
                    {detalle.rol === 'Propietario' && cp.estado_revision === 'pendiente' && (
                      <div style={{ marginTop: '4px', display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleRevisarComprobante(cp.idcomprobante_pago, 'aprobado')}
                          style={{ cursor: 'pointer' }}
                        >
                          Aprobar comprobante
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevisarComprobante(cp.idcomprobante_pago, 'rechazado')}
                          style={{ cursor: 'pointer' }}
                        >
                          Rechazar comprobante
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default GestionDepartamentoPage;