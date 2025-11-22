
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { register, verifyEmailOTP, resendVerificationOTP } from '../../Utils/api';

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
    if (!normalizedEmail.endsWith('@st.tvu.edu.vn')) {
      setError('Bạn phải sử dụng email sinh viên @st.tvu.edu.vn để đăng ký.');
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
            window.location.href = '/login';
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
          window.location.href = '/login';
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

      <div
        className="py-5"
      // style={{
      //   minHeight: 'calc(100vh - 200px)',
      //   background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      // }}
      >
        <div className="">
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
              <div
                className="card border-0 shadow-lg"
                style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  transform: 'translateY(0)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.1)';
                }}
              >
                {/* Header with Progress */}
                <div
                  className="card-header text-white text-center py-5"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-50%',
                    right: '-10%',
                    width: '200px',
                    height: '200px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    filter: 'blur(40px)'
                  }}></div>
                  <div style={{
                    position: 'absolute',
                    bottom: '-30%',
                    left: '-10%',
                    width: '150px',
                    height: '150px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    filter: 'blur(40px)'
                  }}></div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 20px',
                      backdropFilter: 'blur(10px)',
                      border: '3px solid rgba(255,255,255,0.3)'
                    }}>
                      <i className="bi bi-person-plus-fill" style={{ fontSize: '42px' }}></i>
                    </div>
                    <h3 className="mb-2" style={{ fontWeight: 700, fontSize: '28px' }}>Đăng ký tài khoản</h3>
                    <p className="mb-3" style={{ opacity: 0.95, fontSize: '15px', fontWeight: 500 }}>
                      Bước {step} / 2: {step === 1 ? 'Thông tin cá nhân' : 'Thông tin học vấn & Bảo mật'}
                    </p>

                    {/* Progress Bar */}
                    <div className="mx-auto" style={{ maxWidth: '250px' }}>
                      <div style={{
                        height: '6px',
                        background: 'rgba(255,255,255,0.3)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${(step / 2) * 100}%`,
                          background: 'white',
                          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          borderRadius: '3px',
                          boxShadow: '0 0 10px rgba(255,255,255,0.5)'
                        }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="card-body p-5">
                  <form onSubmit={handleSubmit}>

                    {/* STEP 1: Personal Info */}
                    {step === 1 && (
                      <div>
                        <div className="text-center mb-4">
                          <div style={{
                            width: '70px',
                            height: '70px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)'
                          }}>
                            <i className="bi bi-person-fill text-white" style={{ fontSize: '32px' }}></i>
                          </div>
                          <h5 className="mt-3 mb-2" style={{ fontWeight: 700, fontSize: '20px' }}>Thông tin cá nhân</h5>
                          <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Vui lòng nhập thông tin chính xác</p>
                        </div>

                        <div className="row">
                          <div className="col-12 mb-4">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                              <i className="bi bi-person-badge-fill me-2" style={{ color: '#667eea' }}></i>
                              Họ và tên <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              name="displayName"
                              placeholder="Nhập họ và tên đầy đủ"
                              value={formData.displayName}
                              onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                              required
                              autoComplete="name"
                              aria-label="Họ và tên"
                              style={{
                                borderRadius: '12px',
                                padding: '14px 20px',
                                border: '2px solid #e8ecf1',
                                fontSize: '15px',
                                backgroundColor: '#f8f9fa',
                                transition: 'all 0.3s ease'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#667eea';
                                e.target.style.backgroundColor = '#ffffff';
                                e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e8ecf1';
                                e.target.style.backgroundColor = '#f8f9fa';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                          </div>

                          <div className="col-12 mb-4">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                              <i className="bi bi-person-fill me-2" style={{ color: '#667eea' }}></i>
                              Tên đăng nhập <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              name="username"
                              placeholder="VD: nguyenvana"
                              value={formData.username}
                              onChange={e => setFormData({ ...formData, username: e.target.value })}
                              required
                              autoComplete="username"
                              aria-label="Tên đăng nhập"
                              style={{
                                borderRadius: '12px',
                                padding: '14px 20px',
                                border: '2px solid #e8ecf1',
                                fontSize: '15px',
                                backgroundColor: '#f8f9fa',
                                transition: 'all 0.3s ease'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#667eea';
                                e.target.style.backgroundColor = '#ffffff';
                                e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e8ecf1';
                                e.target.style.backgroundColor = '#f8f9fa';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                          </div>

                          <div className="col-12 mb-4">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                              <i className="bi bi-envelope-fill me-2" style={{ color: '#667eea' }}></i>
                              Email sinh viên <span className="text-danger">*</span>
                            </label>
                            <input
                              type="email"
                              className="form-control"
                              name="email"
                              placeholder="example@st.tvu.edu.vn"
                              value={formData.email}
                              onChange={e => setFormData({ ...formData, email: e.target.value })}
                              required
                              autoComplete="email"
                              aria-label="Email sinh viên"
                              style={{
                                borderRadius: '12px',
                                padding: '14px 20px',
                                border: '2px solid #e8ecf1',
                                fontSize: '15px',
                                backgroundColor: '#f8f9fa',
                                transition: 'all 0.3s ease'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#667eea';
                                e.target.style.backgroundColor = '#ffffff';
                                e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e8ecf1';
                                e.target.style.backgroundColor = '#f8f9fa';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                          </div>

                          <div className="col-12 mb-3">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                              <i className="bi bi-telephone-fill me-2" style={{ color: '#667eea' }}></i>
                              Số điện thoại
                            </label>
                            <input
                              type="tel"
                              className="form-control"
                              name="phone"
                              placeholder="Nhập số điện thoại (tùy chọn)"
                              value={formData.phone}
                              onChange={e => setFormData({ ...formData, phone: e.target.value })}
                              autoComplete="tel"
                              aria-label="Số điện thoại"
                              style={{
                                borderRadius: '12px',
                                padding: '14px 20px',
                                border: '2px solid #e8ecf1',
                                fontSize: '15px',
                                backgroundColor: '#f8f9fa',
                                transition: 'all 0.3s ease'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#667eea';
                                e.target.style.backgroundColor = '#ffffff';
                                e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e8ecf1';
                                e.target.style.backgroundColor = '#f8f9fa';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 2: Academic Info & Password */}
                    {step === 2 && (
                      <div>
                        <div className="text-center mb-4">
                          <div style={{
                            width: '70px',
                            height: '70px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)'
                          }}>
                            <i className="bi bi-mortarboard-fill text-white" style={{ fontSize: '32px' }}></i>
                          </div>
                          <h5 className="mt-3 mb-2" style={{ fontWeight: 700, fontSize: '20px' }}>Thông tin học vấn & Bảo mật</h5>
                          <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Hoàn tất thông tin để đăng ký</p>
                        </div>

                        <div className="row">
                          <div className="col-12 mb-4">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                              <i className="bi bi-building me-2" style={{ color: '#667eea' }}></i>
                              Trường <span className="text-danger">*</span>
                            </label>
                            <select
                              className="form-select"
                              name="school"
                              value={formData.school}
                              onChange={handleSchoolChange}
                              required
                              aria-label="Chọn trường"
                              style={{
                                borderRadius: '12px',
                                padding: '14px 20px',
                                border: '2px solid #e8ecf1',
                                fontSize: '15px',
                                backgroundColor: '#f8f9fa',
                                transition: 'all 0.3s ease'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#667eea';
                                e.target.style.backgroundColor = '#ffffff';
                                e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e8ecf1';
                                e.target.style.backgroundColor = '#f8f9fa';
                                e.target.style.boxShadow = 'none';
                              }}
                            >
                              <option value="">Chọn trường</option>
                              {Object.keys(facultiesData).map(school => (
                                <option key={school} value={school}>{school}</option>
                              ))}
                            </select>
                          </div>

                          <div className="col-md-6 mb-4">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                              <i className="bi bi-bank me-2" style={{ color: '#667eea' }}></i>
                              Khoa <span className="text-danger">*</span>
                            </label>
                            <select
                              className="form-select"
                              name="faculty"
                              value={formData.faculty}
                              onChange={e => setFormData({ ...formData, faculty: e.target.value })}
                              disabled={!formData.school}
                              required
                              aria-label="Chọn khoa"
                              style={{
                                borderRadius: '12px',
                                padding: '14px 20px',
                                border: '2px solid #e8ecf1',
                                fontSize: '15px',
                                backgroundColor: !formData.school ? '#e9ecef' : '#f8f9fa',
                                cursor: !formData.school ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s ease'
                              }}
                              onFocus={(e) => {
                                if (formData.school) {
                                  e.target.style.borderColor = '#667eea';
                                  e.target.style.backgroundColor = '#ffffff';
                                  e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                                }
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e8ecf1';
                                e.target.style.backgroundColor = !formData.school ? '#e9ecef' : '#f8f9fa';
                                e.target.style.boxShadow = 'none';
                              }}
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
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                              <i className="bi bi-people-fill me-2" style={{ color: '#667eea' }}></i>
                              Lớp <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              name="class"
                              placeholder="VD: CNTT-K15"
                              value={formData.class}
                              onChange={e => setFormData({ ...formData, class: e.target.value })}
                              required
                              aria-label="Lớp"
                              style={{
                                borderRadius: '12px',
                                padding: '14px 20px',
                                border: '2px solid #e8ecf1',
                                fontSize: '15px',
                                backgroundColor: '#f8f9fa',
                                transition: 'all 0.3s ease'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#667eea';
                                e.target.style.backgroundColor = '#ffffff';
                                e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e8ecf1';
                                e.target.style.backgroundColor = '#f8f9fa';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                          </div>

                          <div className="col-12">
                            <hr className="my-4" style={{ borderColor: '#e8ecf1' }} />
                            <div className="text-center mb-4">
                              <div style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '12px'
                              }}>
                                <i className="bi bi-lock-fill text-white" style={{ fontSize: '24px' }}></i>
                              </div>
                              <p className="text-muted mb-0" style={{ fontSize: '14px', fontWeight: 500 }}>
                                Tạo mật khẩu để bảo vệ tài khoản
                              </p>
                            </div>
                          </div>

                          <div className="col-md-6 mb-4">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                              <i className="bi bi-lock-fill me-2" style={{ color: '#667eea' }}></i>
                              Mật khẩu <span className="text-danger">*</span>
                            </label>
                            <div className="position-relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                className="form-control"
                                name="password"
                                placeholder="Tối thiểu 6 ký tự"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                required
                                autoComplete="new-password"
                                aria-label="Mật khẩu"
                                style={{
                                  borderRadius: '12px',
                                  padding: '14px 20px',
                                  paddingRight: '48px',
                                  border: '2px solid #e8ecf1',
                                  fontSize: '15px',
                                  backgroundColor: '#f8f9fa',
                                  transition: 'all 0.3s ease'
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor = '#667eea';
                                  e.target.style.backgroundColor = '#ffffff';
                                  e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = '#e8ecf1';
                                  e.target.style.backgroundColor = '#f8f9fa';
                                  e.target.style.boxShadow = 'none';
                                }}
                              />
                              <button
                                type="button"
                                className="btn btn-link position-absolute"
                                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                style={{
                                  right: '8px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  color: '#999',
                                  padding: '8px'
                                }}
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`} style={{ fontSize: '20px' }}></i>
                              </button>
                            </div>
                          </div>

                          <div className="col-md-6 mb-4">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                              <i className="bi bi-shield-lock-fill me-2" style={{ color: '#667eea' }}></i>
                              Xác nhận mật khẩu <span className="text-danger">*</span>
                            </label>
                            <div className="position-relative">
                              <input
                                type={showConfirmPassword ? "text" : "password"}
                                className="form-control"
                                name="confirmPassword"
                                placeholder="Nhập lại mật khẩu"
                                value={formData.confirmPassword}
                                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                                autoComplete="new-password"
                                aria-label="Xác nhận mật khẩu"
                                style={{
                                  borderRadius: '12px',
                                  padding: '14px 20px',
                                  paddingRight: '48px',
                                  border: '2px solid #e8ecf1',
                                  fontSize: '15px',
                                  backgroundColor: '#f8f9fa',
                                  transition: 'all 0.3s ease'
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor = '#667eea';
                                  e.target.style.backgroundColor = '#ffffff';
                                  e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = '#e8ecf1';
                                  e.target.style.backgroundColor = '#f8f9fa';
                                  e.target.style.boxShadow = 'none';
                                }}
                              />
                              <button
                                type="button"
                                className="btn btn-link position-absolute"
                                aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                                style={{
                                  right: '8px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  color: '#999',
                                  padding: '8px'
                                }}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                <i className={`bi ${showConfirmPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`} style={{ fontSize: '20px' }}></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error/Success messages */}
                    {error && (
                      <div
                        className="alert alert-danger d-flex align-items-center mb-4"
                        role="alert"
                        style={{
                          borderRadius: '12px',
                          fontSize: '14px',
                          backgroundColor: '#fff5f5',
                          border: '2px solid #feb2b2',
                          color: '#c53030'
                        }}
                      >
                        <i className="bi bi-exclamation-triangle-fill me-2" style={{ fontSize: '22px' }}></i>
                        <span>{error}</span>
                      </div>
                    )}
                    {success && (
                      <div
                        className="alert alert-success d-flex align-items-center mb-4"
                        role="alert"
                        style={{
                          borderRadius: '12px',
                          fontSize: '14px',
                          backgroundColor: '#f0fdf4',
                          border: '2px solid #86efac',
                          color: '#15803d'
                        }}
                      >
                        <i className="bi bi-check-circle-fill me-2" style={{ fontSize: '22px' }}></i>
                        <span>{success}</span>
                      </div>
                    )}

                    {/* Step 3: Email Verification */}
                    {step === 3 && needsVerification && (
                      <div>
                        <div className="text-center mb-4">
                          <div style={{
                            width: '70px',
                            height: '70px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)'
                          }}>
                            <i className="bi bi-envelope-check-fill text-white" style={{ fontSize: '32px' }}></i>
                          </div>
                          <h5 className="mt-3 mb-2" style={{ fontWeight: 700, fontSize: '20px' }}>Xác thực email</h5>
                          <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                            Email đã được gửi đến <strong>{verificationEmail}</strong>
                          </p>
                        </div>

                        <div className="alert alert-info mb-4" style={{ borderRadius: '12px', backgroundColor: '#e0f2fe', border: '2px solid #7dd3fc' }}>
                          <h6 className="alert-heading mb-2" style={{ fontSize: '15px', fontWeight: 600 }}>
                            <i className="bi bi-info-circle-fill me-2"></i>
                            Chọn một trong hai cách xác thực:
                          </h6>
                          <ul className="mb-0" style={{ fontSize: '14px', paddingLeft: '20px' }}>
                            <li className="mb-1">
                              <strong>Cách 1 (Khuyên dùng):</strong> Nhấn nút <strong>"Xác thực ngay"</strong> trong email
                            </li>
                            <li>
                              <strong>Cách 2:</strong> Nhập mã 6 chữ số từ email vào ô bên dưới
                            </li>
                          </ul>
                        </div>

                        <div className="mb-4">
                          <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                            <i className="bi bi-123 me-2" style={{ color: '#667eea' }}></i>
                            Mã xác thực (6 chữ số)
                          </label>
                          <input
                            type="text"
                            className="form-control text-center"
                            placeholder="000000"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength={6}
                            style={{
                              borderRadius: '12px',
                              padding: '18px 20px',
                              border: '2px solid #e8ecf1',
                              fontSize: '24px',
                              fontWeight: 'bold',
                              letterSpacing: '8px',
                              backgroundColor: '#f8f9fa',
                              fontFamily: 'monospace'
                            }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleVerifyEmail}
                          disabled={verifying || verificationCode.length !== 6}
                          className="btn btn-primary w-100 mb-3"
                          style={{
                            borderRadius: '12px',
                            padding: '14px',
                            fontWeight: 600,
                            fontSize: '16px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)'
                          }}
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
                          <p className="text-muted mb-2" style={{ fontSize: '14px' }}>
                            Không nhận được email?
                          </p>
                          <button
                            type="button"
                            onClick={handleResendCode}
                            disabled={resendCooldown > 0}
                            className="btn btn-outline-secondary"
                            style={{
                              borderRadius: '12px',
                              padding: '10px 24px',
                              fontSize: '14px',
                              borderWidth: '2px'
                            }}
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
                            className="btn btn-outline-secondary"
                            onClick={handleBack}
                            aria-label="Quay lại bước trước"
                            style={{
                              borderRadius: '12px',
                              padding: '14px 24px',
                              fontWeight: 600,
                              fontSize: '15px',
                              flex: '1',
                              borderWidth: '2px',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = 'none';
                            }}
                          >
                            <i className="bi bi-arrow-left me-2"></i>
                            Quay lại
                          </button>
                        )}

                        {step === 1 ? (
                          <button
                            type="button"
                            className="btn btn-primary w-100"
                            onClick={handleNext}
                            aria-label="Tiếp tục đến bước 2"
                            style={{
                              borderRadius: '12px',
                              padding: '14px',
                              fontWeight: 600,
                              fontSize: '16px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              border: 'none',
                              boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                            }}
                          >
                            Tiếp tục
                            <i className="bi bi-arrow-right ms-2"></i>
                          </button>
                        ) : (
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            aria-label="Hoàn tất đăng ký tài khoản"
                            style={{
                              borderRadius: '12px',
                              padding: '14px 24px',
                              fontWeight: 600,
                              fontSize: '16px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              border: 'none',
                              boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                              flex: '2',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!loading) {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.5)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                            }}
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
                  <div className="position-relative my-4">
                    <hr style={{ borderColor: '#e8ecf1', margin: '0' }} />
                    <span
                      className="position-absolute top-50 start-50 translate-middle px-3"
                      style={{
                        fontSize: '13px',
                        color: '#999',
                        backgroundColor: 'white',
                        fontWeight: 500
                      }}
                    >
                      hoặc
                    </span>
                  </div>

                  {/* Login link */}
                  <div className="text-center">
                    <p className="mb-0" style={{ fontSize: '15px', color: '#666' }}>
                      Đã có tài khoản?{' '}
                      <Link
                        to="/login"
                        className="text-decoration-none"
                        style={{
                          color: '#667eea',
                          fontWeight: 700,
                          transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#764ba2'}
                        onMouseLeave={(e) => e.target.style.color = '#667eea'}
                      >
                        Đăng nhập ngay
                      </Link>
                    </p>
                  </div>
                </div>
              </div>

              {/* Back to home */}
              <div className="text-center mt-4">
                <Link
                  to="/"
                  className="text-decoration-none d-flex align-items-center justify-content-center"
                  aria-label="Quay về trang chủ"
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#667eea',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#764ba2'}
                  onMouseLeave={(e) => e.target.style.color = '#667eea'}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Quay về trang chủ
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
