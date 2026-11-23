import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');

    if (!token) {
      setError('Token faltante o inválido en el enlace.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);
    try {
      const res = await api.post('/auth/reset-password', { token, nuevaPassword });
      setMensaje(res.data.mensaje);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al restablecer la contraseña');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '3rem auto', fontFamily: 'sans-serif' }}>
      <h2>Nueva Contraseña</h2>

      {mensaje && <p style={{ color: 'green', background: '#e8f8f5', padding: '10px', borderRadius: '5px' }}>{mensaje}</p>}
      {error && <p style={{ color: 'red', background: '#fdedec', padding: '10px', borderRadius: '5px' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="password"
          placeholder="Nueva contraseña"
          value={nuevaPassword}
          onChange={(e) => setNuevaPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirmar nueva contraseña"
          value={confirmarPassword}
          onChange={(e) => setConfirmarPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={cargando} style={{ padding: '10px', cursor: 'pointer' }}>
          {cargando ? 'Guardando...' : 'Restablecer contraseña'}
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}>
        <Link to="/login">Volver al login</Link>
      </p>
    </div>
  );
}

export default ResetPasswordPage;