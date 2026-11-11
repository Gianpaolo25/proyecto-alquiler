const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');

// Definir los endpoints
router.get('/', usuarioController.obtenerUsuarios);       // GET /api/usuario
router.post('/', usuarioController.crearUsuario);     // POST /api/usuario

module.exports = router;