const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT = 587,
  SMTP_SECURE = 'false',
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM = 'no-reply@st.tvu.edu.vn'
} = process.env;

let transporter;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
} else {
  console.warn('[emailService] SMTP environment variables are not fully configured. Emails will be logged to console.');
}

async function sendEmail({ to, subject, html, text }) {
  if (!to) throw new Error('Missing "to" field for email');
  if (!subject) throw new Error('Missing "subject" field for email');
  const payload = {
    from: SMTP_FROM,
    to,
    subject,
    html,
    text
  };

  if (!transporter) {
    console.log('[emailService] Preview email payload:', payload);
    return;
  }

  await transporter.sendMail(payload);
}

module.exports = {
  sendEmail
};
