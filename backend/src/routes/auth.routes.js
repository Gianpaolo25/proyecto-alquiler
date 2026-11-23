const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);               // POST /api/auth/register
router.post('/verificar-email', authController.verificarEmail);  // POST /api/auth/verificar-email
router.post('/forgot-password', authController.forgotPassword);  // POST /api/auth/forgot-password
router.post('/reset-password', authController.resetPassword);    // POST /api/auth/reset-password
router.post('/login', authController.login);                     // POST /api/auth/login

module.exports = router;