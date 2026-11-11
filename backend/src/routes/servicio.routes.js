const express = require('express');
const router = express.Router();
const servicioController = require('../controllers/servicio.controller');

router.get('/', servicioController.obtenerServicios);
router.post('/', servicioController.crearServicio);
router.get('/departamento', servicioController.obtenerDepartamentoServicios);
router.post('/departamento', servicioController.crearDepartamentoServicio);

module.exports = router;