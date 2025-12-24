const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const Notification = require('../../models/Notification');
const Message = require('../../models/Message');
const crypto = require('crypto');
const { uploadToDrive, deleteFromDrive } = require('../../utils/fileUpload');
const { sendEmail } = require('../../utils/emailService');

const VERIFICATION_TTL_MS = 10 * 60 * 1000; // 10 phút
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 phút

// HELPER: Gửi email xác thực
async function dispatchVerificationEmail(toEmail, displayName, code, token) {
  const safeName = displayName || 'bạn';
  const subject = 'Xác thực tài khoản Diễn đàn Sinh viên TVU';
  const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0">
        <h1 style="color:#fff;margin:0;font-size:28px">Xác thực tài khoản</h1>
      </div>
      <div style="background:#fff;padding:30px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px">
        <h2 style="color:#333;margin-top:0">Xin chào ${safeName},</h2>
        <p style="color:#555;font-size:16px">Cảm ơn bạn đã đăng ký <strong>Diễn đàn Sinh viên TVU</strong>.</p>
        <p style="color:#555;font-size:16px">Để hoàn tất đăng ký, vui lòng xác thực email bằng một trong hai cách sau:</p>
        
        <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0">
          <h3 style="color:#333;margin-top:0;font-size:18px">🔗 Cách 1: Nhấn nút xác thực (Khuyên dùng)</h3>
          <div style="text-align:center;margin:20px 0">
            <a href="${verifyLink}" 
              style="
                display:inline-block;
                background:#667eea;
                background-color:#667eea;
                background-image:linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color:#fff;
                padding:15px 40px;
                text-decoration:none;
                border-radius:50px;
                font-weight:bold;
                font-size:16px;
                box-shadow:0 4px 15px rgba(102,126,234,0.4);
              "
            >
              Xác thực ngay
            </a>
          </div>
          <p style="color:#777;font-size:14px;margin-top:15px">Hoặc copy link sau vào trình duyệt:<br/>
          <a href="${verifyLink}" style="color:#667eea;word-break:break-all;font-size:13px">${verifyLink}</a></p>
        </div>
        
        <div style="background:#fff3cd;padding:20px;border-radius:8px;border-left:4px solid #ffc107;margin:20px 0">
          <h3 style="color:#856404;margin-top:0;font-size:18px">🔢 Cách 2: Nhập mã xác thực</h3>
          <p style="color:#856404;margin-bottom:10px">Nếu link không hoạt động, hãy nhập mã sau vào trang đăng ký:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#667eea;text-align:center;margin:15px 0;font-family:monospace">${code}</p>
        </div>
        
        <p style="color:#999;font-size:14px;margin-top:25px;padding-top:20px;border-top:1px solid #e0e0e0">
          ⏱️ Link và mã này sẽ <strong>hết hạn sau 10 phút</strong>.<br/>
          ⚠️ Nếu bạn không thực hiện đăng ký, vui lòng bỏ qua email này.
        </p>
        <p style="color:#555;margin-top:20px">Trân trọng,<br/><strong>Diễn đàn Sinh viên TVU</strong></p>
      </div>
    </div>
  `;

  await sendEmail({ to: toEmail, subject, html, text: `Ma xac thuc cua ban la ${code}. Link xac thuc: ${verifyLink}. Ma het han sau 10 phut.` });
}

// ĐĂNG NHẬP
exports.login = async (req, res) => {
  try {
    let { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Vui lòng nhập tên đăng nhập/email/số điện thoại và mật khẩu" });
    }
    username = username.toLowerCase();
    // Tìm user theo username, email hoặc phone
    const user = await User.findOne({
      $or: [
        { username: username },
        { email: username },
      ]
    }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: "Sai thông tin đăng nhập hoặc mật khẩu" });
    }
    // Kiểm tra mật khẩu
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Sai thông tin đăng nhập hoặc mật khẩu" });
    }
    // Kiểm tra trạng thái cấm
    if (user.isBanned && (!user.bannedUntil || new Date() < user.bannedUntil)) {
      return res.status(403).json({ success: false, error: "Tài khoản đã bị cấm" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư @st.tvu.edu.vn để kích hoạt tài khoản.',
        requiresVerification: true,
        email: user.email
      });
    }
    // Tạo token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || process.env.secretKey || 'your-secret-key-here',
      { expiresIn: '30d' }
    );
    // Trả về thông tin user (không bao gồm password)
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        faculty: user.faculty,
        class: user.class,
        bio: user.bio,
        stats: user.stats,
        settings: user.settings
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi đăng nhập" });
  }
};

// ĐĂNG KÝ
exports.register = async (req, res) => {
  try {
    let { username, email, password, displayName, phone, faculty, class: userClass, bio } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: "Vui lòng nhập đầy đủ tên đăng nhập, email và mật khẩu" });
    }
    username = username.toLowerCase();
    email = email.toLowerCase();

    // Kiểm tra email domain - chỉ cho phép @st.tvu.edu.vn
    const allowedDomains = [ '@st.tvu.edu.vn'];
    const isValidDomain = allowedDomains.some(domain => email.endsWith(domain));
    if (!isValidDomain) {
      return res.status(400).json({ success: false, error: 'Email phải sử dụng tên miền @st.tvu.edu.vn' });
    }
    // Kiểm tra username và password không được ngắn hơn 6 ký tự
    if (username.length < 6) {
      return res.status(400).json({ success: false, error: "Tên người dùng phải có ít nhất 6 ký tự" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Mật khẩu phải có ít nhất 6 ký tự" });
    }
    // Kiểm tra username chỉ chứa chữ và số
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ success: false, error: "Tên người dùng không được chứa ký tự đặc biệt" });
    }
    // Kiểm tra username phải chứa ít nhất một ký tự chữ
    const containsLetterRegex = /[a-zA-Z]/;
    if (!containsLetterRegex.test(username)) {
      return res.status(400).json({ success: false, error: "Tên người dùng phải chứa ít nhất một ký tự chữ" });
    }
    // Kiểm tra nếu người dùng đã tồn tại
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Tên người dùng hoặc email đã tồn tại" });
    }
    // Kiểm tra xem đã có admin chưa
    const isAdminExists = await User.findOne({ role: "admin" });

    const avatarUrl = 'https://www.gravatar.com/avatar/' + crypto.createHash('md5').update(email).digest('hex') + '?d=identicon';
    // Tạo người dùng mới
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = new User({
      username,
      email,
      password,
      displayName: displayName || username,
      phone,
      faculty,
      class: userClass,
      bio: bio || '',
      role: isAdminExists ? "student" : "admin",
      avatarUrl: avatarUrl,
      emailVerificationCode: verificationCode,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: new Date(Date.now() + VERIFICATION_TTL_MS),
      lastVerificationEmailSentAt: new Date()
    });
    await user.save();

    try {
      await dispatchVerificationEmail(user.email, user.displayName, verificationCode, verificationToken);
    } catch (emailErr) {
      console.error('Không thể gửi email xác thực:', emailErr?.message || emailErr);
    }

    return res.status(201).json({
      success: true,
      message: `Đăng ký thành công! Vui lòng kiểm tra email ${user.email} để nhập mã xác thực trong 10 phút.`,
      requiresVerification: true,
      email: user.email
    });
  } catch (error) {
    console.error("Đăng ký lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra. Vui lòng thử lại." });
  }
};

// XÁC THỰC EMAIL BẰNG TOKEN (từ link)
exports.verifyEmailByToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Thiếu token xác thực' });
    }

    const user = await User.findOne({ emailVerificationToken: token }).select('+emailVerificationToken +emailVerificationExpires');
    if (!user) {
      return res.status(404).json({ success: false, error: 'Link xác thực không hợp lệ hoặc đã được sử dụng' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ success: false, error: 'Email đã được xác thực trước đó' });
    }

    if (!user.emailVerificationExpires || user.emailVerificationExpires.getTime() < Date.now()) {
      return res.status(400).json({ success: false, error: 'Link xác thực đã hết hạn. Vui lòng yêu cầu gửi lại.' });
    }

    user.emailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.lastVerificationEmailSentAt = undefined;
    await user.save();

    return res.json({ success: true, message: 'Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.' });
  } catch (err) {
    console.error('verifyEmailByToken error:', err);
    return res.status(500).json({ success: false, error: 'Có lỗi xảy ra khi xác thực email' });
  }
};

// XÁC THỰC EMAIL BẰNG MÃ OTP
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp email và mã xác thực' });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+emailVerificationCode +emailVerificationExpires');
    if (!user) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản với email này' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ success: false, error: 'Email đã được xác thực trước đó' });
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpires) {
      return res.status(400).json({ success: false, error: 'Không tìm thấy mã xác thực. Vui lòng yêu cầu gửi lại.' });
    }

    if (user.emailVerificationExpires.getTime() < Date.now()) {
      return res.status(400).json({ success: false, error: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại.' });
    }

    if (user.emailVerificationCode !== code.trim()) {
      return res.status(400).json({ success: false, error: 'Mã xác thực không chính xác' });
    }

    user.emailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    user.lastVerificationEmailSentAt = undefined;
    await user.save();

    return res.json({ success: true, message: 'Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.' });
  } catch (err) {
    console.error('verifyEmail error:', err);
    return res.status(500).json({ success: false, error: 'Có lỗi xảy ra khi xác thực email' });
  }
};

// GỬI LẠI MÃ XÁC THỰC EMAIL
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp email' });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+emailVerificationCode +emailVerificationExpires +lastVerificationEmailSentAt');
    if (!user) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản với email này' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ success: false, error: 'Email đã được xác thực trước đó' });
    }

    const now = Date.now();
    if (user.lastVerificationEmailSentAt && now - user.lastVerificationEmailSentAt.getTime() < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - (now - user.lastVerificationEmailSentAt.getTime())) / 1000);
      return res.status(429).json({ success: false, error: `Vui lòng đợi ${waitSeconds}s trước khi yêu cầu lại mã mới` });
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationCode = newCode;
    user.emailVerificationToken = newToken;
    user.emailVerificationExpires = new Date(now + VERIFICATION_TTL_MS);
    user.lastVerificationEmailSentAt = new Date(now);
    await user.save();

    try {
      await dispatchVerificationEmail(user.email, user.displayName, newCode, newToken);
    } catch (emailErr) {
      console.error('Không thể gửi lại email xác thực:', emailErr?.message || emailErr);
      return res.status(500).json({ success: false, error: 'Không thể gửi email xác thực. Vui lòng thử lại sau.' });
    }

    return res.json({ success: true, message: 'Mã xác thực mới đã được gửi, vui lòng kiểm tra email của bạn.' });
  } catch (err) {
    console.error('resendVerificationEmail error:', err);
    return res.status(500).json({ success: false, error: 'Có lỗi xảy ra khi gửi lại mã xác thực' });
  }
};

// QUÊN MẬT KHẨU - Gửi mã reset
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp email' });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json({ success: true, message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi đến hộp thư của bạn.' });
    }

    if (user.passwordResetRequestedAt && Date.now() - user.passwordResetRequestedAt.getTime() < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - user.passwordResetRequestedAt.getTime())) / 1000);
      return res.status(429).json({ success: false, error: `Vui lòng đợi ${waitSeconds}s trước khi yêu cầu lại` });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = crypto.randomBytes(32).toString('hex');

    user.passwordResetCode = resetCode;
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + VERIFICATION_TTL_MS);
    user.passwordResetRequestedAt = new Date();
    await user.save();

    try {
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      const subject = 'Đặt lại mật khẩu - Diễn đàn Sinh viên TVU';
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0">
            <h1 style="color:#fff;margin:0;font-size:28px">Đặt lại mật khẩu</h1>
          </div>
          <div style="background:#fff;padding:30px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px">
            <h2 style="color:#333;margin-top:0">Xin chào ${user.displayName || user.username},</h2>
            <p style="color:#555;font-size:16px">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>${user.email}</strong>.</p>
            <p style="color:#555;font-size:16px">Bạn có thể đặt lại mật khẩu bằng một trong hai cách sau:</p>
            
            <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0">
              <h3 style="color:#333;margin-top:0;font-size:18px">🔗 Cách 1: Nhấn nút đặt lại (Khuyên dùng)</h3>
              <div style="text-align:center;margin:20px 0">
                <a href="${resetLink}" 
                  style="
                    display:inline-block;
                    background:#667eea;
                    background-color:#667eea;
                    background-image:linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color:#fff;
                    padding:15px 40px;
                    text-decoration:none;
                    border-radius:50px;
                    font-weight:bold;
                    font-size:16px;
                    box-shadow:0 4px 15px rgba(102,126,234,0.4);
                  "
                >
                  Đặt lại mật khẩu
                </a>
              </div>
              <p style="color:#777;font-size:14px;margin-top:15px">Hoặc copy link sau vào trình duyệt:<br/>
              <a href="${resetLink}" style="color:#667eea;word-break:break-all;font-size:13px">${resetLink}</a></p>
            </div>
            
            <div style="background:#fff3cd;padding:20px;border-radius:8px;border-left:4px solid #ffc107;margin:20px 0">
              <h3 style="color:#856404;margin-top:0;font-size:18px">🔢 Cách 2: Nhập mã xác thực</h3>
              <p style="color:#856404;margin-bottom:10px">Nếu link không hoạt động, hãy nhập mã sau vào trang đặt lại mật khẩu:</p>
              <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#667eea;text-align:center;margin:15px 0;font-family:monospace">${resetCode}</p>
            </div>
            
            <div style="background:#fff5f5;padding:20px;border-radius:8px;border-left:4px solid #f56565;margin:20px 0">
              <p style="color:#c53030;margin:0;font-size:14px">
                <strong>⚠️ Lưu ý bảo mật:</strong> Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và đảm bảo tài khoản của bạn an toàn.
              </p>
            </div>
            
            <p style="color:#999;font-size:14px;margin-top:25px;padding-top:20px;border-top:1px solid #e0e0e0">
              ⏱️ Link và mã này sẽ <strong>hết hạn sau 10 phút</strong>.
            </p>
            <p style="color:#555;margin-top:20px">Trân trọng,<br/><strong>Diễn đàn Sinh viên TVU</strong></p>
          </div>
        </div>
      `;

      await sendEmail({
        to: user.email,
        subject,
        html,
        text: `Mã đặt lại mật khẩu của bạn là ${resetCode}. Link: ${resetLink}. Mã hết hạn sau 10 phút.`
      });
    } catch (emailErr) {
      console.error('Không thể gửi email đặt lại mật khẩu:', emailErr?.message || emailErr);
      return res.status(500).json({ success: false, error: 'Không thể gửi email. Vui lòng thử lại sau.' });
    }

    return res.json({ success: true, message: 'Link đặt lại mật khẩu đã được gửi đến email của bạn.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ success: false, error: 'Có lỗi xảy ra khi xử lý yêu cầu' });
  }
};

