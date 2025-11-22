import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { resetPassword } from '../../Utils/api';

export function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const tokenParam = searchParams.get('token');
        if (tokenParam) {
            setToken(tokenParam);
        } else {
            setError('Liên kết không hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu mới.');
        }
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!token) {
            setError('Liên kết không hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu mới.');
            return;
        }

        if (newPassword.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        setLoading(true);

        try {
            const data = await resetPassword(token, newPassword);
            setSuccess(data.message || 'Đặt lại mật khẩu thành công!');

            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            console.error('Reset password error:', err);
            setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <React.Fragment>
            <Helmet>
                <title>Đặt lại mật khẩu - Diễn đàn Sinh viên</title>
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
                                            <i className="bi bi-shield-lock-fill" style={{ fontSize: '42px' }}></i>
                                        </div>
                                        <h3 className="mb-2" style={{ fontWeight: 700, fontSize: '28px' }}>
                                            Đặt lại mật khẩu
                                        </h3>
                                        <p className="mb-0" style={{ opacity: 0.95, fontSize: '15px', fontWeight: 500 }}>
                                            Tạo mật khẩu mới cho tài khoản của bạn
                                        </p>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="card-body p-5">
                                    {success ? (
                                        <div className="text-center">
                                            {/* Success icon */}
                                            <div style={{
                                                width: '80px',
                                                height: '80px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                margin: '0 auto 24px'
                                            }}>
                                                <i className="bi bi-check-circle-fill" style={{ fontSize: '42px', color: 'white' }}></i>
                                            </div>

                                            {/* Success message */}
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

                                            <p className="text-muted mb-4">Đang chuyển đến trang đăng nhập...</p>

                                            <Link
                                                to="/login"
                                                className="btn btn-primary w-100"
                                                style={{
                                                    borderRadius: '12px',
                                                    padding: '14px',
                                                    fontWeight: 600,
                                                    fontSize: '16px',
                                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    border: 'none'
                                                }}
                                            >
                                                <i className="bi bi-box-arrow-in-right me-2"></i>
                                                Đăng nhập ngay
                                            </Link>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit}>
                                            {/* New password */}
                                            <div className="mb-3">
                                                <label htmlFor="newPassword" className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                                                    <i className="bi bi-lock-fill me-2" style={{ color: '#667eea' }}></i>
                                                    Mật khẩu mới
                                                </label>
                                                <div className="position-relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        className="form-control"
                                                        id="newPassword"
                                                        placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                                                        value={newPassword}
                                                        onChange={e => setNewPassword(e.target.value)}
                                                        required
                                                        minLength="6"
                                                        style={{
                                                            borderRadius: '12px',
                                                            padding: '14px 48px 14px 20px',
                                                            border: '2px solid #e8ecf1',
                                                            fontSize: '15px'
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn btn-link position-absolute"
                                                        style={{
                                                            right: '8px',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            color: '#999'
                                                        }}
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`} style={{ fontSize: '20px' }}></i>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Confirm password */}
                                            <div className="mb-4">
                                                <label htmlFor="confirmPassword" className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                                                    <i className="bi bi-lock-fill me-2" style={{ color: '#667eea' }}></i>
                                                    Xác nhận mật khẩu
                                                </label>
                                                <div className="position-relative">
                                                    <input
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        className="form-control"
                                                        id="confirmPassword"
                                                        placeholder="Nhập lại mật khẩu mới"
                                                        value={confirmPassword}
                                                        onChange={e => setConfirmPassword(e.target.value)}
                                                        required
                                                        minLength="6"
                                                        style={{
                                                            borderRadius: '12px',
                                                            padding: '14px 48px 14px 20px',
                                                            border: '2px solid #e8ecf1',
                                                            fontSize: '15px'
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn btn-link position-absolute"
                                                        style={{
                                                            right: '8px',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            color: '#999'
                                                        }}
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    >
                                                        <i className={`bi ${showConfirmPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`} style={{ fontSize: '20px' }}></i>
                                                    </button>
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
                                                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)'
                                                }}
                                            >
                                                {loading ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                                        Đang xử lý...
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
                                    {!success && (
                                        <>
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
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        Đăng nhập ngay
                                                    </Link>
                                                </p>
                                            </div>
                                        </>
                                    )}
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
                                        color: '#667eea'
                                    }}
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
