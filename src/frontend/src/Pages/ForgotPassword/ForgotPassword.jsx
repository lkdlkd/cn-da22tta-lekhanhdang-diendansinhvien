import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { forgotPassword, verifyResetCode, resetPassword } from '../../Utils/api';
import Swal from 'sweetalert2';

export function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [showCodeInput, setShowCodeInput] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [token, setToken] = useState('');
    const [codeVerified, setCodeVerified] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [verifyingCode, setVerifyingCode] = useState(false);
    const [resettingPassword, setResettingPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const data = await forgotPassword(email);
            if (data.success === false) {
                throw new Error(data.error || 'Có lỗi xảy ra');
            }
            setSuccess(data.message || 'Link đặt lại mật khẩu đã được gửi đến email của bạn.');
            setEmailSent(true);
            setShowCodeInput(true);
        } catch (err) {
            console.error('Forgot password error:', err);
            setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');
        setVerifyingCode(true);

        try {
            const data = await verifyResetCode(email, verificationCode);
            if (data.success === false) {
                throw new Error(data.error || 'Mã xác thực không đúng');
            }
            setToken(data.token);
            setCodeVerified(true);
            setSuccess('Mã xác thực hợp lệ. Vui lòng nhập mật khẩu mới.');
        } catch (err) {
            console.error('Verify code error:', err);
            setError(err.message || 'Mã xác thực không đúng hoặc đã hết hạn.');
        } finally {
            setVerifyingCode(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        setResettingPassword(true);

        try {
            const response = await resetPassword(token, newPassword, email, verificationCode);
            if (!response.success) {
                throw new Error(response.error || 'Đặt lại mật khẩu thất bại');
            }

            await Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                text: 'Mật khẩu của bạn đã được đặt lại thành công',
                confirmButtonText: 'Đăng nhập ngay',
                confirmButtonColor: '#667eea'
            });
            navigate('/login');
        } catch (err) {
            console.error('Reset password error:', err);
            setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setResettingPassword(false);
        }
    };

    return (
        <React.Fragment>
            <Helmet>
                <title>Quên mật khẩu - Diễn đàn Sinh viên</title>
                <meta name="description" content="Đặt lại mật khẩu tài khoản diễn đàn sinh viên của bạn" />
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>

            <div className="py-5">
                <div className="">
                    <div className="row justify-content-center">
                        <div className="col-md-6 col-lg-5">
                            <div
                                className="card border-0 shadow-lg"
                                style={{
                                    borderRadius: '20px',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Header */}
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
                                            <i className="bi bi-key-fill" style={{ fontSize: '42px' }}></i>
                                        </div>
                                        <h3 className="mb-2" style={{ fontWeight: 700, fontSize: '28px' }}>
                                            {emailSent ? 'Kiểm tra email' : 'Quên mật khẩu'}
                                        </h3>
                                        <p className="mb-0" style={{ opacity: 0.95, fontSize: '15px', fontWeight: 500 }}>
                                            {emailSent ? 'Chúng tôi đã gửi link đặt lại mật khẩu' : 'Đừng lo, chúng tôi sẽ giúp bạn'}
                                        </p>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="card-body p-5">
                                    {!emailSent ? (
                                        <form onSubmit={handleSubmit}>
                                            <p className="text-muted mb-4 text-center" style={{ fontSize: '15px' }}>
                                                Nhập email của bạn và chúng tôi sẽ gửi link đặt lại mật khẩu cùng mã xác thực
                                            </p>

                                            {/* Email input */}
                                            <div className="mb-4">
                                                <label htmlFor="email" className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                                                    <i className="bi bi-envelope-fill me-2" style={{ color: '#667eea' }}></i>
                                                    Email (@st.tvu.edu.vn hoặc @gmail.com)
                                                </label>
                                                <div className="position-relative">
                                                    <input
                                                        type="email"
                                                        className="form-control"
                                                        id="email"
                                                        placeholder="Nhập email của bạn"
                                                        value={email}
                                                        onChange={e => setEmail(e.target.value)}
                                                        required
                                                        style={{
                                                            borderRadius: '12px',
                                                            padding: '14px 20px',
                                                            paddingLeft: '48px',
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
                                                    <i className="bi bi-envelope" style={{
                                                        position: 'absolute',
                                                        left: '18px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        fontSize: '20px',
                                                        color: '#999'
                                                    }}></i>
                                                </div>
                                            </div>

                                            {/* Error message */}
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

                                            {/* Submit button */}
                                            <button
                                                type="submit"
                                                className="btn btn-primary w-100 mb-4"
                                                disabled={loading}
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
                                                {loading ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                        Đang gửi...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-send-fill me-2"></i>
                                                        Gửi link đặt lại mật khẩu
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    ) : (
                                        <div>
                                            {/* Success message */}
                                            {success && (
                                                <div
                                                    className="alert alert-success mb-4"
                                                    role="alert"
                                                    style={{
                                                        borderRadius: '12px',
                                                        fontSize: '15px',
                                                        backgroundColor: '#f0fdf4',
                                                        border: '2px solid #86efac',
                                                        color: '#166534'
                                                    }}
                                                >
                                                    <i className="bi bi-check-circle-fill me-2" style={{ fontSize: '20px' }}></i>
                                                    <strong>{success}</strong>
                                                </div>
                                            )}

                                            {/* Error message */}
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

                                            {!codeVerified ? (
                                                <>
                                                    <div className="bg-light p-4 rounded-3 mb-4" style={{ border: '2px solid #e8ecf1' }}>
                                                        <p className="text-muted mb-2" style={{ fontSize: '14px' }}>
                                                            <strong>📧 Đã gửi email đến:</strong> <span className="text-primary">{email}</span>
                                                        </p>
                                                        <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                                                            Email chứa <strong>mã xác thực 6 số</strong>. Vui lòng nhập mã để tiếp tục.
                                                        </p>
                                                    </div>

                                                    <form onSubmit={handleVerifyCode}>
                                                        <div className="mb-4">
                                                            <label htmlFor="code" className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                                                                <i className="bi bi-shield-lock-fill me-2" style={{ color: '#667eea' }}></i>
                                                                Mã xác thực (6 số)
                                                            </label>
                                                            <div className="position-relative">
                                                                <input
                                                                    type="text"
                                                                    className="form-control text-center"
                                                                    id="code"
                                                                    placeholder="000000"
                                                                    value={verificationCode}
                                                                    onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                                    required
                                                                    maxLength={6}
                                                                    style={{
                                                                        borderRadius: '12px',
                                                                        padding: '14px 20px',
                                                                        border: '2px solid #e8ecf1',
                                                                        fontSize: '24px',
                                                                        fontWeight: 'bold',
                                                                        letterSpacing: '8px',
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

                                                        <button
                                                            type="submit"
                                                            className="btn btn-primary w-100 mb-3"
                                                            disabled={verifyingCode || verificationCode.length !== 6}
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
                                                        >
                                                            {verifyingCode ? (
                                                                <>
                                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                                    Đang xác thực...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="bi bi-check-circle-fill me-2"></i>
                                                                    Xác thực mã
                                                                </>
                                                            )}
                                                        </button>
                                                    </form>

                                                    <button
                                                        className="btn btn-outline-secondary w-100 mb-3"
                                                        onClick={() => {
                                                            setEmailSent(false);
                                                            setSuccess('');
                                                            setError('');
                                                            setVerificationCode('');
                                                        }}
                                                        style={{ borderRadius: '12px', padding: '12px', fontWeight: 600 }}
                                                    >
                                                        <i className="bi bi-arrow-clockwise me-2"></i>
                                                        Gửi lại email
                                                    </button>

                                                    <div className="alert alert-warning" style={{ fontSize: '13px', borderRadius: '12px' }}>
                                                        <i className="bi bi-info-circle-fill me-2"></i>
                                                        <strong>Lưu ý:</strong> Mã sẽ hết hạn sau 10 phút
                                                    </div>
                                                </>
                                            ) : (
                                                <form onSubmit={handleResetPassword}>
                                                    <p className="text-muted mb-4 text-center" style={{ fontSize: '15px' }}>
                                                        Nhập mật khẩu mới cho tài khoản của bạn
                                                    </p>

                                                    {/* New password */}
                                                    <div className="mb-4">
                                                        <label htmlFor="newPassword" className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                                                            <i className="bi bi-lock-fill me-2" style={{ color: '#667eea' }}></i>
                                                            Mật khẩu mới
                                                        </label>
                                                        <div className="position-relative">
                                                            <input
                                                                type={showPassword ? 'text' : 'password'}
                                                                className="form-control"
                                                                id="newPassword"
                                                                placeholder="Nhập mật khẩu mới"
                                                                value={newPassword}
                                                                onChange={e => setNewPassword(e.target.value)}
                                                                required
                                                                minLength={6}
                                                                style={{
                                                                    borderRadius: '12px',
                                                                    padding: '14px 50px 14px 48px',
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
                                                            <i className="bi bi-lock" style={{
                                                                position: 'absolute',
                                                                left: '18px',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                                fontSize: '20px',
                                                                color: '#999'
                                                            }}></i>
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: '15px',
                                                                    top: '50%',
                                                                    transform: 'translateY(-50%)',
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    color: '#999',
                                                                    fontSize: '20px'
                                                                }}
                                                            >
                                                                <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Confirm password */}
                                                    <div className="mb-4">
                                                        <label htmlFor="confirmPassword" className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                                                            <i className="bi bi-lock-fill me-2" style={{ color: '#667eea' }}></i>
                                                            Xác nhận mật khẩu
                                                        </label>
                                                        <div className="position-relative">
                                                            <input
                                                                type={showConfirmPassword ? 'text' : 'password'}
                                                                className="form-control"
                                                                id="confirmPassword"
                                                                placeholder="Nhập lại mật khẩu mới"
                                                                value={confirmPassword}
                                                                onChange={e => setConfirmPassword(e.target.value)}
                                                                required
                                                                style={{
                                                                    borderRadius: '12px',
                                                                    padding: '14px 50px 14px 48px',
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
                                                            <i className="bi bi-lock" style={{
                                                                position: 'absolute',
                                                                left: '18px',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                                fontSize: '20px',
                                                                color: '#999'
                                                            }}></i>
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: '15px',
                                                                    top: '50%',
                                                                    transform: 'translateY(-50%)',
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    color: '#999',
                                                                    fontSize: '20px'
                                                                }}
                                                            >
                                                                <i className={showConfirmPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        className="btn btn-primary w-100"
                                                        disabled={resettingPassword}
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
                                                    >
                                                        {resettingPassword ? (
                                                            <>
                                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                                Đang đặt lại mật khẩu...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-check-circle-fill me-2"></i>
                                                                Đặt lại mật khẩu
                                                            </>
                                                        )}
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    )}

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

                                    {/* Back to login */}
                                    <div className="text-center">
                                        <p className="mb-0" style={{ fontSize: '15px', color: '#666' }}>
                                            Nhớ mật khẩu rồi?{' '}
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
