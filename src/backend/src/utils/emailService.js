const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@sinhvientvu.com';
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'Diễn đàn Sinh viên TVU';

async function sendEmail({ to, subject, html, text }) {
  if (!to) throw new Error('Missing "to" field for email');
  if (!subject) throw new Error('Missing "subject" field for email');

  if (!process.env.RESEND_API_KEY) {
    console.warn('[emailService] RESEND_API_KEY not configured. Email will be logged to console.');
    console.log('[emailService] Preview email:', { to, subject, text: text?.substring(0, 100) });
    return;
  }

  try {
    const response = await resend.emails.send({
      from: `${SMTP_FROM_NAME} <${SMTP_FROM}>`,
      to: [to],
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, ''), // Fallback text từ HTML nếu không có text
    });

    console.log('[emailService] Email sent successfully via Resend to:', to);
    return response;
  } catch (error) {
    console.error('[emailService] Resend error:', {
      message: error.message,
      statusCode: error.statusCode,
      name: error.name,
      to,
      subject
    });
    throw error;
  }
}

module.exports = {
  sendEmail
};
