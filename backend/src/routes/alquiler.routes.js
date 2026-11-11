const express = require('express');
const router = express.Router();
const alquilerController = require('../controllers/alquiler.controller');

// Definir las rutas
router.get('/', alquilerController.obtenerAlquileres);     // GET /api/alquiler
router.post('/', alquilerController.crearAlquiler);   // POST /api/alquiler

module.exports = router;