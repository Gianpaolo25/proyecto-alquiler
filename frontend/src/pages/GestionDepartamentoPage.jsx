import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import api from '../services/api';

function obtenerSesionGuardada() {
  const token = localStorage.getItem('token');
  const datosGuardados = localStorage.getItem('usuario');
  if (!token || !datosGuardados) return { token: null, usuario: null };
  try {
    return { token, usuario: JSON.parse(datosGuardados) };
  } catch {
    return { token: null, usuario: null };
  }
}

async function fetchDetalleDepartamento(departamentoId) {
  const res = await api.get(`/gestion-departamento/${departamentoId}`);
  return res.data;
}

function colorEstadoPago(estado) {
  if (estado === 'Pagada' || estado === 'aprobado') return 'success';
  if (estado === 'Vencida' || estado === 'rechazado') return 'error';
  return 'warning';
}

function GestionDepartamentoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [{ token, usuario }] = useState(obtenerSesionGuardada);

  const [detalle, setDetalle] = useState(null);
  const [feedback, setFeedback] = useState({ tipo: '', texto: '' });

  // Crear servicio
  const [servicioForm, setServicioForm] = useState({
    nombre: '',
    precio: '',
    frecuencia: 'Mensual',
    proveedor: '',
    identificador_cuenta: '',
  });

  // Crear boleta de servicio
  const [boletaForm, setBoletaForm] = useState({
    departamento_servicio_id: '',
    numero_boleta: '',
    periodo_desde: '',
    periodo_hasta: '',
    fecha_vencimiento: '',
    importe: '',
    moneda: 'ARS',
    archivo_boleta: '',
  });

  // Crear cuota de alquiler (Propietario)
  const [cuotaForm, setCuotaForm] = useState({
    periodo: new Date().toISOString().slice(0, 7) + '-01',
    fecha_vencimiento: '',
    importe: '',
    moneda: 'ARS',
  });

  // Modal subir comprobante (Inquilino)
  const [comprobanteForm, setComprobanteForm] = useState({
    abierto: false,
    tipoDestino: 'cuota', // 'cuota' | 'boleta'
    cuota_alquiler_id: '',
    boleta_servicio_id: '',
    fecha_pago_declarada: new Date().toISOString().slice(0, 10),
    importe_declarado: '',
    archivo_path: '',
    observacion: '',
  });

  const aplicarDetalle = (data) => {
    setDetalle(data);

    if (data.servicios?.length > 0) {
      setBoletaForm((prev) => {
        const existeActual = data.servicios.some(
          (s) => String(s.iddepartamento_servicio) === String(prev.departamento_servicio_id)
        );
        return {
          ...prev,
          departamento_servicio_id: existeActual
            ? prev.departamento_servicio_id
            : String(data.servicios[0].iddepartamento_servicio),
        };
      });
    }
  };

  useEffect(() => {
    if (!token || !usuario) {
      navigate('/login');
      return;
    }

    let activo = true;
    fetchDetalleDepartamento(id)
      .then((data) => {
        if (!activo) return;
        aplicarDetalle(data);
      })
      .catch((err) => {
        if (!activo) return;
        setFeedback({
          tipo: 'error',
          texto: err.response?.data?.error || 'Error al cargar el detalle del departamento',
        });
      });

    return () => {
      activo = false;
    };
  }, [id, token, usuario, navigate]);

  const abrirModalComprobanteCuota = (cuota) => {
    setComprobanteForm({
      abierto: true,
      tipoDestino: 'cuota',
      cuota_alquiler_id: String(cuota.idcuota_alquiler),
      boleta_servicio_id: '',
      fecha_pago_declarada: new Date().toISOString().slice(0, 10),
      importe_declarado: String(cuota.importe || ''),
      archivo_path: '',
      observacion: `Pago alquiler período ${cuota.periodo}`,
    });
  };

  const abrirModalComprobanteBoleta = (boleta) => {
    setComprobanteForm({
      abierto: true,
      tipoDestino: 'boleta',
      cuota_alquiler_id: '',
      boleta_servicio_id: String(boleta.idboleta_servicio),
      fecha_pago_declarada: new Date().toISOString().slice(0, 10),
      importe_declarado: String(boleta.importe || ''),
      archivo_path: '',
      observacion: `Pago boleta ${boleta.servicio_nombre} #${boleta.numero_boleta || boleta.idboleta_servicio}`,
    });
  };

  const handleCrearServicio = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.post(`/gestion-departamento/${id}/servicios`, servicioForm);
      setFeedback({ tipo: 'ok', texto: res.data.mensaje || 'Servicio creado.' });
      setServicioForm({
        nombre: '',
        precio: '',
        frecuencia: 'Mensual',
        proveedor: '',
        identificador_cuenta: '',
      });
      const actualizado = await fetchDetalleDepartamento(id);
      aplicarDetalle(actualizado);
    } catch (err) {
      setFeedback({ tipo: 'error', texto: err.response?.data?.error || 'Error al crear servicio' });
    }
  };

  const handleCrearBoleta = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.post(`/gestion-departamento/${id}/boletas`, boletaForm);
      setFeedback({ tipo: 'ok', texto: res.data.mensaje || 'Boleta creada.' });
      setBoletaForm((prev) => ({
        ...prev,
        numero_boleta: '',
        importe: '',
        archivo_boleta: '',
      }));
      const actualizado = await fetchDetalleDepartamento(id);
      aplicarDetalle(actualizado);
    } catch (err) {
      setFeedback({ tipo: 'error', texto: err.response?.data?.error || 'Error al crear boleta' });
    }
  };

  const handleCrearCuota = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.post(`/gestion-departamento/${id}/cuotas`, cuotaForm);
      setFeedback({ tipo: 'ok', texto: res.data.mensaje || 'Cuota creada.' });
      setCuotaForm((prev) => ({ ...prev, importe: '' }));
      const actualizado = await fetchDetalleDepartamento(id);
      aplicarDetalle(actualizado);
    } catch (err) {
      setFeedback({ tipo: 'error', texto: err.response?.data?.error || 'Error al crear cuota' });
    }
  };

  const handleSubirComprobante = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', texto: '' });

    const payload = {
      cuota_alquiler_id:
        comprobanteForm.tipoDestino === 'cuota' ? Number(comprobanteForm.cuota_alquiler_id) : null,
      boleta_servicio_id:
        comprobanteForm.tipoDestino === 'boleta' ? Number(comprobanteForm.boleta_servicio_id) : null,
      fecha_pago_declarada: comprobanteForm.fecha_pago_declarada,
      importe_declarado: comprobanteForm.importe_declarado,
      archivo_path: comprobanteForm.archivo_path || 'comprobante_pago.pdf',
      observacion: comprobanteForm.observacion || null,
    };

    try {
      const res = await api.post(`/gestion-departamento/${id}/comprobantes`, payload);
      setFeedback({ tipo: 'ok', texto: res.data.mensaje || 'Comprobante enviado.' });
      setComprobanteForm((prev) => ({
        ...prev,
        abierto: false,
        importe_declarado: '',
        archivo_path: '',
        observacion: '',
      }));
      const actualizado = await fetchDetalleDepartamento(id);
      aplicarDetalle(actualizado);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al subir comprobante',
      });
    }
  };

  const handleCambiarEstadoBoleta = async (boletaId, nuevoEstado) => {
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.patch(`/gestion-departamento/${id}/boletas/${boletaId}/estado`, {
        estado: nuevoEstado,
      });
      setFeedback({ tipo: 'ok', texto: res.data.mensaje });
      const actualizado = await fetchDetalleDepartamento(id);
      aplicarDetalle(actualizado);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al actualizar estado de boleta',
      });
    }
  };

  const handleCambiarEstadoCuota = async (cuotaId, nuevoEstado) => {
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.patch(`/gestion-departamento/${id}/cuotas/${cuotaId}/estado`, {
        estado: nuevoEstado,
      });
      setFeedback({ tipo: 'ok', texto: res.data.mensaje });
      const actualizado = await fetchDetalleDepartamento(id);
      aplicarDetalle(actualizado);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al actualizar estado de cuota',
      });
    }
  };

  const handleRevisarComprobante = async (comprobanteId, nuevoEstado) => {
    setFeedback({ tipo: '', texto: '' });
    try {
      const res = await api.patch(
        `/gestion-departamento/${id}/comprobantes/${comprobanteId}/revision`,
        { estado_revision: nuevoEstado }
      );
      setFeedback({ tipo: 'ok', texto: res.data.mensaje });
      const actualizado = await fetchDetalleDepartamento(id);
      aplicarDetalle(actualizado);
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al revisar el comprobante',
      });
    }
  };

  if (!token || !usuario) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
      <AppBar position="static" elevation={1}>
        <Toolbar sx={{ flexWrap: 'wrap', gap: 1, py: 1 }}>
          <Button
            component={RouterLink}
            to="/dashboard"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            size="small"
            sx={{ mr: 1 }}
          >
            Menú Principal
          </Button>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Gestión de Departamento
          </Typography>
          {detalle && <Chip label={`Rol: ${detalle.rol}`} color="secondary" size="small" />}
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

        {!detalle ? (
          <Card elevation={2}>
            <CardContent>
              <Typography>Cargando información del departamento...</Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={3}>
            {/* 1. Información detallada del departamento */}
            <Card elevation={2}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <HomeWorkIcon color="primary" />
                  <Typography variant="h5" fontWeight={700}>
                    {detalle.departamento.edificio_nombre} — Depto {detalle.departamento.identificador}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  <strong>Dirección:</strong> {detalle.departamento.edificio_direccion} |{' '}
                  <strong>Piso:</strong> {detalle.departamento.piso || '-'} |{' '}
                  <strong>Número:</strong> {detalle.departamento.numero || '-'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Tu rol en este departamento:</strong> {detalle.rol}
                </Typography>
                {detalle.departamento.alquiler_inicio && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    <strong>Contrato de alquiler:</strong> {detalle.departamento.alquiler_inicio} al{' '}
                    {detalle.departamento.alquiler_fin || 'Vigente'}
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* 2. Cuotas de Alquiler */}
            <Card elevation={2}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <ReceiptLongIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Cuotas de Alquiler
                  </Typography>
                </Stack>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Períodos Pagados ({detalle.cuotasPagadas.length})
                    </Typography>
                    {detalle.cuotasPagadas.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Sin cuotas pagadas registradas.
                      </Typography>
                    ) : (
                      <Stack spacing={1.5}>
                        {detalle.cuotasPagadas.map((c) => {
                          const compsCuota = detalle.comprobantes.filter(
                            (cp) => cp.cuota_alquiler_id === c.idcuota_alquiler
                          );
                          return (
                            <Box
                              key={c.idcuota_alquiler}
                              sx={{
                                p: 1.5,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                              }}
                            >
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                flexWrap="wrap"
                                gap={1}
                              >
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>
                                    Período {c.periodo} — {c.moneda} {c.importe}
                                  </Typography>
                                </Box>
                                <Chip label={c.estado} size="small" color={colorEstadoPago(c.estado)} />
                              </Stack>

                              {detalle.rol === 'Propietario' && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  sx={{ mt: 1 }}
                                  onClick={() => handleCambiarEstadoCuota(c.idcuota_alquiler, 'Pendiente')}
                                >
                                  Marcar Pendiente
                                </Button>
                              )}

                              {compsCuota.length > 0 && (
                                <Box sx={{ mt: 1, pl: 1.5, borderLeft: '2px solid', borderColor: 'divider' }}>
                                  {compsCuota.map((cp) => (
                                    <Typography key={cp.idcomprobante_pago} variant="caption" display="block" color="text.secondary">
                                      Comprobante: {cp.archivo_path} — ${cp.importe_declarado} ({cp.estado_revision})
                                    </Typography>
                                  ))}
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    )}
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Períodos Adeudados / Pendientes ({detalle.cuotasPendientes.length})
                    </Typography>
                    {detalle.cuotasPendientes.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No hay cuotas pendientes.
                      </Typography>
                    ) : (
                      <Stack spacing={1.5}>
                        {detalle.cuotasPendientes.map((c) => {
                          const compsCuota = detalle.comprobantes.filter(
                            (cp) => cp.cuota_alquiler_id === c.idcuota_alquiler
                          );
                          return (
                            <Box
                              key={c.idcuota_alquiler}
                              sx={{
                                p: 1.5,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                              }}
                            >
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                flexWrap="wrap"
                                gap={1}
                              >
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>
                                    Período {c.periodo} — {c.moneda} {c.importe}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Vence: {c.fecha_vencimiento || '-'}
                                  </Typography>
                                </Box>
                                <Chip label={c.estado} size="small" color={colorEstadoPago(c.estado)} />
                              </Stack>

                              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                                {detalle.rol === 'Inquilino' && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<UploadFileIcon />}
                                    onClick={() => abrirModalComprobanteCuota(c)}
                                  >
                                    Pagar alquiler / Subir comprobante
                                  </Button>
                                )}
                                {detalle.rol === 'Propietario' && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                    onClick={() => handleCambiarEstadoCuota(c.idcuota_alquiler, 'Pagada')}
                                  >
                                    Marcar Pagada
                                  </Button>
                                )}
                              </Stack>

                              {compsCuota.length > 0 && (
                                <Box sx={{ mt: 1, pl: 1.5, borderLeft: '2px solid', borderColor: 'divider' }}>
                                  {compsCuota.map((cp) => (
                                    <Typography key={cp.idcomprobante_pago} variant="caption" display="block" color="text.secondary">
                                      Comprobante: {cp.archivo_path} — ${cp.importe_declarado} ({cp.estado_revision})
                                    </Typography>
                                  ))}
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    )}
                  </Grid>
                </Grid>

                {detalle.rol === 'Propietario' && (
                  <Box component="form" onSubmit={handleCrearCuota} sx={{ mt: 3 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Nueva Cuota de Alquiler
                    </Typography>
                    <Grid container spacing={1.5} alignItems="center">
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          label="Período"
                          type="date"
                          size="small"
                          fullWidth
                          required
                          slotProps={{ inputLabel: { shrink: true } }}
                          value={cuotaForm.periodo}
                          onChange={(e) => setCuotaForm({ ...cuotaForm, periodo: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          label="Vencimiento"
                          type="date"
                          size="small"
                          fullWidth
                          slotProps={{ inputLabel: { shrink: true } }}
                          value={cuotaForm.fecha_vencimiento}
                          onChange={(e) =>
                            setCuotaForm({ ...cuotaForm, fecha_vencimiento: e.target.value })
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 2 }}>
                        <TextField
                          label="Importe"
                          type="number"
                          size="small"
                          fullWidth
                          required
                          slotProps={{ htmlInput: { step: '0.01' } }}
                          value={cuotaForm.importe}
                          onChange={(e) => setCuotaForm({ ...cuotaForm, importe: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 2 }}>
                        <Button type="submit" variant="contained" fullWidth>
                          Agregar Cuota
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* 3. Servicios y Boletas de Servicios */}
            <Card elevation={2}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <MiscellaneousServicesIcon color="secondary" />
                  <Typography variant="h6" fontWeight={600}>
                    Servicios del Departamento
                  </Typography>
                </Stack>

                {detalle.servicios.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No hay servicios asociados a este departamento.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {detalle.servicios.map((s) => (
                      <Box
                        key={s.iddepartamento_servicio}
                        sx={{ p: 1.2, bgcolor: 'action.hover', borderRadius: 2 }}
                      >
                        <Typography variant="body2">
                          <strong>{s.servicio_nombre}</strong> — Periodicidad / Precio:{' '}
                          <em>{s.tipo_de_servicio || '-'}</em> | Proveedor: {s.proveedor || '-'} |
                          Cuenta: {s.identificador_cuenta || '-'}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}

                <Box component="form" onSubmit={handleCrearServicio} sx={{ mt: 2.5 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Nuevo Servicio
                  </Typography>
                  <Grid container spacing={1.5} alignItems="center">
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <TextField
                        label="Nombre (ej. Luz, Agua)"
                        size="small"
                        fullWidth
                        required
                        value={servicioForm.nombre}
                        onChange={(e) => setServicioForm({ ...servicioForm, nombre: e.target.value })}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                      <TextField
                        label="Precio"
                        type="number"
                        size="small"
                        fullWidth
                        slotProps={{ htmlInput: { step: '0.01' } }}
                        value={servicioForm.precio}
                        onChange={(e) => setServicioForm({ ...servicioForm, precio: e.target.value })}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <TextField
                        select
                        label="Frecuencia de pago"
                        size="small"
                        fullWidth
                        value={servicioForm.frecuencia}
                        onChange={(e) =>
                          setServicioForm({ ...servicioForm, frecuencia: e.target.value })
                        }
                      >
                        <MenuItem value="Mensual">Cada mes (Mensual)</MenuItem>
                        <MenuItem value="Bimestral">Cada 2 meses (Bimestral)</MenuItem>
                        <MenuItem value="Trimestral">Cada 3 meses (Trimestral)</MenuItem>
                        <MenuItem value="Anual">Anual</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                      <TextField
                        label="Proveedor"
                        size="small"
                        fullWidth
                        value={servicioForm.proveedor}
                        onChange={(e) =>
                          setServicioForm({ ...servicioForm, proveedor: e.target.value })
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <Button type="submit" variant="contained" color="secondary" fullWidth>
                        Crear Servicio
                      </Button>
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Boletas de Servicios (Pendientes y Pagadas)
                </Typography>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Boletas Pendientes / Vencidas ({detalle.boletasPendientes.length})
                    </Typography>
                    {detalle.boletasPendientes.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No hay boletas pendientes.
                      </Typography>
                    ) : (
                      <Stack spacing={1.5}>
                        {detalle.boletasPendientes.map((b) => (
                          <Box
                            key={b.idboleta_servicio}
                            sx={{
                              p: 1.5,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 2,
                            }}
                          >
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              flexWrap="wrap"
                              gap={1}
                            >
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {b.servicio_nombre} #{b.numero_boleta || b.idboleta_servicio} —{' '}
                                  {b.moneda} {b.importe}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Vence: {b.fecha_vencimiento || '-'}
                                </Typography>
                              </Box>
                              <Chip label={b.estado} size="small" color={colorEstadoPago(b.estado)} />
                            </Stack>

                            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                              {detalle.rol === 'Inquilino' && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => abrirModalComprobanteBoleta(b)}
                                >
                                  Subir comprobante boleta
                                </Button>
                              )}
                              {detalle.rol === 'Propietario' && (
                                <>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                    onClick={() =>
                                      handleCambiarEstadoBoleta(b.idboleta_servicio, 'Pagada')
                                    }
                                  >
                                    Pagada
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    onClick={() =>
                                      handleCambiarEstadoBoleta(b.idboleta_servicio, 'Vencida')
                                    }
                                  >
                                    Vencida
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    onClick={() =>
                                      handleCambiarEstadoBoleta(b.idboleta_servicio, 'Pendiente')
                                    }
                                  >
                                    Pendiente
                                  </Button>
                                </>
                              )}
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Boletas Pagadas ({detalle.boletasPagadas.length})
                    </Typography>
                    {detalle.boletasPagadas.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No hay boletas pagadas.
                      </Typography>
                    ) : (
                      <Stack spacing={1.5}>
                        {detalle.boletasPagadas.map((b) => (
                          <Box
                            key={b.idboleta_servicio}
                            sx={{
                              p: 1.5,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 2,
                            }}
                          >
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              flexWrap="wrap"
                              gap={1}
                            >
                              <Typography variant="body2" fontWeight={600}>
                                {b.servicio_nombre} #{b.numero_boleta || b.idboleta_servicio} —{' '}
                                {b.moneda} {b.importe}
                              </Typography>
                              <Chip label={b.estado} size="small" color={colorEstadoPago(b.estado)} />
                            </Stack>

                            {detalle.rol === 'Propietario' && (
                              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="warning"
                                  onClick={() =>
                                    handleCambiarEstadoBoleta(b.idboleta_servicio, 'Pendiente')
                                  }
                                >
                                  Marcar Pendiente
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() =>
                                    handleCambiarEstadoBoleta(b.idboleta_servicio, 'Vencida')
                                  }
                                >
                                  Marcar Vencida
                                </Button>
                              </Stack>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Grid>
                </Grid>

                {detalle.servicios.length > 0 && (
                  <Box component="form" onSubmit={handleCrearBoleta} sx={{ mt: 3 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Nueva Boleta de Servicio
                    </Typography>
                    <Grid container spacing={1.5} alignItems="center">
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                          select
                          label="Servicio"
                          size="small"
                          fullWidth
                          required
                          value={boletaForm.departamento_servicio_id}
                          onChange={(e) =>
                            setBoletaForm({ ...boletaForm, departamento_servicio_id: e.target.value })
                          }
                        >
                          {detalle.servicios.map((s) => (
                            <MenuItem
                              key={s.iddepartamento_servicio}
                              value={String(s.iddepartamento_servicio)}
                            >
                              {s.servicio_nombre}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <TextField
                          label="N° boleta"
                          size="small"
                          fullWidth
                          value={boletaForm.numero_boleta}
                          onChange={(e) =>
                            setBoletaForm({ ...boletaForm, numero_boleta: e.target.value })
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <TextField
                          label="Importe"
                          type="number"
                          size="small"
                          fullWidth
                          required
                          slotProps={{ htmlInput: { step: '0.01' } }}
                          value={boletaForm.importe}
                          onChange={(e) => setBoletaForm({ ...boletaForm, importe: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <TextField
                          label="Vencimiento"
                          type="date"
                          size="small"
                          fullWidth
                          slotProps={{ inputLabel: { shrink: true } }}
                          value={boletaForm.fecha_vencimiento}
                          onChange={(e) =>
                            setBoletaForm({ ...boletaForm, fecha_vencimiento: e.target.value })
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                        <TextField
                          label="Archivo"
                          size="small"
                          fullWidth
                          value={boletaForm.archivo_boleta}
                          onChange={(e) =>
                            setBoletaForm({ ...boletaForm, archivo_boleta: e.target.value })
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                        <Button type="submit" variant="contained" fullWidth>
                          Registrar
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* 4. Historial general de comprobantes */}
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Todos los Comprobantes Cargados
                </Typography>
                {detalle.comprobantes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No hay comprobantes cargados aún.
                  </Typography>
                ) : (
                  <Stack divider={<Divider flexItem />} spacing={1.5}>
                    {detalle.comprobantes.map((cp) => (
                      <Box
                        key={cp.idcomprobante_pago}
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
                              ${cp.importe_declarado} — Pago: {cp.fecha_pago_declarada}
                            </Typography>
                            <Chip
                              label={cp.estado_revision}
                              size="small"
                              color={colorEstadoPago(cp.estado_revision)}
                            />
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Archivo: {cp.archivo_path}
                            {cp.observacion ? ` (${cp.observacion})` : ''}
                          </Typography>
                        </Box>

                        {detalle.rol === 'Propietario' && cp.estado_revision === 'pendiente' && (
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() =>
                                handleRevisarComprobante(cp.idcomprobante_pago, 'aprobado')
                              }
                            >
                              Aprobar
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() =>
                                handleRevisarComprobante(cp.idcomprobante_pago, 'rechazado')
                              }
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
          </Stack>
        )}
      </Container>

      {/* Modal Dialog para subir comprobante de pago (Inquilino) */}
      <Dialog
        open={Boolean(detalle?.rol === 'Inquilino' && comprobanteForm.abierto)}
        onClose={() => setComprobanteForm((prev) => ({ ...prev, abierto: false }))}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Subir Comprobante de Pago (
          {comprobanteForm.tipoDestino === 'cuota' ? 'Cuota de Alquiler' : 'Boleta de Servicio'})
        </DialogTitle>
        <Box component="form" onSubmit={handleSubirComprobante}>
          <DialogContent>
            <Stack spacing={2}>
              <TextField
                label="Fecha de pago declarada"
                type="date"
                size="small"
                fullWidth
                required
                slotProps={{ inputLabel: { shrink: true } }}
                value={comprobanteForm.fecha_pago_declarada}
                onChange={(e) =>
                  setComprobanteForm({ ...comprobanteForm, fecha_pago_declarada: e.target.value })
                }
              />
              <TextField
                label="Importe abonado"
                type="number"
                size="small"
                fullWidth
                required
                slotProps={{ htmlInput: { step: '0.01' } }}
                value={comprobanteForm.importe_declarado}
                onChange={(e) =>
                  setComprobanteForm({ ...comprobanteForm, importe_declarado: e.target.value })
                }
              />
              <TextField
                label="Nombre o referencia del comprobante (ej. comprobante_enero.pdf)"
                size="small"
                fullWidth
                required
                value={comprobanteForm.archivo_path}
                onChange={(e) =>
                  setComprobanteForm({ ...comprobanteForm, archivo_path: e.target.value })
                }
              />
              <TextField
                label="Observación opcional"
                size="small"
                fullWidth
                value={comprobanteForm.observacion}
                onChange={(e) =>
                  setComprobanteForm({ ...comprobanteForm, observacion: e.target.value })
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              type="button"
              onClick={() => setComprobanteForm((prev) => ({ ...prev, abierto: false }))}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="contained">
              Guardar Comprobante
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}

export default GestionDepartamentoPage;