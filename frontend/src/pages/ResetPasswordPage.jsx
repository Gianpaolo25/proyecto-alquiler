import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
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
import LockResetIcon from '@mui/icons-material/LockReset';
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
              <LockResetIcon color="primary" fontSize="large" />
              <Typography variant="h5" component="h1" fontWeight={700}>
                Nueva Contraseña
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
                  label="Nueva contraseña"
                  type="password"
                  fullWidth
                  required
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                />
                <TextField
                  label="Confirmar nueva contraseña"
                  type="password"
                  fullWidth
                  required
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={cargando}
                >
                  {cargando ? 'Guardando...' : 'Restablecer contraseña'}
                </Button>
              </Stack>
            </Box>

            <Typography variant="body2" sx={{ mt: 2.5 }} textAlign="center">
              <Link component={RouterLink} to="/login" underline="hover">
                Volver al login
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default ResetPasswordPage;