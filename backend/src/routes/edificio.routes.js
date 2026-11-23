const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth.middleware');
const edificioController = require('../controllers/edificio.controller');

router.get('/', edificioController.obtenerEdificios);
router.get('/:id', edificioController.obtenerEdificioPorId);
router.post('/', verificarToken, edificioController.crearEdificio);
router.put('/:id', verificarToken, edificioController.actualizarEdificio);
router.delete('/:id', verificarToken, edificioController.eliminarEdificio);

module.exports = router;