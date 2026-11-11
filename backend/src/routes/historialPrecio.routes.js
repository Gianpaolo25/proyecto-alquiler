const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialPrecio.controller');

router.get('/', historialController.obtenerHistorialPrecios);
router.post('/', historialController.crearHistorialPrecio);

module.exports = router;