// XÁC THỰC MÃ RESET PASSWORD
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp email và mã xác thực' });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordResetCode +passwordResetExpires');

    if (!user || !user.passwordResetCode) {
      return res.status(404).json({ success: false, error: 'Mã xác thực không hợp lệ hoặc đã hết hạn' });
    }

    if (user.passwordResetExpires.getTime() < Date.now()) {
      return res.status(400).json({ success: false, error: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu lại.' });
    }

    if (user.passwordResetCode !== code.trim()) {
      return res.status(400).json({ success: false, error: 'Mã xác thực không chính xác' });
    }

    return res.json({ success: true, message: 'Mã xác thực hợp lệ' });
  } catch (err) {
    console.error('verifyResetCode error:', err);
    return res.status(500).json({ success: false, error: 'Có lỗi xảy ra khi xác thực mã' });
  }
};

// ĐẶT LẠI MẬT KHẨU
exports.resetPassword = async (req, res) => {
  try {
    const { token, email, code, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    let user;

    if (token) {
      user = await User.findOne({
        passwordResetToken: token
      }).select('+passwordResetToken +passwordResetExpires +password');

      if (!user) {
        return res.status(404).json({ success: false, error: 'Link đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng' });
      }

      if (user.passwordResetExpires.getTime() < Date.now()) {
        return res.status(400).json({ success: false, error: 'Link đặt lại mật khẩu đã hết hạn' });
      }
    }
    else if (email && code) {
      const normalizedEmail = email.toLowerCase();
      user = await User.findOne({
        email: normalizedEmail
      }).select('+passwordResetCode +passwordResetExpires +password');

      if (!user || !user.passwordResetCode) {
        return res.status(404).json({ success: false, error: 'Mã xác thực không hợp lệ' });
      }

      if (user.passwordResetExpires.getTime() < Date.now()) {
        return res.status(400).json({ success: false, error: 'Mã xác thực đã hết hạn' });
      }

      if (user.passwordResetCode !== code.trim()) {
        return res.status(400).json({ success: false, error: 'Mã xác thực không chính xác' });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp token hoặc email và mã xác thực' });
    }

    user.password = newPassword;
    user.passwordResetCode = undefined;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetRequestedAt = undefined;
    await user.save();

    return res.json({ success: true, message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ success: false, error: 'Có lỗi xảy ra khi đặt lại mật khẩu' });
  }
};

// LẤY THÔNG TIN CÁ NHÂN
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    let user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Lấy thông tin người dùng lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi lấy thông tin người dùng" });
  }
};

