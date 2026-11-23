const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth.middleware');
const controller = require('../controllers/misDepartamentos.controller');

router.get('/', verificarToken, controller.obtenerMisDepartamentos);
router.post('/propietario', verificarToken, controller.registrarComoPropietario);

module.exports = router;