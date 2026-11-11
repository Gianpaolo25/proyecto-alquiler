const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Importar rutas
const usuarioRoutes = require('./src/routes/usuario.routes');
const alquilerRoutes = require('./src/routes/alquiler.routes');
const edificioRoutes = require('./src/routes/edificio.routes');
const departamentoRoutes = require('./src/routes/departamento.routes');
const solicitudRoutes = require('./src/routes/solicitud.routes');
const boletaRoutes = require('./src/routes/boleta.routes');
const cuotaRoutes = require('./src/routes/cuota.routes');
const comprobanteRoutes = require('./src/routes/comprobante.routes');
const rolRoutes = require('./src/routes/rol.routes');
const historialRoutes = require('./src/routes/historialPrecio.routes');
const titularidadRoutes = require('./src/routes/titularidad.routes');
const codigoRoutes = require('./src/routes/codigoVinculacion.routes');
const servicioRoutes = require('./src/routes/servicio.routes');
const usuarioRolRoutes = require('./src/routes/usuarioRol.routes');
const departamentoServicioRoutes = require('./src/routes/departamentoServicio.routes');

// Usar rutas
app.use('/api/usuario', usuarioRoutes);
app.use('/api/alquiler', alquilerRoutes);
app.use('/api/edificio', edificioRoutes);
app.use('/api/departamento', departamentoRoutes);
app.use('/api/solicitud', solicitudRoutes);
app.use('/api/boleta', boletaRoutes);
app.use('/api/cuota', cuotaRoutes);
app.use('/api/comprobante', comprobanteRoutes);
app.use('/api/rol', rolRoutes);
app.use('/api/historialPrecio', historialRoutes);
app.use('/api/titularidad', titularidadRoutes);
app.use('/api/codigoVinculacion', codigoRoutes);
app.use('/api/servicio', servicioRoutes);
app.use('/api/usuarioRol', usuarioRolRoutes);
app.use('/api/departamentoServicio', departamentoServicioRoutes);

app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Sistema de Alquiler funcionando correctamente' });
});

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});