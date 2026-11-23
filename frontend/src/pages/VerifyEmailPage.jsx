import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [estado, setEstado] = useState(token ? 'verificando' : 'error');
  const [mensaje, setMensaje] = useState(
    token
      ? 'Verificando tu correo electrónico...'
      : 'El enlace de verificación no contiene un token válido.'
  );

  useEffect(() => {
    if (!token) return;

    let activo = true;

    api.post('/auth/verificar-email', { token })
      .then((res) => {
        if (!activo) return;
        setEstado('exito');
        setMensaje(res.data.mensaje || '¡Correo verificado con éxito! Ya puedes iniciar sesión.');
      })
      .catch((err) => {
        if (!activo) return;
        setEstado('error');
        setMensaje(err.response?.data?.error || 'El enlace es inválido o ha expirado.');
      });

    return () => {
      activo = false;
    };
  }, [token]);

  return (
    <div style={{ maxWidth: '420px', margin: '4rem auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Verificación de Cuenta</h2>
      <p style={{ color: estado === 'error' ? 'red' : estado === 'exito' ? 'green' : '#333', margin: '1.5rem 0' }}>
        {mensaje}
      </p>
      {estado === 'exito' && (
        <Link
          to="/login"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#2c3e50',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '5px',
          }}
        >
          Ir al Login
        </Link>
      )}
    </div>
  );
}

export default VerifyEmailPage;