// CẬP NHẬT THÔNG TIN CÁ NHÂN
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    let updates = req.body;

    if (req.file) {
      const oldUser = await User.findById(userId);

      if (oldUser && oldUser.avatarUrl && !oldUser.avatarUrl.includes('gravatar.com')) {
        try {
          if (oldUser.driveFileId) {
            await deleteFromDrive(oldUser.driveFileId, oldUser.resourceType);
            console.log(`Đã xóa avatar cũ từ Cloudinary [${oldUser.resourceType}]`);
          }
        } catch (error) {
          console.error('Lỗi khi xóa avatar cũ từ Cloudinary:', error);
        }
      }

      const { fileId, link, resourceType } = await uploadToDrive(req.file, 'avatar');

      updates.avatarUrl = link;
      updates.driveFileId = fileId;
      updates.resourceType = resourceType;
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');

    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Cập nhật thông tin người dùng lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật thông tin người dùng" });
  }
};

// ĐỔI MẬT KHẨU
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: "Mật khẩu hiện tại không đúng" });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ 
      success: true, 
      message: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại." 
    });
  } catch (error) {
    console.error("Đổi mật khẩu lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi đổi mật khẩu" });
  }
};

// LẤY DANH SÁCH THÀNH VIÊN TÍCH CỰC (có nhiều bài viết)
exports.getActiveUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const onlineOnly = req.query.onlineOnly === 'true';

    const matchCondition = {
      isBanned: { $ne: true },
      role: { $ne: 'admin' }
    };

    if (onlineOnly) {
      matchCondition.isOnline = true;
    }

    const activeUsers = await User.aggregate([
      {
        $match: matchCondition
      },
      {
        $lookup: {
          from: 'posts',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$authorId', '$$userId'] },
                isDeleted: { $ne: true },
                isDraft: { $ne: true }
              }
            }
          ],
          as: 'posts'
        }
      },
      {
        $addFields: {
          postsCount: { $size: '$posts' }
        }
      },
      {
        $match: {
          postsCount: { $gt: 0 }
        }
      },
      {
        $sort: {
          isOnline: -1,
          postsCount: -1
        }
      },
      {
        $limit: limit
      },
      {
        $project: {
          _id: 1,
          username: 1,
          displayName: 1,
          avatar: 1,
          avatarUrl: 1,
          postsCount: 1,
          isOnline: 1,
          lastSeen: 1,
          createdAt: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      users: activeUsers
    });
  } catch (error) {
    console.error("Lấy danh sách thành viên tích cực lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi lấy danh sách thành viên tích cực" });
  }
};

