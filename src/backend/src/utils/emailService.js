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
    },
    // Thêm timeout và connection options cho Render
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000, // 15 seconds
    // Tăng số lần retry khi connection fail
    pool: true,
    maxConnections: 5,
    maxMessages: 10,
    rateDelta: 1000,
    rateLimit: 5,
    // Xử lý TLS cho môi trường production
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false,
      minVersion: 'TLSv1.2'
    },
    // Log để debug
    logger: process.env.NODE_ENV === 'development',
    debug: process.env.NODE_ENV === 'development'
  });

  // Verify connection on startup
  transporter.verify((error, success) => {
    if (error) {
      console.error('[emailService] SMTP connection verification failed:', error.message);
      console.error('[emailService] Please check your SMTP credentials and network settings');
    } else {
      console.log('[emailService] SMTP server is ready to send emails');
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

  try {
    // Thêm retry logic với exponential backoff
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const info = await transporter.sendMail(payload);
        console.log(`[emailService] Email sent successfully to ${to} on attempt ${attempt}:`, info.messageId);
        return info;
      } catch (error) {
        lastError = error;
        console.error(`[emailService] Attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        // Không retry nếu là lỗi authentication
        if (error.responseCode === 535 || error.message.includes('authentication')) {
          throw error;
        }
        
        // Chỉ retry nếu chưa đến lần cuối
        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[emailService] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Nếu hết retries vẫn fail
    throw lastError;
  } catch (error) {
    console.error('[emailService] Failed to send email after all retries:', {
      error: error.message,
      code: error.code,
      responseCode: error.responseCode,
      to,
      subject
    });
    throw error;
  }
}

module.exports = {
  sendEmail
};
