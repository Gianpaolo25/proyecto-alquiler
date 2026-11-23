import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function RegisterPage() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
  });
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    setCargando(true);

    try {
      const res = await api.post('/auth/register', formData);
      setMensaje(res.data.mensaje || 'Registro exitoso. Revisa tu correo para verificar tu cuenta.');
      setFormData({ nombre: '', apellido: '', email: '', password: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar el usuario');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '3rem auto', fontFamily: 'sans-serif' }}>
      <h2>Crear Cuenta</h2>

      {mensaje && <p style={{ color: 'green', background: '#e8f8f5', padding: '10px', borderRadius: '5px' }}>{mensaje}</p>}
      {error && <p style={{ color: 'red', background: '#fdedec', padding: '10px', borderRadius: '5px' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="text"
          name="nombre"
          placeholder="Nombre"
          value={formData.nombre}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="apellido"
          placeholder="Apellido"
          value={formData.apellido}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Correo electrónico"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <button type="submit" disabled={cargando} style={{ padding: '10px', cursor: 'pointer' }}>
          {cargando ? 'Registrando...' : 'Registrarse'}
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}>
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </div>
  );
}

export default RegisterPage;