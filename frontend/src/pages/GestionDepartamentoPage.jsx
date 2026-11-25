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

  // Formulario para Inquilino: subir comprobante
  const [comprobanteForm, setComprobanteForm] = useState({
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
    setComprobanteForm((prev) => ({
      ...prev,
      cuota_alquiler_id:
        prev.cuota_alquiler_id || (data.cuotasPendientes?.[0]?.idcuota_alquiler ? String(data.cuotasPendientes[0].idcuota_alquiler) : ''),
      boleta_servicio_id:
        prev.boleta_servicio_id || (data.boletasPendientes?.[0]?.idboleta_servicio ? String(data.boletasPendientes[0].idboleta_servicio) : ''),
    }));
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
      archivo_path: comprobanteForm.archivo_path || 'comprobante.pdf',
      observacion: comprobanteForm.observacion || null,
    };

    try {
      const res = await api.post(`/gestion-departamento/${id}/comprobantes`, payload);
      setFeedback({ tipo: 'ok', texto: res.data.mensaje || 'Comprobante enviado.' });
      setComprobanteForm((prev) => ({
        ...prev,
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

  if (!token || !usuario) return null;

  return (
    <div style={{ maxWidth: '1050px', margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
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
              <strong>Tu rol en este departamento:</strong> {detalle.rol}
            </p>
            {detalle.departamento.alquiler_inicio && (
              <p style={{ margin: '4px 0', color: '#555' }}>
                <strong>Contrato de alquiler:</strong> {detalle.departamento.alquiler_inicio} al{' '}
                {detalle.departamento.alquiler_fin || 'Vigente'}
              </p>
            )}
          </section>

          {/* Cuotas del alquiler: Pagadas vs Pendientes */}
          <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <h3>Cuotas de Alquiler</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              <div>
                <h4>Períodos Pagados ({detalle.cuotasPagadas.length})</h4>
                {detalle.cuotasPagadas.length === 0 ? (
                  <p style={{ color: '#666' }}>Sin cuotas pagadas registradas.</p>
                ) : (
                  <ul>
                    {detalle.cuotasPagadas.map((c) => (
                      <li key={c.idcuota_alquiler} style={{ marginBottom: '6px' }}>
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
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4>Períodos Adeudados / Pendientes ({detalle.cuotasPendientes.length})</h4>
                {detalle.cuotasPendientes.length === 0 ? (
                  <p style={{ color: '#666' }}>No hay cuotas pendientes.</p>
                ) : (
                  <ul>
                    {detalle.cuotasPendientes.map((c) => (
                      <li key={c.idcuota_alquiler} style={{ marginBottom: '6px' }}>
                        Período: <strong>{c.periodo}</strong> — {c.moneda} {c.importe} (Vence: {c.fecha_vencimiento || '-'} | {c.estado})
                        {detalle.rol === 'Propietario' && (
                          <button
                            type="button"
                            onClick={() => handleCambiarEstadoCuota(c.idcuota_alquiler, 'Pagada')}
                            style={{ marginLeft: '8px', cursor: 'pointer' }}
                          >
                            Marcar Pagada
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
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
                    <strong>{s.servicio_nombre}</strong> ({s.tipo_de_servicio || 'Servicio'}) — Proveedor:{' '}
                    {s.proveedor || '-'} | Cuenta: {s.identificador_cuenta || '-'}
                  </li>
                ))}
              </ul>
            )}

            <h3 style={{ marginTop: '1.5rem' }}>Boletas de Servicios (Pendientes y Pagadas)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              <div>
                <h4>Boletas Pendientes / Vencidas ({detalle.boletasPendientes.length})</h4>
                {detalle.boletasPendientes.length === 0 ? (
                  <p style={{ color: '#666' }}>No hay boletas pendientes.</p>
                ) : (
                  <ul>
                    {detalle.boletasPendientes.map((b) => (
                      <li key={b.idboleta_servicio} style={{ marginBottom: '8px' }}>
                        <strong>{b.servicio_nombre}</strong> #{b.numero_boleta || b.idboleta_servicio} —{' '}
                        {b.moneda} {b.importe} (Vence: {b.fecha_vencimiento || '-'} | <strong>{b.estado}</strong>)
                        {detalle.rol === 'Propietario' && (
                          <div style={{ marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleCambiarEstadoBoleta(b.idboleta_servicio, 'Pagada')}
                              style={{ cursor: 'pointer' }}
                            >
                              Marcar como Pagada
                            </button>
                          </div>
                        )}
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
                      <li key={b.idboleta_servicio} style={{ marginBottom: '8px' }}>
                        <strong>{b.servicio_nombre}</strong> #{b.numero_boleta || b.idboleta_servicio} —{' '}
                        {b.moneda} {b.importe} (<strong>{b.estado}</strong>)
                        {detalle.rol === 'Propietario' && (
                          <div style={{ marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleCambiarEstadoBoleta(b.idboleta_servicio, 'Pendiente')}
                              style={{ cursor: 'pointer' }}
                            >
                              Marcar como Pendiente / No Pagada
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* Subir comprobante si el usuario es Inquilino */}
          {detalle.rol === 'Inquilino' && (
            <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <h3>Subir Comprobante de Pago (Inquilino)</h3>
              <form onSubmit={handleSubirComprobante} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '500px' }}>
                <select
                  value={comprobanteForm.tipoDestino}
                  onChange={(e) => setComprobanteForm({ ...comprobanteForm, tipoDestino: e.target.value })}
                >
                  <option value="cuota">Cuota de Alquiler</option>
                  <option value="boleta">Boleta de Servicio</option>
                </select>

                {comprobanteForm.tipoDestino === 'cuota' ? (
                  <select
                    value={comprobanteForm.cuota_alquiler_id}
                    onChange={(e) =>
                      setComprobanteForm({ ...comprobanteForm, cuota_alquiler_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecciona una cuota...</option>
                    {detalle.cuotas.map((c) => (
                      <option key={c.idcuota_alquiler} value={c.idcuota_alquiler}>
                        Período {c.periodo} — {c.moneda} {c.importe} ({c.estado})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={comprobanteForm.boleta_servicio_id}
                    onChange={(e) =>
                      setComprobanteForm({ ...comprobanteForm, boleta_servicio_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecciona una boleta de servicio...</option>
                    {detalle.boletas.map((b) => (
                      <option key={b.idboleta_servicio} value={b.idboleta_servicio}>
                        {b.servicio_nombre} #{b.numero_boleta || b.idboleta_servicio} — {b.moneda} {b.importe} ({b.estado})
                      </option>
                    ))}
                  </select>
                )}

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
                  placeholder="Nombre o ruta de archivo / comprobante (ej. transferencia_nov.pdf)"
                  value={comprobanteForm.archivo_path}
                  onChange={(e) =>
                    setComprobanteForm({ ...comprobanteForm, archivo_path: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="Observación opcional"
                  value={comprobanteForm.observacion}
                  onChange={(e) =>
                    setComprobanteForm({ ...comprobanteForm, observacion: e.target.value })
                  }
                />
                <button type="submit" style={{ padding: '8px', cursor: 'pointer' }}>
                  Enviar Comprobante
                </button>
              </form>
            </section>
          )}

          {/* Historial de comprobantes cargados */}
          <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
            <h3>Comprobantes de Pago Registrados</h3>
            {detalle.comprobantes.length === 0 ? (
              <p style={{ color: '#666' }}>No hay comprobantes cargados aún.</p>
            ) : (
              <ul>
                {detalle.comprobantes.map((cp) => (
                  <li key={cp.idcomprobante_pago} style={{ marginBottom: '6px' }}>
                    <strong>${cp.importe_declarado}</strong> — Fecha pago: {cp.fecha_pago_declarada} |
                    Estado revisión: <strong>{cp.estado_revision}</strong> | Archivo: {cp.archivo_path}
                    {cp.observacion ? ` (${cp.observacion})` : ''}
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