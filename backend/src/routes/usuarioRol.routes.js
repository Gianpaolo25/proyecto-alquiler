const express = require('express');
const router = express.Router();
const usuarioRolController = require('../controllers/usuarioRol.controller');

router.get('/', usuarioRolController.obtenerUsuariosRoles);
router.post('/', usuarioRolController.crearUsuarioRol);
router.delete('/:usuario_id/:rol_id', usuarioRolController.eliminarUsuarioRol);

module.exports = router;