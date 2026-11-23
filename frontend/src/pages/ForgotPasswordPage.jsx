import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    setCargando(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMensaje(res.data.mensaje);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al solicitar recuperación');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '3rem auto', fontFamily: 'sans-serif' }}>
      <h2>Recuperar Contraseña</h2>
      <p style={{ fontSize: '14px', color: '#555' }}>
        Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
      </p>

      {mensaje && <p style={{ color: 'green', background: '#e8f8f5', padding: '10px', borderRadius: '5px' }}>{mensaje}</p>}
      {error && <p style={{ color: 'red', background: '#fdedec', padding: '10px', borderRadius: '5px' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="email"
          placeholder="Tu correo registrado"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={cargando} style={{ padding: '10px', cursor: 'pointer' }}>
          {cargando ? 'Enviando...' : 'Enviar enlace'}
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}>
        <Link to="/login">Volver al inicio de sesión</Link>
      </p>
    </div>
  );
}

export default ForgotPasswordPage;