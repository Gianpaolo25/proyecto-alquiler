const express = require('express');
const router = express.Router();
const dsController = require('../controllers/departamentoServicio.controller');

router.get('/', dsController.obtenerDepartamentoServicios);
router.get('/:id', dsController.obtenerDepartamentoServicioPorId);
router.post('/', dsController.crearDepartamentoServicio);
router.put('/:id', dsController.actualizarDepartamentoServicio);
router.delete('/:id', dsController.eliminarDepartamentoServicio);

module.exports = router;