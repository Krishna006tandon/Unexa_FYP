const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const message = {
    from: `"UNEXA SuperApp" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || `<b>${options.message}</b>`,
  };

  const info = await transporter.sendMail(message);

  console.log("✉️ [EMAIL-SECURITY] Message sent: %s", info.messageId);
};

module.exports = sendEmail;
