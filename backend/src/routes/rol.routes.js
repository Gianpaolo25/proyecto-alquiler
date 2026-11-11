const express = require('express');
const router = express.Router();
const rolController = require('../controllers/rol.controller');

router.get('/', rolController.obtenerRoles);
router.post('/', rolController.crearRol);
router.post('/asignar', rolController.asignarRolUsuario);
router.get('/usuario/:idusuario', rolController.obtenerRolesDeUsuario);

module.exports = router;