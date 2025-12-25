
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { register, verifyEmailOTP, resendVerificationOTP } from '../../Utils/api';
import { useNavigate } from 'react-router-dom';
import '../../assets/css/Register.css';
const facultiesData = {
  'Trường Kỹ thuật và Công nghệ': [
    'Khoa Công nghệ thông tin',
    'Khoa Kỹ thuật phần mềm',
    'Khoa Khoa học máy tính',
    'Khoa An toàn thông tin',
    'Khoa Cơ khí – Động lực',
    'Khoa Điện – Điện tử',
    'Khoa Xây dựng',
    'Khoa Hóa học Ứng dụng',
  ],
  'Trường Kinh tế – Luật': [
    'Khoa Quản trị kinh doanh',
    'Khoa Kế toán',
    'Khoa Marketing',
    'Khoa Tài chính',
    'Khoa Logistics',
    'Khoa Luật',
  ],
  'Trường Nông nghiệp – Môi trường': [
    'Khoa Nông nghiệp – Thủy sản',
    'Viện Khoa học Công nghệ Môi trường',
    'Viện Công nghệ Sinh học',
  ],
  'Trường Ngôn ngữ – Văn hóa – Nghệ thuật Khmer Nam Bộ và Nhân văn': [
    'Khoa Ngôn ngữ Anh',
    'Khoa Ngôn ngữ Trung Quốc',
    'Khoa Sư phạm',
    'Khoa Thiết kế đồ họa',
    'Khoa Quản trị Du lịch – Nhà hàng – Khách sạn',
    'Khoa Văn hóa – Nghệ thuật Khmer Nam Bộ',
  ],
  'Trường Y – Dược': [
    'Khoa Y học cơ sở',
    'Khoa Dược học',
    'Khoa Răng – Hàm – Mặt',
  ],
  'Các khoa – viện khác': [
    'Viện Phát triển Nguồn lực',
    'Viện Đào tạo Quốc tế',
    'Khoa Lý luận Chính trị',
    'Khoa Khoa học Cơ bản',
    'Khoa Giáo dục Thể chất',
    'Khoa Dự bị Đại học',
  ],
};

