const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth.middleware');
const controller = require('../controllers/invitaciones.controller');

router.post('/', verificarToken, controller.enviarInvitacion);
router.get('/recibidas', verificarToken, controller.obtenerInvitacionesRecibidas);
router.post('/:id/aceptar', verificarToken, controller.aceptarInvitacion);
router.post('/:id/rechazar', verificarToken, controller.rechazarInvitacion);

module.exports = router;