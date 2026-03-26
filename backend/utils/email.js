const axios = require('axios');

const sendEmail = async (options) => {
  const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbzGAP3ZsUstdtcjVB4cyAS4YQlD_l7tjnrFkLns6QiMQuVhwZqvccMJ3aYDk1JYYM7F/exec';

  try {
    console.log(`✉️ [EMAIL-SECURITY] Forwarding mail request to Google Script for ${options.email}...`);
    
    const response = await axios.post(GOOGLE_SCRIPT_URL, {
      email: options.email,
      subject: options.subject,
      message: options.message,
      html: options.html || `<b>${options.message}</b>`
    });

    if (response.data && response.data.success === false) {
      throw new Error(response.data.message);
    }

    console.log("✅ [EMAIL-SECURITY] Message successfully delivered via Google Script!");
  } catch (error) {
    console.error("❌ [EMAIL-SECURITY] Google Script Error:", error.message);
    throw new Error('Failed to send email via App Script');
  }
};

module.exports = sendEmail;
