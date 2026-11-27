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
import KeyIcon from '@mui/icons-material/Key';
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
            <Stack spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <KeyIcon color="primary" fontSize="large" />
              <Typography variant="h5" component="h1" fontWeight={700}>
                Recuperar Contraseña
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
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
                  label="Tu correo registrado"
                  type="email"
                  fullWidth
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={cargando}
                >
                  {cargando ? 'Enviando...' : 'Enviar enlace'}
                </Button>
              </Stack>
            </Box>

            <Typography variant="body2" sx={{ mt: 2.5 }} textAlign="center">
              <Link component={RouterLink} to="/login" underline="hover">
                Volver al inicio de sesión
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default ForgotPasswordPage;