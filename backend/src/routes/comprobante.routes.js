const express = require('express');
const router = express.Router();
const comprobanteController = require('../controllers/comprobante.controller');

router.get('/', comprobanteController.obtenerComprobantes);
router.get('/:id', comprobanteController.obtenerComprobantePorId);
router.post('/', comprobanteController.crearComprobante);
router.put('/:id', comprobanteController.actualizarComprobante);
router.delete('/:id', comprobanteController.eliminarComprobante);

module.exports = router;