
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { login } from '../../Utils/api';
import { AuthContext } from "../../Context/AuthContext";
import { useContext } from 'react';

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
        setError(data.error || 'Đăng nhập thất bại');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || 'Đăng nhập thất bại');
    }
    setLoading(false);
  };

  return (
    <div 
      className="min-vh-100 d-flex align-items-center justify-content-center" 
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-5">
            <div 
              className="card border-0 shadow-lg" 
              style={{ 
                borderRadius: '16px',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div 
                className="card-header text-white text-center py-4" 
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none'
                }}
              >
                <i className="ph-duotone ph-graduation-cap" style={{ fontSize: '48px' }}></i>
                <h3 className="mt-2 mb-1" style={{ fontWeight: 700 }}>Đăng nhập</h3>
                <p className="mb-0" style={{ opacity: 0.9, fontSize: '14px' }}>
                  Chào mừng bạn trở lại!
                </p>
              </div>

              {/* Body */}
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  {/* Username input */}
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                      <i className="ph ph-user me-2"></i>
                      Email, username hoặc số điện thoại
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="username"
                      placeholder="Nhập email, username hoặc số điện thoại"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required
                      style={{
                        borderRadius: '10px',
                        padding: '12px 16px',
                        border: '2px solid #e0e0e0',
                        fontSize: '14px'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                    />
                  </div>

                  {/* Password input */}
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                      <i className="ph ph-lock-key me-2"></i>
                      Mật khẩu
                    </label>
                    <div className="position-relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-control"
                        id="password"
                        placeholder="Nhập mật khẩu"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        style={{
                          borderRadius: '10px',
                          padding: '12px 16px',
                          paddingRight: '45px',
                          border: '2px solid #e0e0e0',
                          fontSize: '14px'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute"
                        style={{
                          right: '5px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#999'
                        }}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <i className={`ph ${showPassword ? 'ph-eye-slash' : 'ph-eye'}`}></i>
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
                        style={{ cursor: 'pointer' }}
                      />
                      <label className="form-check-label" htmlFor="rememberMe" style={{ fontSize: '14px', cursor: 'pointer' }}>
                        Ghi nhớ đăng nhập
                      </label>
                    </div>
                    <Link 
                      to="/forgot-password" 
                      className="text-decoration-none"
                      style={{ fontSize: '14px', color: '#667eea', fontWeight: 600 }}
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>

                  {/* Error message */}
                  {error && (
                    <div 
                      className="alert alert-danger d-flex align-items-center" 
                      style={{ borderRadius: '10px', fontSize: '14px' }}
                    >
                      <i className="ph ph-warning-circle me-2" style={{ fontSize: '20px' }}></i>
                      {error}
                    </div>
                  )}

                  {/* Submit button */}
                  <button 
                    type="submit" 
                    className="btn btn-primary w-100"
                    disabled={loading}
                    style={{
                      borderRadius: '10px',
                      padding: '12px',
                      fontWeight: 600,
                      fontSize: '15px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Đang đăng nhập...
                      </>
                    ) : (
                      <>
                        <i className="ph ph-sign-in me-2"></i>
                        Đăng nhập
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="position-relative my-4">
                  <hr style={{ borderColor: '#e0e0e0' }} />
                  <span 
                    className="position-absolute top-50 start-50 translate-middle bg-white px-3"
                    style={{ fontSize: '13px', color: '#999' }}
                  >
                    hoặc
                  </span>
                </div>

                {/* Register link */}
                <div className="text-center">
                  <p className="mb-0" style={{ fontSize: '14px', color: '#666' }}>
                    Chưa có tài khoản?{' '}
                    <Link 
                      to="/register" 
                      className="text-decoration-none"
                      style={{ color: '#667eea', fontWeight: 700 }}
                    >
                      Đăng ký ngay
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Back to home */}
            <div className="text-center mt-3">
              <Link 
                to="/" 
                className="text-white text-decoration-none d-flex align-items-center justify-content-center"
                style={{ fontSize: '14px', fontWeight: 600 }}
              >
                <i className="ph ph-arrow-left me-2"></i>
                Quay về trang chủ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
