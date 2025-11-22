
import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { login } from '../../Utils/api';
import { AuthContext } from "../../Context/AuthContext";

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { updateAuth } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login({ username, password });
      if (data.token) {
        localStorage.setItem('token', data.token);
        updateAuth({ token: data.token });
        window.location.href = '/';
      } else {
        // Kiểm tra nếu lỗi do chưa xác thực email
        if (data.requiresVerification && data.email) {
          // Chuyển đến trang đăng ký với step 3 (verification)
          window.location.href = `/register?step=3&email=${encodeURIComponent(data.email)}`;
        } else {
          setError(data.error || 'Đăng nhập thất bại');
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || 'Đăng nhập thất bại');
    }
    setLoading(false);
  };

  return (
    <React.Fragment>
      <Helmet>
        <title>Đăng nhập - Diễn đàn Sinh viên | Kết nối và Học tập</title>
        <meta name="description" content="Đăng nhập vào diễn đàn sinh viên để kết nối, chia sẻ kiến thức và trao đổi học tập cùng cộng đồng sinh viên trên toàn quốc." />
        <meta name="keywords" content="đăng nhập, sinh viên, diễn đàn, học tập, kết nối, cộng đồng sinh viên" />
        <meta property="og:title" content="Đăng nhập - Diễn đàn Sinh viên" />
        <meta property="og:description" content="Đăng nhập để kết nối với cộng đồng sinh viên, chia sẻ kiến thức và trải nghiệm học tập" />
        <meta property="og:type" content="website" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <div 
        className="py-5" 
        // style={{
        //   minHeight: 'calc(100vh - 200px)',
        //   background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        //   padding: '40px 20px'
        // }}
      >
        <div className="">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
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
                    <i className="bi bi-mortarboard-fill" style={{ fontSize: '42px' }}></i>
                  </div>
                  <h3 className="mb-2" style={{ fontWeight: 700, fontSize: '28px' }}>Đăng nhập</h3>
                  <p className="mb-0" style={{ opacity: 0.95, fontSize: '15px', fontWeight: 500 }}>
                    Chào mừng bạn quay trở lại!
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="card-body p-5">
                <form onSubmit={handleSubmit}>
                  {/* Username input */}
                  <div className="mb-4">
                    <label htmlFor="username" className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                      <i className="bi bi-person-fill me-2" style={{ color: '#667eea' }}></i>
                      Email, username hoặc số điện thoại
                    </label>
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control"
                        id="username"
                        name="username"
                        placeholder="Nhập email, username hoặc số điện thoại"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                        autoComplete="username"
                        aria-label="Email, username hoặc số điện thoại"
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
                      <i className="bi bi-person" style={{
                        position: 'absolute',
                        left: '18px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '20px',
                        color: '#999'
                      }}></i>
                    </div>
                  </div>

                  {/* Password input */}
                  <div className="mb-4">
                    <label htmlFor="password" className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                      <i className="bi bi-lock-fill me-2" style={{ color: '#667eea' }}></i>
                      Mật khẩu
                    </label>
                    <div className="position-relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-control"
                        id="password"
                        name="password"
                        placeholder="Nhập mật khẩu"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        aria-label="Mật khẩu"
                        style={{
                          borderRadius: '12px',
                          padding: '14px 20px',
                          paddingLeft: '48px',
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

                  {/* Remember me & Forgot password */}
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        style={{ 
                          cursor: 'pointer',
                          width: '18px',
                          height: '18px',
                          borderColor: '#667eea'
                        }}
                      />
                      <label className="form-check-label ms-2" htmlFor="rememberMe" style={{ fontSize: '14px', cursor: 'pointer', color: '#555' }}>
                        Ghi nhớ đăng nhập
                      </label>
                    </div>
                    <Link 
                      to="/forgot-password" 
                      className="text-decoration-none"
                      style={{ 
                        fontSize: '14px', 
                        color: '#667eea', 
                        fontWeight: 600,
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.color = '#764ba2'}
                      onMouseLeave={(e) => e.target.style.color = '#667eea'}
                    >
                      Quên mật khẩu?
                    </Link>
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
                    aria-label="Đăng nhập vào hệ thống"
                    style={{
                      borderRadius: '12px',
                      padding: '14px',
                      fontWeight: 600,
                      fontSize: '16px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden'
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
                        Đang đăng nhập...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        Đăng nhập
                      </>
                    )}
                  </button>
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

                {/* Register link */}
                <div className="text-center">
                  <p className="mb-0" style={{ fontSize: '15px', color: '#666' }}>
                    Chưa có tài khoản?{' '}
                    <Link 
                      to="/register" 
                      className="text-decoration-none"
                      style={{ 
                        color: '#667eea', 
                        fontWeight: 700,
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.color = '#764ba2'}
                      onMouseLeave={(e) => e.target.style.color = '#667eea'}
                    >
                      Đăng ký ngay
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
