import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function obtenerSesionGuardada() {
  const token = localStorage.getItem('token');
  const datosGuardados = localStorage.getItem('usuario');

  if (!token || !datosGuardados) {
    return { token: null, usuario: null };
  }

  try {
    return { token, usuario: JSON.parse(datosGuardados) };
  } catch {
    return { token: null, usuario: null };
  }
}

async function fetchDatosPanel() {
  const [resEdif, resDeptos, resMisDeptos, resInv] = await Promise.all([
    api.get('/edificio'),
    api.get('/departamento'),
    api.get('/mis-departamentos'),
    api.get('/invitaciones/recibidas'),
  ]);

  return {
    edificio: resEdif.data,
    departamento: resDeptos.data,
    misDepartamentos: resMisDeptos.data,
    invitaciones: resInv.data,
  };
}

function DashboardPage() {
  const [{ token, usuario }] = useState(obtenerSesionGuardada);
  const navigate = useNavigate();

  const [edificio, setEdificio] = useState([]);
  const [departamento, setDepartamento] = useState([]);
  const [misDepartamentos, setMisDepartamentos] = useState({ propietario: [], inquilino: [] });
  const [invitaciones, setInvitaciones] = useState([]);

  const [edificioForm, setEdificioForm] = useState({ nombre: '', direccion: '' });
  const [deptoForm, setDeptoForm] = useState({
    edificio_id: '',
    identificador: '',
    piso: '',
    numero: '',
  });
  const [propietarioForm, setPropietarioForm] = useState({
    departamento_id: '',
    fecha_desde: new Date().toISOString().slice(0, 10),
  });
  const [invitacionForm, setInvitacionForm] = useState({
    departamento_id: '',
    email_invitado: '',
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin: '',
    importe_mensual: '',
    moneda: 'ARS',
    mensaje: '',
  });

  const [feedback, setFeedback] = useState({ tipo: '', texto: '' });

  const aplicarDatosPanel = (data) => {
    setEdificio(data.edificio);
    setDepartamento(data.departamento);
    setMisDepartamentos(data.misDepartamentos);
    setInvitaciones(data.invitaciones);

    if (data.edificio.length > 0) {
      setDeptoForm((prev) => ({
        ...prev,
        edificio_id: prev.edificio_id || String(data.edificio[0].idedificio),
      }));
    }
    if (data.departamento.length > 0) {
      setPropietarioForm((prev) => ({
        ...prev,
        departamento_id: prev.departamento_id || String(data.departamento[0].iddepartamento),
      }));
    }
    if (data.misDepartamentos.propietario?.length > 0) {
      setInvitacionForm((prev) => ({
        ...prev,
        departamento_id:
          prev.departamento_id || String(data.misDepartamentos.propietario[0].iddepartamento),
      }));
    }
  };

  useEffect(() => {
    if (!token || !usuario) {
      navigate('/login');
      return;
    }

    let activo = true;

    fetchDatosPanel()
      .then((data) => {
        if (!activo) return;
        aplicarDatosPanel(data);
      })
      .catch((err) => {
        if (!activo) return;
        setFeedback({
          tipo: 'error',
          texto: err.response?.data?.error || 'Error al cargar los datos del panel',
        });
      });

    return () => {
      activo = false;
    };
  }, [token, usuario, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const handleCrearEdificio = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });
    try {
      await api.post('/edificio', edificioForm);
      setEdificioForm({ nombre: '', direccion: '' });
      setFeedback({ tipo: 'ok', texto: 'Edificio registrado con éxito.' });
      const datosActualizados = await fetchDatosPanel();
      aplicarDatosPanel(datosActualizados);
    } catch (err) {
      setFeedback({ tipo: 'error', texto: err.response?.data?.error || 'Error al crear edificio' });
    }
  };

  const handleCrearDepartamento = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });
    try {
      await api.post('/departamento', deptoForm);
      setDeptoForm((prev) => ({ ...prev, identificador: '', piso: '', numero: '' }));
      setFeedback({ tipo: 'ok', texto: 'Departamento registrado con éxito.' });
      const datosActualizados = await fetchDatosPanel();
      aplicarDatosPanel(datosActualizados);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al crear departamento',
      });
    }
  };

  const handleRegistrarPropietario = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });
    try {
      await api.post('/mis-departamentos/propietario', propietarioForm);
      setFeedback({ tipo: 'ok', texto: 'Ahora figuras como propietario del departamento.' });
      const datosActualizados = await fetchDatosPanel();
      aplicarDatosPanel(datosActualizados);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al registrar titularidad',
      });
    }
  };

  const handleEnviarInvitacion = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.post('/invitaciones', invitacionForm);
      setInvitacionForm((prev) => ({ ...prev, email_invitado: '', mensaje: '' }));
      setFeedback({ tipo: 'ok', texto: res.data.mensaje || 'Invitación enviada.' });
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al enviar invitación',
      });
    }
  };

  const handleAceptarInvitacion = async (idSolicitud) => {
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.post(`/invitaciones/${idSolicitud}/aceptar`, {});
      setFeedback({
        tipo: 'ok',
        texto: res.data.mensaje || 'Invitación aceptada. Ya eres inquilino.',
      });
      const datosActualizados = await fetchDatosPanel();
      aplicarDatosPanel(datosActualizados);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al aceptar la invitación',
      });
    }
  };

  const handleRechazarInvitacion = async (idSolicitud) => {
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.post(`/invitaciones/${idSolicitud}/rechazar`, {});
      setFeedback({
        tipo: 'ok',
        texto: res.data.mensaje || 'Invitación rechazada.',
      });
      const datosActualizados = await fetchDatosPanel();
      aplicarDatosPanel(datosActualizados);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al rechazar la invitación',
      });
    }
  };

  if (!token || !usuario) return null;

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Menú Principal</h1>
          <p style={{ margin: '4px 0 0', color: '#555' }}>
            Usuario: <strong>{usuario.nombre} {usuario.apellido}</strong> ({usuario.email})
          </p>
        </div>
        <button type="button" onClick={handleLogout} style={{ padding: '8px 14px', cursor: 'pointer' }}>
          Cerrar sesión
        </button>
      </header>

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

      {/* 1. Registrar Edificio y Departamento */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <form
          onSubmit={handleCrearEdificio}
          style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}
        >
          <h3>1A. Registrar Edificio</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Nombre del edificio"
              value={edificioForm.nombre}
              onChange={(e) => setEdificioForm({ ...edificioForm, nombre: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Dirección"
              value={edificioForm.direccion}
              onChange={(e) => setEdificioForm({ ...edificioForm, direccion: e.target.value })}
              required
            />
            <button type="submit" style={{ padding: '8px', cursor: 'pointer' }}>
              Guardar Edificio
            </button>
          </div>
        </form>

        <form
          onSubmit={handleCrearDepartamento}
          style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}
        >
          <h3>1B. Registrar Departamento</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select
              value={deptoForm.edificio_id}
              onChange={(e) => setDeptoForm({ ...deptoForm, edificio_id: e.target.value })}
              required
            >
              <option value="">Selecciona un edificio...</option>
              {edificio.map((ed) => (
                <option key={ed.idedificio} value={ed.idedificio}>
                  {ed.nombre} ({ed.direccion})
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Identificador (ej. 2B, Depto 101)"
              value={deptoForm.identificador}
              onChange={(e) => setDeptoForm({ ...deptoForm, identificador: e.target.value })}
              required
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Piso"
                value={deptoForm.piso}
                onChange={(e) => setDeptoForm({ ...deptoForm, piso: e.target.value })}
                style={{ width: '50%' }}
              />
              <input
                type="text"
                placeholder="Número"
                value={deptoForm.numero}
                onChange={(e) => setDeptoForm({ ...deptoForm, numero: e.target.value })}
                style={{ width: '50%' }}
              />
            </div>
            <button type="submit" style={{ padding: '8px', cursor: 'pointer' }}>
              Guardar Departamento
            </button>
          </div>
        </form>
      </section>

      {/* 2. Registrar Titularidad como Propietario & Enviar Invitación por Email */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <form
          onSubmit={handleRegistrarPropietario}
          style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}
        >
          <h3>2. Registrarme como Propietario</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select
              value={propietarioForm.departamento_id}
              onChange={(e) =>
                setPropietarioForm({ ...propietarioForm, departamento_id: e.target.value })
              }
              required
            >
              <option value="">Selecciona un departamento...</option>
              {departamento.map((d) => (
                <option key={d.iddepartamento} value={d.iddepartamento}>
                  {d.edificio_nombre} - {d.identificador}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={propietarioForm.fecha_desde}
              onChange={(e) =>
                setPropietarioForm({ ...propietarioForm, fecha_desde: e.target.value })
              }
              required
            />
            <button type="submit" style={{ padding: '8px', cursor: 'pointer' }}>
              Asignarme como Propietario
            </button>
          </div>
        </form>

        <form
  onSubmit={handleEnviarInvitacion}
  style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}
>
  <h3>3. Invitar Inquilino por Email (Propietario)</h3>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <select
      value={invitacionForm.departamento_id}
      onChange={(e) =>
        setInvitacionForm({ ...invitacionForm, departamento_id: e.target.value })
      }
      required
    >
      <option value="">Selecciona uno de tus departamentos...</option>
      {misDepartamentos.propietario.map((d) => (
        <option key={d.iddepartamento} value={d.iddepartamento}>
          {d.edificio_nombre} - {d.identificador}
        </option>
      ))}
    </select>
    <input
      type="email"
      placeholder="Email del usuario registrado"
      value={invitacionForm.email_invitado}
      onChange={(e) =>
        setInvitacionForm({ ...invitacionForm, email_invitado: e.target.value })
      }
      required
    />
    <div style={{ display: 'flex', gap: '8px' }}>
      <div style={{ flex: 1 }}>
        <label style={{ fontSize: '12px' }}>Desde:</label>
        <input
          type="date"
          value={invitacionForm.fecha_inicio}
          onChange={(e) =>
            setInvitacionForm({ ...invitacionForm, fecha_inicio: e.target.value })
          }
          required
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ flex: 1 }}>
        <label style={{ fontSize: '12px' }}>Hasta:</label>
        <input
          type="date"
          value={invitacionForm.fecha_fin}
          onChange={(e) =>
            setInvitacionForm({ ...invitacionForm, fecha_fin: e.target.value })
          }
          style={{ width: '100%' }}
        />
      </div>
    </div>
    <div style={{ display: 'flex', gap: '8px' }}>
      <input
        type="number"
        step="0.01"
        placeholder="Valor cuota mensual"
        value={invitacionForm.importe_mensual}
        onChange={(e) =>
          setInvitacionForm({ ...invitacionForm, importe_mensual: e.target.value })
        }
        required
        style={{ flex: 2 }}
      />
      <input
        type="text"
        maxLength={3}
        placeholder="ARS"
        value={invitacionForm.moneda}
        onChange={(e) =>
          setInvitacionForm({ ...invitacionForm, moneda: e.target.value })
        }
        style={{ width: '70px' }}
      />
    </div>
    <input
      type="text"
      placeholder="Mensaje opcional para el inquilino"
      value={invitacionForm.mensaje}
      onChange={(e) => setInvitacionForm({ ...invitacionForm, mensaje: e.target.value })}
    />
    <button type="submit" style={{ padding: '8px', cursor: 'pointer' }}>
      Enviar Invitación de Alquiler
    </button>
  </div>
</form>
      </section>

      {/* 4. Mis Departamentos (Propietario e Inquilino) */}
      <section
        style={{
          border: '1px solid #ddd',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
        }}
      >
        <h3>4. Mis Departamentos y Gestión</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <h4>Como Propietario</h4>
            {misDepartamentos.propietario.length === 0 ? (
              <p style={{ color: '#666' }}>No tienes departamentos registrados como propietario.</p>
            ) : (
              <ul>
                {misDepartamentos.propietario.map((d) => (
                  <li key={`prop-${d.iddepartamento}`} style={{ marginBottom: '8px' }}>
                    <strong>{d.edificio_nombre}</strong> — Depto {d.identificador}{' '}
                    <button
                      type="button"
                      onClick={() => navigate(`/gestion-departamento/${d.iddepartamento}`)}
                      style={{ marginLeft: '6px', cursor: 'pointer' }}
                    >
                      Gestionar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4>Como Inquilino</h4>
            {misDepartamentos.inquilino.length === 0 ? (
              <p style={{ color: '#666' }}>No figuras como inquilino en ningún departamento aún.</p>
            ) : (
              <ul>
                {misDepartamentos.inquilino.map((d) => (
                  <li key={`inq-${d.iddepartamento}`} style={{ marginBottom: '8px' }}>
                    <strong>{d.edificio_nombre}</strong> — Depto {d.identificador}{' '}
                    <button
                      type="button"
                      onClick={() => navigate(`/gestion-departamento/${d.iddepartamento}`)}
                      style={{ marginLeft: '6px', cursor: 'pointer' }}
                    >
                      Gestionar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* 5. Invitaciones de Alquiler Recibidas */}
      <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
        <h3>5. Invitaciones de Alquiler Recibidas</h3>
        {invitaciones.length === 0 ? (
          <p style={{ color: '#666' }}>No tienes invitaciones de alquiler.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {invitaciones.map((inv) => (
              <li
                key={inv.idsolicitud_alquiler}
                style={{
                  borderBottom: '1px solid #eee',
                  padding: '10px 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div>
                  <strong>{inv.edificio_nombre}</strong> — Depto {inv.identificador} | Estado:{' '}
                  <strong>{inv.estado}</strong>
                  <div style={{ fontSize: '13px', color: '#555' }}>
                    Invita: {inv.propietario_nombre} {inv.propietario_apellido} (
                    {inv.propietario_email})
                    {inv.mensaje ? ` — "${inv.mensaje}"` : ''}
                  </div>
                </div>
                {inv.estado === 'Pendiente' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleAceptarInvitacion(inv.idsolicitud_alquiler)}
                      style={{ padding: '6px 12px', cursor: 'pointer' }}
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRechazarInvitacion(inv.idsolicitud_alquiler)}
                      style={{ padding: '6px 12px', cursor: 'pointer' }}
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;