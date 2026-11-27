import { useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
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

    api
      .post('/auth/verificar-email', { token })
      .then((res) => {
        if (!activo) return;
        setEstado('exito');
        setMensaje(
          res.data.mensaje || '¡Correo verificado con éxito! Ya puedes iniciar sesión.'
        );
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

  const severidadAlerta =
    estado === 'error' ? 'error' : estado === 'exito' ? 'success' : 'info';

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
          <CardContent sx={{ p: 3.5, textAlign: 'center' }}>
            <Stack spacing={2} alignItems="center">
              <MarkEmailReadIcon color="primary" fontSize="large" />
              <Typography variant="h5" component="h1" fontWeight={700}>
                Verificación de Cuenta
              </Typography>

              {estado === 'verificando' && <CircularProgress size={32} />}

              <Alert severity={severidadAlerta} sx={{ width: '100%', textAlign: 'left' }}>
                {mensaje}
              </Alert>

              {estado === 'exito' && (
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="contained"
                  size="large"
                  fullWidth
                >
                  Ir al Login
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default VerifyEmailPage;