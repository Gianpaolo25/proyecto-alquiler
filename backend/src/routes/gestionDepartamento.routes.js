const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth.middleware');
const controller = require('../controllers/gestionDepartamento.controller');

router.get('/:departamentoId', verificarToken, controller.obtenerDetalleGestion);
router.post('/:departamentoId/comprobantes', verificarToken, controller.subirComprobante);
router.patch('/:departamentoId/boletas/:boletaId/estado', verificarToken, controller.actualizarEstadoBoleta);
router.patch('/:departamentoId/cuotas/:cuotaId/estado', verificarToken, controller.actualizarEstadoCuota);

router.post('/:departamentoId/servicios', verificarToken, controller.crearServicioDepartamento);
router.post('/:departamentoId/boletas', verificarToken, controller.crearBoletaServicio);
router.post('/:departamentoId/cuotas', verificarToken, controller.crearCuotaAlquiler);

router.patch('/:departamentoId/comprobantes/:comprobanteId/revision',verificarToken, controller.revisarComprobante);

module.exports = router;