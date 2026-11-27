import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
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
      setMensaje(
        res.data.mensaje || 'Registro exitoso. Revisa tu correo para verificar tu cuenta.'
      );
      setFormData({ nombre: '', apellido: '', email: '', password: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar el usuario');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="xs">
        <Card elevation={3}>
          <CardContent sx={{ p: 3.5 }}>
            <Stack spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
              <PersonAddIcon color="primary" fontSize="large" />
              <Typography variant="h5" component="h1" fontWeight={700}>
                Crear Cuenta
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Completa tus datos para registrarte
              </Typography>
            </Stack>

            {mensaje && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {mensaje}
              </Alert>
            )}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Nombre"
                  name="nombre"
                  fullWidth
                  required
                  value={formData.nombre}
                  onChange={handleChange}
                />
                <TextField
                  label="Apellido"
                  name="apellido"
                  fullWidth
                  required
                  value={formData.apellido}
                  onChange={handleChange}
                />
                <TextField
                  label="Correo electrónico"
                  type="email"
                  name="email"
                  fullWidth
                  required
                  value={formData.email}
                  onChange={handleChange}
                />
                <TextField
                  label="Contraseña"
                  type="password"
                  name="password"
                  fullWidth
                  required
                  value={formData.password}
                  onChange={handleChange}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={cargando}
                >
                  {cargando ? 'Registrando...' : 'Registrarse'}
                </Button>
              </Stack>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5 }} textAlign="center">
              ¿Ya tienes cuenta?{' '}
              <Link component={RouterLink} to="/login" underline="hover">
                Inicia sesión
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default RegisterPage;