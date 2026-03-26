const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER or EMAIL_PASS environment variables are not set.');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000, // 10 seconds timeout
    greetingTimeout: 10000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false
    }
  });

  const message = {
    from: `"UNEXA SuperApp" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || `<b>${options.message}</b>`,
  };

  console.log(`✉️ [EMAIL-SECURITY] Attempting to send mail to ${options.email}...`);
  const info = await transporter.sendMail(message);

  console.log("✉️ [EMAIL-SECURITY] Message sent: %s", info.messageId);
};

module.exports = sendEmail;
