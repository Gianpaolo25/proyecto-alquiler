import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
import LockOpenIcon from '@mui/icons-material/LockOpen';
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
              <LockOpenIcon color="primary" fontSize="large" />
              <Typography variant="h5" component="h1" fontWeight={700}>
                Iniciar Sesión
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Ingresa tus credenciales para acceder al sistema
              </Typography>
            </Stack>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Correo electrónico"
                  type="email"
                  fullWidth
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                  label="Contraseña"
                  type="password"
                  fullWidth
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={cargando}
                >
                  {cargando ? 'Ingresando...' : 'Ingresar'}
                </Button>
              </Stack>
            </Box>

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={1}
              sx={{ mt: 2.5 }}
            >
              <Link component={RouterLink} to="/forgot-password" variant="body2" underline="hover">
                ¿Olvidaste tu contraseña?
              </Link>
              <Link component={RouterLink} to="/register" variant="body2" underline="hover">
                Crear cuenta
              </Link>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default LoginPage;