export function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    school: '',
    faculty: '',
    class: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [availableFaculties, setAvailableFaculties] = useState([]);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Check if coming from login with unverified email
  useEffect(() => {
    const stepParam = searchParams.get('step');
    const emailParam = searchParams.get('email');
    if (stepParam === '3' && emailParam) {
      setStep(3);
      setNeedsVerification(true);
      setVerificationEmail(emailParam);
      setSuccess('Vui lòng xác thực email để có thể đăng nhập.');
      setResendCooldown(60);
    }
  }, [searchParams]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev - 1 <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSchoolChange = (e) => {
    const selectedSchool = e.target.value;
    setFormData({
      ...formData,
      school: selectedSchool,
      faculty: ''
    });
    setAvailableFaculties(facultiesData[selectedSchool] || []);
  };

  const validateStep1 = () => {
    if (!formData.displayName || !formData.username || !formData.email) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Email không hợp lệ!');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }
    if (!formData.school || !formData.faculty || !formData.class) {
      setError('Vui lòng điền đầy đủ thông tin học vấn!');
      return;
    }
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }

    const normalizedEmail = formData.email.trim().toLowerCase();
    // Kiểm tra email domain
    const allowedDomains = ['@st.tvu.edu.vn'];
    const isValidDomain = allowedDomains.some(domain => normalizedEmail.endsWith(domain));
    if (!isValidDomain) {
      setError('Email phải sử dụng tên miền @st.tvu.edu.vn');
      return;
    }

    setLoading(true);
    try {
      const res = await register({ ...formData, email: normalizedEmail });
      if (res.success) {
        setSuccess(res.message || 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực.');
        setNeedsVerification(!!res.requiresVerification);
        setVerificationEmail(res.email || normalizedEmail);
        setVerificationCode('');
        setResendCooldown(60);
        if (res.requiresVerification) {
          setStep(3);
        } else {
          setTimeout(() => {
            navigate('/login');
          }, 1500);
        }
      } else {
        setError(res.error || 'Đăng ký thất bại');
      }
    } catch (err) {
      setError('Không thể kết nối máy chủ');
    }
    setLoading(false);
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    if (!verificationCode) {
      setError('Vui lòng nhập mã xác thực đã được gửi tới email sinh viên.');
      return;
    }
    setError('');
    setSuccess('');
    setVerifying(true);
    try {
      const res = await verifyEmailOTP({ email: verificationEmail, code: verificationCode.trim() });
      if (res.success) {
        setSuccess(res.message || 'Xác thực thành công! Đang chuyển đến trang đăng nhập...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setError(res.error || 'Không thể xác thực email');
      }
    } catch (err) {
      setError('Không thể kết nối máy chủ');
    }
    setVerifying(false);
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setSuccess('');
    try {
      const res = await resendVerificationOTP({ email: verificationEmail });
      if (res.success) {
        setSuccess(res.message || 'Đã gửi lại mã xác thực.');
        setResendCooldown(60);
      } else {
        setError(res.error || 'Không thể gửi lại mã xác thực');
      }
    } catch (err) {
      setError('Không thể kết nối máy chủ');
    }
  };

  return (
    <React.Fragment>
      <Helmet>
        <title>Đăng ký tài khoản - Diễn đàn Sinh viên | Tham gia cộng đồng</title>
        <meta name="description" content="Đăng ký tài khoản miễn phí để tham gia diễn đàn sinh viên, kết nối với bạn bè, chia sẻ tài liệu học tập và kiến thức." />
        <meta name="keywords" content="đăng ký, tài khoản sinh viên, diễn đàn, cộng đồng, học tập, chia sẻ kiến thức" />
        <meta property="og:title" content="Đăng ký - Diễn đàn Sinh viên" />
        <meta property="og:description" content="Tạo tài khoản để tham gia cộng đồng sinh viên sôi động, chia sẻ và học hỏi cùng nhau" />
        <meta property="og:type" content="website" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <div className="register-container">
        <div className="register-wrapper">
          <div className="row justify-content-center">
            <div className="col-12">
              <div className="card border-0 shadow-lg register-card">
                <div className="row g-0 register-card-row">
                  {/* Left Side - Image */}
                  <div className="col-lg-5 d-none d-lg-block position-relative">
                    <div className="register-image-container">
                      <img
                        src="/login-page-img.png"
                        alt="Student Registration Illustration"
                        className="register-image"
                      />
                    </div>
                  </div>

                  {/* Right Side - Registration Form */}
                  <div className="col-lg-7">
                    <div className="w-100 p-4 p-lg-5 p-xl-5">
                      {/* Mobile Header */}
                      <div className="d-lg-none text-center mb-4">
                        <div className="register-mobile-icon">
                          <i className={`bi ${step === 3 ? 'bi-envelope-check-fill' : 'bi-person-plus-fill'} text-white`}></i>
                        </div>
                      </div>

                      <div className="text-center text-lg-start mb-4">
                        <h3 className="mb-2 register-header-title">
                          {step === 3 ? 'Xác thực tài khoản' : 'Đăng ký tài khoản'}
                        </h3>
                        {step !== 3 && (
                          <>
                            <p className="mb-3 register-header-subtitle">
                              Bước {step} / 2: {step === 1 ? 'Thông tin cá nhân' : 'Thông tin học vấn & Bảo mật'}
                            </p>

                            {/* Progress Bar */}
                            <div className="mx-auto mx-lg-0 register-progress-container">
                              <div className="register-progress-bar">
                                <div className="register-progress-fill" style={{ width: `${(step / 2) * 100}%` }}></div>
                              </div>
                            </div>
                          </>
                        )}
                        {step === 3 && (
                          <p className="mb-0 register-header-subtitle">
                            Hoàn tất đăng ký bằng cách xác thực email
                          </p>
                        )}
                      </div>
                      <form onSubmit={handleSubmit}>

                        {/* STEP 1: Personal Info */}
                        {step === 1 && (
                          <div>
                            <div className="text-center mb-4">
                              <div className="register-step-icon">
                                <i className="bi bi-person-fill"></i>
                              </div>
                              <h5 className="mt-3 mb-2 register-step-title">Thông tin cá nhân</h5>
                              <p className="text-muted mb-0 register-text-muted-small">Vui lòng nhập thông tin chính xác</p>
                            </div>

                            <div className="row">
                              <div className="col-12 mb-4">
                                <label className="form-label register-label">
                                  <i className="bi bi-person-badge-fill"></i>
                                  Họ và tên <span className="text-danger">*</span>
                                </label>
                                <input
                                  type="text"
                                  className="form-control register-input"
                                  name="displayName"
                                  placeholder="Nhập họ và tên đầy đủ"
                                  value={formData.displayName}
                                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                  required
                                  autoComplete="name"
                                  aria-label="Họ và tên"
                                />
                              </div>

                              <div className="col-12 mb-4">
                                <label className="form-label register-label">
                                  <i className="bi bi-person-fill"></i>
                                  Tên đăng nhập <span className="text-danger">*</span>
                                </label>
                                <input
                                  type="text"
                                  className="form-control register-input"
                                  name="username"
                                  placeholder="VD: nguyenvana"
                                  value={formData.username}
                                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                                  required
                                  autoComplete="username"
                                  aria-label="Tên đăng nhập"
                                />
                              </div>

                              <div className="col-12 mb-4">
                                <label className="form-label register-label">
                                  <i className="bi bi-envelope-fill"></i>
                                  Email <span className="text-danger">*</span>
                                </label>
                                <input
                                  type="email"
                                  className="form-control register-input"
                                  name="email"
                                  placeholder="example@st.tvu.edu.vn"
                                  value={formData.email}
                                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                                  required
                                  autoComplete="email"
                                  aria-label="Email"
                                />
                              </div>

                              <div className="col-12 mb-3">
                                <label className="form-label register-label">
                                  <i className="bi bi-telephone-fill"></i>
                                  Số điện thoại
                                </label>
                                <input
                                  type="tel"
                                  className="form-control register-input"
                                  name="phone"
                                  placeholder="Nhập số điện thoại (tùy chọn)"
                                  value={formData.phone}
                                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                  autoComplete="tel"
                                  aria-label="Số điện thoại"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 2: Academic Info & Password */}
                        {step === 2 && (
                          <div>
                            <div className="text-center mb-4">
                              <div className="register-step-icon">
                                <i className="bi bi-mortarboard-fill"></i>
                              </div>
                              <h5 className="mt-3 mb-2 register-step-title">Thông tin học vấn & Bảo mật</h5>
                              <p className="text-muted mb-0 register-text-muted-small">Hoàn tất thông tin để đăng ký</p>
                            </div>

                            <div className="row">
                              <div className="col-12 mb-4">
                                <label className="form-label register-label">
                                  <i className="bi bi-building"></i>
                                  Trường <span className="text-danger">*</span>
                                </label>
                                <select
                                  className="form-select register-input"
                                  name="school"
                                  value={formData.school}
                                  onChange={handleSchoolChange}
                                  required
                                  aria-label="Chọn trường"
                                >
                                  <option value="">Chọn trường</option>
                                  {Object.keys(facultiesData).map(school => (
                                    <option key={school} value={school}>{school}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="col-md-6 mb-4">
                                <label className="form-label register-label">
                                  <i className="bi bi-bank"></i>
                                  Khoa <span className="text-danger">*</span>
                                </label>
                                <select
                                  className="form-select register-input"
                                  name="faculty"
                                  value={formData.faculty}
                                  onChange={e => setFormData({ ...formData, faculty: e.target.value })}
                                  disabled={!formData.school}
                                  required
                                  aria-label="Chọn khoa"
                                >
                                  <option value="">
                                    {!formData.school ? 'Chọn trường trước' : 'Chọn khoa'}
                                  </option>
                                  {availableFaculties.map(faculty => (
                                    <option key={faculty} value={faculty}>{faculty}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="col-md-6 mb-4">
                                <label className="form-label register-label">
                                  <i className="bi bi-people-fill"></i>
                                  Lớp <span className="text-danger">*</span>
                                </label>
                                <input
                                  type="text"
                                  className="form-control register-input"
                                  name="class"
                                  placeholder="VD: CNTT-K15"
                                  value={formData.class}
                                  onChange={e => setFormData({ ...formData, class: e.target.value })}
                                  required
                                  aria-label="Lớp"
                                />
                              </div>

                              <div className="col-12">
                                <hr className="my-4 register-divider" />
                                <div className="text-center mb-4">
                                  <div className="register-small-icon">
                                    <i className="bi bi-lock-fill"></i>
                                  </div>
                                  <p className="text-muted mb-0 register-lock-text">
                                    Tạo mật khẩu để bảo vệ tài khoản
                                  </p>
                                </div>
                              </div>

                              <div className="col-md-6 mb-4">
                                <label className="form-label register-label">
                                  <i className="bi bi-lock-fill"></i>
                                  Mật khẩu <span className="text-danger">*</span>
                                </label>
                                <div className="position-relative">
                                  <input
                                    type={showPassword ? "text" : "password"}
                                    className="form-control register-input register-password-input"
                                    name="password"
                                    placeholder="Tối thiểu 6 ký tự"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    autoComplete="new-password"
                                    aria-label="Mật khẩu"
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-link register-password-toggle"
                                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                                  </button>
                                </div>
                              </div>

                              <div className="col-md-6 mb-4">
                                <label className="form-label register-label">
                                  <i className="bi bi-shield-lock-fill"></i>
                                  Xác nhận mật khẩu <span className="text-danger">*</span>
                                </label>
                                <div className="position-relative">
                                  <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    className="form-control register-input register-password-input"
                                    name="confirmPassword"
                                    placeholder="Nhập lại mật khẩu"
                                    value={formData.confirmPassword}
                                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                    autoComplete="new-password"
                                    aria-label="Xác nhận mật khẩu"
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-link register-password-toggle"
                                    aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  >
                                    <i className={`bi ${showConfirmPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Error/Success messages */}
                        {error && (
                          <div className="alert register-alert-danger mb-4" role="alert">
                            <i className="bi bi-exclamation-triangle-fill"></i>
                            <span>{error}</span>
                          </div>
                        )}
                        {success && (
                          <div
                            className="alert register-alert register-alert-success"
                            role="alert"
                          >
                            <i className="bi bi-check-circle-fill"></i>
                            <span>{success}</span>
                          </div>
                        )}

                        {/* Step 3: Email Verification */}
                        {step === 3 && needsVerification && (
                          <div>
                            <div className="text-center mb-4">
                              <div className="register-step-icon">
                                <i className="bi bi-envelope-check-fill"></i>
                              </div>
                              <h5 className="mt-3 mb-2 register-step-title">Xác thực email</h5>
                              <p className="text-muted mb-0 register-text-muted-small">
                                Email đã được gửi đến <strong>{verificationEmail}</strong>
                              </p>
                            </div>

                            <div className="alert register-alert-info">
                              <h6 className="alert-heading">
                                <i className="bi bi-info-circle-fill me-2"></i>
                                Chọn một trong hai cách xác thực:
                              </h6>
                              <ul>
                                <li className="mb-1">
                                  <strong>Cách 1 (Khuyên dùng):</strong> Nhấn nút <strong>"Xác thực ngay"</strong> trong email
                                </li>
                                <li>
                                  <strong>Cách 2:</strong> Nhập mã 6 chữ số từ email vào ô bên dưới
                                </li>
                              </ul>
                            </div>

                            <div className="mb-4">
                              <label className="form-label register-label">
                                <i className="bi bi-123"></i>
                                Mã xác thực (6 chữ số)
                              </label>
                              <input
                                type="text"
                                className="form-control register-input register-verification-input"
                                placeholder="000000"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                maxLength={6}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={handleVerifyEmail}
                              disabled={verifying || verificationCode.length !== 6}
                              className="btn register-btn register-btn-primary w-100 mb-3"
                            >
                              {verifying ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2"></span>
                                  Đang xác thực...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-check-circle-fill me-2"></i>
                                  Xác thực ngay
                                </>
                              )}
                            </button>

                            <div className="text-center">
                              <p className="text-muted mb-2 register-text-muted-small">
                                Không nhận được email?
                              </p>
                              <button
                                type="button"
                                onClick={handleResendCode}
                                disabled={resendCooldown > 0}
                                className="btn register-btn-outline"
                              >
                                {resendCooldown > 0 ? (
                                  <>
                                    <i className="bi bi-clock me-2"></i>
                                    Gửi lại sau {resendCooldown}s
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-arrow-clockwise me-2"></i>
                                    Gửi lại mã
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Navigation Buttons */}
                        {step !== 3 && (
                          <div className="d-flex gap-3">
                            {step === 2 && (
                              <button
                                type="button"
                                className="btn register-btn register-btn-secondary"
                                onClick={handleBack}
                                aria-label="Quay lại bước trước"
                              >
                                <i className="bi bi-arrow-left me-2"></i>
                                Quay lại
                              </button>
                            )}

                            {step === 1 ? (
                              <button
                                type="button"
                                className="btn register-btn register-btn-primary w-100"
                                onClick={handleNext}
                                aria-label="Tiếp tục đến bước 2"
                              >
                                Tiếp tục
                                <i className="bi bi-arrow-right ms-2"></i>
                              </button>
                            ) : (
                              <button
                                type="submit"
                                className="btn register-btn register-btn-primary register-btn-submit"
                                disabled={loading}
                                aria-label="Hoàn tất đăng ký tài khoản"
                              >
                                {loading ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Đang đăng ký...
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-check-circle-fill me-2"></i>
                                    Hoàn tất đăng ký
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </form>

                      {/* Divider */}
                      <div className="register-text-divider">
                        <hr />
                        <span>
                          hoặc
                        </span>
                      </div>

                      {/* Login link */}
                      <div className="text-center">
                        <p className="mb-0 register-text-muted">
                          Đã có tài khoản?{' '}
                          <Link
                            to="/login"
                            className="text-decoration-none register-link"
                          >
                            Đăng nhập ngay
                          </Link>
                        </p>
                      </div>
                      <div className="text-center mt-4">
                        <Link
                          to="/"
                          className="register-back-link"
                          aria-label="Quay về trang chủ"
                        >
                          <i className="bi bi-arrow-left me-2"></i>
                          Quay về trang chủ
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Back to home */}

            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