// LẤY DANH SÁCH USER ĐANG ONLINE
exports.getOnlineUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const onlineUsers = await User.find({
      isOnline: true,
      isBanned: { $ne: true },
    })
      .select('_id username displayName avatar avatarUrl isOnline lastSeen createdAt')
      .limit(limit)
      .sort({ lastSeen: -1 });

    return res.status(200).json({
      success: true,
      count: onlineUsers.length,
      users: onlineUsers
    });
  } catch (error) {
    console.error("Lấy danh sách user online lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi lấy danh sách user online" });
  }
};

// LẤY THÔNG TIN USER THEO USERNAME (public profile)
exports.getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username: username.toLowerCase() })
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy người dùng"
      });
    }

    const Post = require('../../models/Post');
    const Comment = require('../../models/Comment');

    const [postsCount, commentsCount] = await Promise.all([
      Post.countDocuments({ authorId: user._id, isDeleted: false }),
      Comment.countDocuments({ authorId: user._id, isDeleted: false })
    ]);

    res.json({
      success: true,
      user: {
        ...user,
        stats: {
          ...user.stats,
          postsCount,
          commentsCount
        }
      }
    });
  } catch (err) {
    console.error('Error in getUserByUsername:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// LẤY BÀI VIẾT CỦA MỘT USER CỤ THỂ
exports.getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const user = await User.findOne({ username: username.toLowerCase() })
      .select('_id')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy người dùng"
      });
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;
    const limitNum = parseInt(limit);

    const Post = require('../../models/Post');
    const Like = require('../../models/Like');
    const Comment = require('../../models/Comment');
    const Attachment = require('../../models/Attachment');

    const [posts, total] = await Promise.all([
      Post.find({
        authorId: user._id,
        isDeleted: false,
        isDraft: false
      })
        .populate('authorId', 'username displayName avatar avatarUrl faculty class bio stats')
        .populate('categoryId', 'title slug description')
        .populate('attachments')
        .skip(skip)
        .limit(limitNum)
        .sort({ [sortBy]: sortOrder })
        .lean(),
      Post.countDocuments({
        authorId: user._id,
        isDeleted: false,
        isDraft: false
      })
    ]);

    if (posts.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total: 0,
          pages: 0
        }
      });
    }

    const postIds = posts.map(p => p._id);

    const [commentsRaw, likes, commentIds] = await Promise.all([
      Comment.find({ postId: { $in: postIds } })
        .populate('authorId', 'username displayName avatarUrl faculty class')
        .populate('attachments')
        .lean(),
      Like.find({ targetType: 'post', targetId: { $in: postIds } })
        .populate('userId', 'username displayName avatarUrl faculty class')
        .sort({ createdAt: -1 })
        .lean(),
      Comment.find({ postId: { $in: postIds } }).distinct('_id')
    ]);

    const likescmt = commentIds.length > 0
      ? await Like.find({ targetType: 'comment', targetId: { $in: commentIds } })
        .populate('userId', 'username displayName avatarUrl faculty class')
        .sort({ createdAt: -1 })
        .lean()
      : [];

    const commentMap = new Map();
    const likesMap = new Map();
    const commentLikesMap = new Map();

    commentsRaw.forEach(c => commentMap.set(String(c._id), c));
    likes.forEach(l => {
      const key = String(l.targetId);
      if (!likesMap.has(key)) likesMap.set(key, []);
      likesMap.get(key).push(l);
    });
    likescmt.forEach(l => {
      const key = String(l.targetId);
      if (!commentLikesMap.has(key)) commentLikesMap.set(key, []);
      commentLikesMap.get(key).push(l);
    });

    const comments = commentsRaw.map(c => {
      const commentId = String(c._id);
      return {
        ...c,
        likes: commentLikesMap.get(commentId) || []
      };
    });

    const commentsByPost = new Map();
    comments.forEach(c => {
      const key = String(c.postId);
      if (!commentsByPost.has(key)) commentsByPost.set(key, []);
      commentsByPost.get(key).push(c);
    });

    const postsWithComments = posts.map(post => {
      const postId = String(post._id);
      return {
        ...post,
        likes: likesMap.get(postId) || [],
        comments: commentsByPost.get(postId) || []
      };
    });

    res.json({
      success: true,
      data: postsWithComments,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Error in getUserPosts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = exports;
