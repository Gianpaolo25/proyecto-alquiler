import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import ApartmentIcon from '@mui/icons-material/Apartment';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import SendIcon from '@mui/icons-material/Send';
import api from '../services/api';

function obtenerSesionGuardada() {
  const token = localStorage.getItem('token');
  const datosGuardados = localStorage.getItem('usuario');

  if (!token || !datosGuardados) {
    return { token: null, usuario: null };
  }

  try {
    return { token, usuario: JSON.parse(datosGuardados) };
  } catch {
    return { token: null, usuario: null };
  }
}

async function fetchDatosPanel() {
  const [resEdif, resDeptos, resMisDeptos, resInv] = await Promise.all([
    api.get('/edificio'),
    api.get('/departamento'),
    api.get('/mis-departamentos'),
    api.get('/invitaciones/recibidas'),
  ]);

  return {
    edificio: resEdif.data,
    departamento: resDeptos.data,
    misDepartamentos: resMisDeptos.data,
    invitaciones: resInv.data,
  };
}

function colorEstadoInvitacion(estado) {
  if (estado === 'Aceptada') return 'success';
  if (estado === 'Rechazada') return 'error';
  return 'warning';
}

function DashboardPage() {
  const [{ token, usuario }] = useState(obtenerSesionGuardada);
  const navigate = useNavigate();

  const [edificio, setEdificio] = useState([]);
  const [departamento, setDepartamento] = useState([]);
  const [misDepartamentos, setMisDepartamentos] = useState({ propietario: [], inquilino: [] });
  const [invitaciones, setInvitaciones] = useState([]);

  const [edificioForm, setEdificioForm] = useState({ nombre: '', direccion: '' });
  const [deptoForm, setDeptoForm] = useState({
    edificio_id: '',
    identificador: '',
    piso: '',
    numero: '',
  });
  const [propietarioForm, setPropietarioForm] = useState({
    departamento_id: '',
    fecha_desde: new Date().toISOString().slice(0, 10),
  });
  const [invitacionForm, setInvitacionForm] = useState({
    departamento_id: '',
    email_invitado: '',
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin: '',
    importe_mensual: '',
    moneda: 'ARS',
    mensaje: '',
  });

  const [feedback, setFeedback] = useState({ tipo: '', texto: '' });

  const aplicarDatosPanel = (data) => {
    setEdificio(data.edificio);
    setDepartamento(data.departamento);
    setMisDepartamentos(data.misDepartamentos);
    setInvitaciones(data.invitaciones);

    if (data.edificio.length > 0) {
      setDeptoForm((prev) => ({
        ...prev,
        edificio_id: prev.edificio_id || String(data.edificio[0].idedificio),
      }));
    }
    if (data.departamento.length > 0) {
      setPropietarioForm((prev) => ({
        ...prev,
        departamento_id: prev.departamento_id || String(data.departamento[0].iddepartamento),
      }));
    }
    if (data.misDepartamentos.propietario?.length > 0) {
      setInvitacionForm((prev) => ({
        ...prev,
        departamento_id:
          prev.departamento_id || String(data.misDepartamentos.propietario[0].iddepartamento),
      }));
    }
  };

  useEffect(() => {
    if (!token || !usuario) {
      navigate('/login');
      return;
    }

    let activo = true;

    fetchDatosPanel()
      .then((data) => {
        if (!activo) return;
        aplicarDatosPanel(data);
      })
      .catch((err) => {
        if (!activo) return;
        setFeedback({
          tipo: 'error',
          texto: err.response?.data?.error || 'Error al cargar los datos del panel',
        });
      });

    return () => {
      activo = false;
    };
  }, [token, usuario, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const handleCrearEdificio = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });
    try {
      await api.post('/edificio', edificioForm);
      setEdificioForm({ nombre: '', direccion: '' });
      setFeedback({ tipo: 'ok', texto: 'Edificio registrado con éxito.' });
      const datosActualizados = await fetchDatosPanel();
      aplicarDatosPanel(datosActualizados);
    } catch (err) {
      setFeedback({ tipo: 'error', texto: err.response?.data?.error || 'Error al crear edificio' });
    }
  };

  const handleCrearDepartamento = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });
    try {
      await api.post('/departamento', deptoForm);
      setDeptoForm((prev) => ({ ...prev, identificador: '', piso: '', numero: '' }));
      setFeedback({ tipo: 'ok', texto: 'Departamento registrado con éxito.' });
      const datosActualizados = await fetchDatosPanel();
      aplicarDatosPanel(datosActualizados);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al crear departamento',
      });
    }
  };

  const handleRegistrarPropietario = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });
    try {
      await api.post('/mis-departamentos/propietario', propietarioForm);
      setFeedback({ tipo: 'ok', texto: 'Ahora figuras como propietario del departamento.' });
      const datosActualizados = await fetchDatosPanel();
      aplicarDatosPanel(datosActualizados);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al registrar titularidad',
      });
    }
  };

  const handleEnviarInvitacion = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.post('/invitaciones', invitacionForm);
      setInvitacionForm((prev) => ({ ...prev, email_invitado: '', mensaje: '' }));
      setFeedback({ tipo: 'ok', texto: res.data.mensaje || 'Invitación enviada.' });
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al enviar invitación',
      });
    }
  };

  const handleAceptarInvitacion = async (idSolicitud) => {
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.post(`/invitaciones/${idSolicitud}/aceptar`, {});
      setFeedback({
        tipo: 'ok',
        texto: res.data.mensaje || 'Invitación aceptada. Ya eres inquilino.',
      });
      const datosActualizados = await fetchDatosPanel();
      aplicarDatosPanel(datosActualizados);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al aceptar la invitación',
      });
    }
  };

  const handleRechazarInvitacion = async (idSolicitud) => {
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.post(`/invitaciones/${idSolicitud}/rechazar`, {});
      setFeedback({
        tipo: 'ok',
        texto: res.data.mensaje || 'Invitación rechazada.',
      });
      const datosActualizados = await fetchDatosPanel();
      aplicarDatosPanel(datosActualizados);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al rechazar la invitación',
      });
    }
  };

  if (!token || !usuario) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
      <AppBar position="static" elevation={1}>
        <Toolbar sx={{ flexWrap: 'wrap', gap: 1, py: 1 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Menú Principal
          </Typography>
          <Typography variant="body2" sx={{ mr: 1, opacity: 0.95 }}>
            {usuario.nombre} {usuario.apellido} ({usuario.email})
          </Typography>
          <Button
            color="inherit"
            variant="outlined"
            size="small"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ borderColor: 'rgba(255,255,255,0.5)' }}
          >
            Cerrar sesión
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {feedback.texto && (
          <Alert
            severity={feedback.tipo === 'error' ? 'error' : 'success'}
            onClose={() => setFeedback({ tipo: '', texto: '' })}
            sx={{ mb: 3 }}
          >
            {feedback.texto}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* 1A. Registrar Edificio */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <ApartmentIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    1A. Registrar Edificio
                  </Typography>
                </Stack>
                <Box component="form" onSubmit={handleCrearEdificio}>
                  <Stack spacing={2}>
                    <TextField
                      label="Nombre del edificio"
                      size="small"
                      fullWidth
                      required
                      value={edificioForm.nombre}
                      onChange={(e) => setEdificioForm({ ...edificioForm, nombre: e.target.value })}
                    />
                    <TextField
                      label="Dirección"
                      size="small"
                      fullWidth
                      required
                      value={edificioForm.direccion}
                      onChange={(e) => setEdificioForm({ ...edificioForm, direccion: e.target.value })}
                    />
                    <Button type="submit" variant="contained" fullWidth>
                      Guardar Edificio
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 1B. Registrar Departamento */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <HomeWorkIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    1B. Registrar Departamento
                  </Typography>
                </Stack>
                <Box component="form" onSubmit={handleCrearDepartamento}>
                  <Stack spacing={2}>
                    <TextField
                      select
                      label="Edificio"
                      size="small"
                      fullWidth
                      required
                      value={deptoForm.edificio_id}
                      onChange={(e) => setDeptoForm({ ...deptoForm, edificio_id: e.target.value })}
                    >
                      <MenuItem value="">Selecciona un edificio...</MenuItem>
                      {edificio.map((ed) => (
                        <MenuItem key={ed.idedificio} value={String(ed.idedificio)}>
                          {ed.nombre} ({ed.direccion})
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      label="Identificador (ej. 2B, Depto 101)"
                      size="small"
                      fullWidth
                      required
                      value={deptoForm.identificador}
                      onChange={(e) => setDeptoForm({ ...deptoForm, identificador: e.target.value })}
                    />

                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          label="Piso"
                          size="small"
                          fullWidth
                          value={deptoForm.piso}
                          onChange={(e) => setDeptoForm({ ...deptoForm, piso: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          label="Número"
                          size="small"
                          fullWidth
                          value={deptoForm.numero}
                          onChange={(e) => setDeptoForm({ ...deptoForm, numero: e.target.value })}
                        />
                      </Grid>
                    </Grid>

                    <Button type="submit" variant="contained" fullWidth>
                      Guardar Departamento
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 2. Registrarme como Propietario */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  2. Registrarme como Propietario
                </Typography>
                <Box component="form" onSubmit={handleRegistrarPropietario}>
                  <Stack spacing={2}>
                    <TextField
                      select
                      label="Departamento"
                      size="small"
                      fullWidth
                      required
                      value={propietarioForm.departamento_id}
                      onChange={(e) =>
                        setPropietarioForm({ ...propietarioForm, departamento_id: e.target.value })
                      }
                    >
                      <MenuItem value="">Selecciona un departamento...</MenuItem>
                      {departamento.map((d) => (
                        <MenuItem key={d.iddepartamento} value={String(d.iddepartamento)}>
                          {d.edificio_nombre} - {d.identificador}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      label="Fecha desde"
                      type="date"
                      size="small"
                      fullWidth
                      required
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={propietarioForm.fecha_desde}
                      onChange={(e) =>
                        setPropietarioForm({ ...propietarioForm, fecha_desde: e.target.value })
                      }
                    />

                    <Button type="submit" variant="contained" color="secondary" fullWidth>
                      Asignarme como Propietario
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 3. Invitar Inquilino por Email */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <SendIcon color="secondary" />
                  <Typography variant="h6" fontWeight={600}>
                    3. Invitar Inquilino por Email (Propietario)
                  </Typography>
                </Stack>
                <Box component="form" onSubmit={handleEnviarInvitacion}>
                  <Stack spacing={2}>
                    <TextField
                      select
                      label="Tu departamento como propietario"
                      size="small"
                      fullWidth
                      required
                      value={invitacionForm.departamento_id}
                      onChange={(e) =>
                        setInvitacionForm({ ...invitacionForm, departamento_id: e.target.value })
                      }
                    >
                      <MenuItem value="">Selecciona uno de tus departamentos...</MenuItem>
                      {misDepartamentos.propietario.map((d) => (
                        <MenuItem key={d.iddepartamento} value={String(d.iddepartamento)}>
                          {d.edificio_nombre} - {d.identificador}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      label="Email del usuario registrado"
                      type="email"
                      size="small"
                      fullWidth
                      required
                      value={invitacionForm.email_invitado}
                      onChange={(e) =>
                        setInvitacionForm({ ...invitacionForm, email_invitado: e.target.value })
                      }
                    />

                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Desde"
                          type="date"
                          size="small"
                          fullWidth
                          required
                          slotProps={{ inputLabel: { shrink: true } }}
                          value={invitacionForm.fecha_inicio}
                          onChange={(e) =>
                            setInvitacionForm({ ...invitacionForm, fecha_inicio: e.target.value })
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Hasta"
                          type="date"
                          size="small"
                          fullWidth
                          slotProps={{ inputLabel: { shrink: true } }}
                          value={invitacionForm.fecha_fin}
                          onChange={(e) =>
                            setInvitacionForm({ ...invitacionForm, fecha_fin: e.target.value })
                          }
                        />
                      </Grid>
                    </Grid>

                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 8, sm: 9 }}>
                        <TextField
                          label="Valor cuota mensual"
                          type="number"
                          size="small"
                          fullWidth
                          required
                          slotProps={{ htmlInput: { step: '0.01' } }}
                          value={invitacionForm.importe_mensual}
                          onChange={(e) =>
                            setInvitacionForm({ ...invitacionForm, importe_mensual: e.target.value })
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 4, sm: 3 }}>
                        <TextField
                          label="Moneda"
                          size="small"
                          fullWidth
                          slotProps={{ htmlInput: { maxLength: 3 } }}
                          value={invitacionForm.moneda}
                          onChange={(e) =>
                            setInvitacionForm({ ...invitacionForm, moneda: e.target.value })
                          }
                        />
                      </Grid>
                    </Grid>

                    <TextField
                      label="Mensaje opcional para el inquilino"
                      size="small"
                      fullWidth
                      value={invitacionForm.mensaje}
                      onChange={(e) =>
                        setInvitacionForm({ ...invitacionForm, mensaje: e.target.value })
                      }
                    />

                    <Button type="submit" variant="contained" color="secondary" fullWidth>
                      Enviar Invitación de Alquiler
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 4. Mis Departamentos y Gestión */}
          <Grid size={{ xs: 12 }}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  4. Mis Departamentos y Gestión
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Como Propietario
                    </Typography>
                    {misDepartamentos.propietario.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No tienes departamentos registrados como propietario.
                      </Typography>
                    ) : (
                      <Stack spacing={1.5}>
                        {misDepartamentos.propietario.map((d) => (
                          <Box
                            key={`prop-${d.iddepartamento}`}
                            sx={{
                              p: 1.5,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 2,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 1,
                            }}
                          >
                            <Typography variant="body2">
                              <strong>{d.edificio_nombre}</strong> — Depto {d.identificador}
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => navigate(`/gestion-departamento/${d.iddepartamento}`)}
                            >
                              Gestionar
                            </Button>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Como Inquilino
                    </Typography>
                    {misDepartamentos.inquilino.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No figuras como inquilino en ningún departamento aún.
                      </Typography>
                    ) : (
                      <Stack spacing={1.5}>
                        {misDepartamentos.inquilino.map((d) => (
                          <Box
                            key={`inq-${d.iddepartamento}`}
                            sx={{
                              p: 1.5,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 2,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 1,
                            }}
                          >
                            <Typography variant="body2">
                              <strong>{d.edificio_nombre}</strong> — Depto {d.identificador}
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => navigate(`/gestion-departamento/${d.iddepartamento}`)}
                            >
                              Gestionar
                            </Button>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 5. Invitaciones de Alquiler Recibidas */}
          <Grid size={{ xs: 12 }}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  5. Invitaciones de Alquiler Recibidas
                </Typography>
                {invitaciones.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No tienes invitaciones de alquiler.
                  </Typography>
                ) : (
                  <Stack divider={<Divider flexItem />} spacing={1.5}>
                    {invitaciones.map((inv) => (
                      <Box
                        key={inv.idsolicitud_alquiler}
                        sx={{
                          py: 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="subtitle2" fontWeight={700}>
                              {inv.edificio_nombre} — Depto {inv.identificador}
                            </Typography>
                            <Chip
                              label={inv.estado}
                              size="small"
                              color={colorEstadoInvitacion(inv.estado)}
                            />
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Invita: {inv.propietario_nombre} {inv.propietario_apellido} (
                            {inv.propietario_email})
                            {inv.mensaje ? ` — "${inv.mensaje}"` : ''}
                          </Typography>
                        </Box>

                        {inv.estado === 'Pendiente' && (
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              onClick={() => handleAceptarInvitacion(inv.idsolicitud_alquiler)}
                            >
                              Aceptar
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => handleRechazarInvitacion(inv.idsolicitud_alquiler)}
                            >
                              Rechazar
                            </Button>
                          </Stack>
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default DashboardPage;