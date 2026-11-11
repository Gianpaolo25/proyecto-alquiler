const express = require('express');
const router = express.Router();
const departamentoController = require('../controllers/departamento.controller');

router.get('/', departamentoController.obtenerDepartamentos);
router.get('/:id', departamentoController.obtenerDepartamentoPorId);
router.post('/', departamentoController.crearDepartamento);
router.put('/:id', departamentoController.actualizarDepartamento);
router.delete('/:id', departamentoController.eliminarDepartamento);

module.exports = router;