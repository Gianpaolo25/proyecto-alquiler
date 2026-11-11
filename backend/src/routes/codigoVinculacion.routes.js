const express = require('express');
const router = express.Router();
const codigoController = require('../controllers/codigoVinculacion.controller');

router.get('/', codigoController.obtenerCodigos);
router.post('/', codigoController.crearCodigo);

module.exports = router;