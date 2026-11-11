const express = require('express');
const router = express.Router();
const edificioController = require('../controllers/edificio.controller');

router.get('/', edificioController.obtenerEdificios);
router.get('/:id', edificioController.obtenerEdificioPorId);
router.post('/', edificioController.crearEdificio);
router.put('/:id', edificioController.actualizarEdificio);
router.delete('/:id', edificioController.eliminarEdificio);

module.exports = router;