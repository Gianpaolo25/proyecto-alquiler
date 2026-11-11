const express = require('express');
const router = express.Router();
const boletaController = require('../controllers/boleta.controller');

router.get('/', boletaController.obtenerBoletas);
router.get('/:id', boletaController.obtenerBoletaPorId);
router.post('/', boletaController.crearBoleta);
router.put('/:id', boletaController.actualizarBoleta);
router.delete('/:id', boletaController.eliminarBoleta);

module.exports = router;