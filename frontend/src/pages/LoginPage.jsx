import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('usuario', JSON.stringify(res.data.usuario));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '3rem auto', fontFamily: 'sans-serif' }}>
      <h2>Iniciar Sesión</h2>

      {error && <p style={{ color: 'red', background: '#fdedec', padding: '10px', borderRadius: '5px' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={cargando} style={{ padding: '10px', cursor: 'pointer' }}>
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
        <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
        <Link to="/register">Crear cuenta</Link>
      </div>
    </div>
  );
}

export default LoginPage;