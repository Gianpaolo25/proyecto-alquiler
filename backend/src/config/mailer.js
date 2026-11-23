const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true para puerto 465, false para otros puertos
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Función para enviar correo de verificación
const enviarCorreoVerificacion = async (email, token) => {
  const urlVerificacion = `${process.env.FRONTEND_URL}/verificar-email?token=${token}`;

  await transporter.sendMail({
    from: `"Sistema de Alquileres" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verifica tu cuenta en Sistema de Alquileres',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2c3e50;">¡Bienvenido a Alquileres!</h2>
        <p>Gracias por registrarte. Para activar tu cuenta y poder ingresar al sistema, haz clic en el siguiente botón:</p>
        <a href="${urlVerificacion}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">Verificar mi correo</a>
        <p style="margin-top: 20px; font-size: 12px; color: #7f8c8d;">Si no solicitaste esta cuenta, puedes ignorar este mensaje.</p>
      </div>
    `,
  });
};

// Función para enviar correo de recuperación de contraseña
const enviarCorreoRecuperacion = async (email, token) => {
  const urlRecuperacion = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"Sistema de Alquileres" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Recuperación de Contraseña',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #c0392b;">Recuperación de Contraseña</h2>
        <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón para continuar:</p>
        <a href="${urlRecuperacion}" style="background-color: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">Restablecer contraseña</a>
        <p style="margin-top: 20px; font-size: 12px; color: #7f8c8d;">Este enlace expirará en 1 hora. Si no lo solicitaste, ignora este correo.</p>
      </div>
    `,
  });
};

module.exports = {
  enviarCorreoVerificacion,
  enviarCorreoRecuperacion,
};