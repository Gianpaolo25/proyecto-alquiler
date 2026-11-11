const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Importar rutas
const usuariosRoutes = require('./src/routes/usuario.routes');
const alquileresRoutes = require('./src/routes/alquiler.routes');
const edificiosRoutes = require('./src/routes/edificio.routes');
const departamentosRoutes = require('./src/routes/departamento.routes');
const solicitudesRoutes = require('./src/routes/solicitud.routes');
const boletasRoutes = require('./src/routes/boleta.routes');

// Usar rutas
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/alquileres', alquilerRoutes);
app.use('/api/edificios', edificioRoutes);
app.use('/api/departamentos', departamentoRoutes);
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/boletas', boletaRoutes);

app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Sistema de Alquiler funcionando correctamente' });
});

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});