const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendPasswordResetCode = async ({ to, code, nombre }) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    replyTo: process.env.EMAIL_REPLY_TO,
    subject: "Código de recuperación - Smika Store",
    html: `
      <div style="font-family: Arial, sans-serif; background:#f8f6f7; padding:24px;">
        <div style="max-width:560px; margin:auto; background:#ffffff; border-radius:20px; padding:28px;">
          <h2 style="color:#2F2F2F; margin:0 0 16px;">Smika Store 💖</h2>

          <p>Hola ${nombre || "cliente"},</p>

          <p>Recibimos una solicitud para recuperar tu contraseña.</p>

          <p>Tu código de recuperación es:</p>

          <div style="font-size:32px; font-weight:bold; letter-spacing:8px; background:#87CCC8; color:white; padding:16px; border-radius:16px; text-align:center; margin:18px 0;">
            ${code}
          </div>

          <p>
            Este código tiene una validez de <strong>15 minutos</strong>.
          </p>

          <p>
            Si no solicitaste este cambio, puedes ignorar este correo.
          </p>

          <p style="color:#777; margin-top:24px;">
            Smika Dev Support
          </p>
        </div>
      </div>
    `
  });
};

module.exports = {
  sendPasswordResetCode
};