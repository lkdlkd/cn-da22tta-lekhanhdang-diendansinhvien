const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@sinhvientvu.com';
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'Diễn đàn Sinh viên TVU';

async function sendEmail({ to, subject, html, text }) {
  if (!to) throw new Error('Missing "to" field for email');
  if (!subject) throw new Error('Missing "subject" field for email');

  if (!process.env.MAILERSEND_API_KEY) {
    console.warn('[emailService] MAILERSEND_API_KEY not configured. Email will be logged to console.');
    console.log('[emailService] Preview email:', { to, subject, text: text?.substring(0, 100) });
    return;
  }

  try {
    const sentFrom = new Sender(SMTP_FROM, SMTP_FROM_NAME);
    const recipients = [new Recipient(to, to)];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(html)
      .setText(text || html.replace(/<[^>]*>/g, '')); // Fallback text từ HTML nếu không có text

    const response = await mailerSend.email.send(emailParams);
    console.log('[emailService] Email sent successfully via MailerSend to:', to);
    return response;
  } catch (error) {
    console.error('[emailService] MailerSend error:', {
      message: error.message,
      body: error.body,
      statusCode: error.statusCode,
      to,
      subject
    });
    throw error;
  }
}

module.exports = {
  sendEmail
};
