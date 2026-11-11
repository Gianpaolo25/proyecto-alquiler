const express = require('express');
const router = express.Router();
const titularidadController = require('../controllers/titularidad.controller');

router.get('/', titularidadController.obtenerTitularidades);
router.post('/', titularidadController.crearTitularidad);

module.exports = router;