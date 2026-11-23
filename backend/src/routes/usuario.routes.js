const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

router.get('/', verificarToken, usuarioController.listarUsuariosRegistrados);


// Definir los endpoints
router.get('/', usuarioController.obtenerUsuarios);       // GET /api/usuario
router.post('/', usuarioController.crearUsuario);     // POST /api/usuario
router.post('/', usuarioController.listarUsuariosRegistrados);     // POST /api/usuario

module.exports = router;