const express = require('express');
const router = express.Router();
const cuotaController = require('../controllers/cuota.controller');

router.get('/', cuotaController.obtenerCuotas);
router.get('/:id', cuotaController.obtenerCuotaPorId);
router.post('/', cuotaController.crearCuota);
router.put('/:id', cuotaController.actualizarCuota);
router.delete('/:id', cuotaController.eliminarCuota);

module.exports = router;