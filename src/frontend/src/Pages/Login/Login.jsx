
import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { login } from '../../Utils/api';
import { AuthContext } from "../../Context/AuthContext";
import { useNavigate } from 'react-router-dom';
import '../../assets/css/Login.css';
export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { updateAuth } = useContext(AuthContext);
  const navigate = useNavigate();

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
          navigate(`/register?step=3&email=${encodeURIComponent(data.email)}`);
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

      <div className="login-container">
        <div className="login-wrapper">
          <div className="row justify-content-center">
            <div className="col-12">
              <div className="card border-0 shadow-lg overflow-hidden login-card">
                <div className="row g-0 login-card-row">
                  {/* Left Side - Image */}
                  <div className="col-lg-5 d-none d-lg-block position-relative">
                    <div className="login-image-container">
                      <img 
                        src="/login-page-img.png" 
                        alt="Student Login Illustration" 
                        className="login-image"
                      />
                    </div>
                  </div>

                  {/* Right Side - Login Form */}
                  <div className="col-lg-7 d-flex align-items-center">
                    <div className="w-100 p-4 p-md-5 p-lg-5">
                      {/* Mobile Header */}
                      <div className="d-lg-none text-center mb-4">
                        <div className="login-mobile-icon">
                          <i className="bi bi-mortarboard-fill"></i>
                        </div>
                      </div>

                      <h3 className="mb-2 text-center text-lg-start login-header-title">
                        Đăng nhập
                      </h3>
                      <p className="text-center text-lg-start login-header-subtitle">
                        Chào mừng bạn quay trở lại!
                      </p>

                      <form onSubmit={handleSubmit}>
                        {/* Username input */}
                        <div className="mb-4">
                          <label htmlFor="username" className="form-label login-label">
                            <i className="bi bi-person-fill"></i>
                            Email hoặc username
                          </label>
                          <div className="position-relative">
                            <input
                              type="text"
                              className="form-control login-input login-input-with-icon"
                              id="username"
                              name="username"
                              placeholder="Nhập email hoặc username"
                              value={username}
                              onChange={e => setUsername(e.target.value)}
                              required
                              autoComplete="username"
                              aria-label="Email hoặc username"
                            />
                          </div>
                        </div>

                        {/* Password input */}
                        <div className="mb-4">
                          <label htmlFor="password" className="form-label login-label">
                            <i className="bi bi-lock-fill"></i>
                            Mật khẩu
                          </label>
                          <div className="position-relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              className="form-control login-input login-input-with-icon login-input-with-icon-right"
                              id="password"
                              name="password"
                              placeholder="Nhập mật khẩu"
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              required
                              autoComplete="current-password"
                              aria-label="Mật khẩu"
                            />
                            <button
                              type="button"
                              className="btn btn-link login-password-toggle"
                              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                            </button>
                          </div>
                        </div>

                        {/* Remember me & Forgot password */}
                        <div className="d-flex justify-content-between align-items-center mb-4">
                          <div className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input login-checkbox"
                              id="rememberMe"
                              checked={rememberMe}
                              onChange={e => setRememberMe(e.target.checked)}
                            />
                            <label className="form-check-label login-checkbox-label" htmlFor="rememberMe">
                              Ghi nhớ đăng nhập
                            </label>
                          </div>
                          <Link
                            to="/forgot-password"
                            className="login-link"
                          >
                            Quên mật khẩu?
                          </Link>
                        </div>

                        {/* Error message */}
                        {error && (
                          <div className="alert login-alert-danger mb-4" role="alert">
                            <i className="bi bi-exclamation-triangle-fill"></i>
                            <span>{error}</span>
                          </div>
                        )}

                        {/* Submit button */}
                        <button
                          type="submit"
                          className="btn login-btn-primary w-100 mb-4"
                          disabled={loading}
                          aria-label="Đăng nhập vào hệ thống"
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
                      <div className="login-divider">
                        <hr />
                        <span>hoặc</span>
                      </div>

                      {/* Register link */}
                      <div className="text-center">
                        <p className="mb-0 login-text-muted">
                          Chưa có tài khoản?{' '}
                          <Link to="/register" className="login-link login-link-bold">
                            Đăng ký ngay
                          </Link>
                        </p>
                      </div>

                      {/* Back to home */}
                      <div className="text-center mt-4">
                        <Link
                          to="/"
                          className="login-back-link"
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
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
