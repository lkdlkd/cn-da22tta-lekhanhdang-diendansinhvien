
import React, { useState } from 'react';
import { login } from '../../Utils/api';
import { AuthContext } from "../../Context/AuthContext";
import { useContext } from 'react';
export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { updateAuth } = useContext(AuthContext); // Lấy updateAuth từ AuthContext

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login({ username, password });
      if (data.token) {
        // Lưu token vào localStorage nếu cần
        localStorage.setItem('token', data.token);
        updateAuth({ token: data.token });

        // TODO: chuyển hướng hoặc lưu user info
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
    <div className="container d-flex align-items-center justify-content-center min-vh-100">
      <div className="card shadow-lg p-4" style={{ maxWidth: 400, width: '100%' }}>
        <div className="card-body">
          <h3 className="card-title text-center mb-4">Đăng nhập</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">Email, username hoặc số điện thoại</label>
              <input
                type="text"
                className="form-control"
                id="username"
                placeholder="Nhập email, username hoặc số điện thoại"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Mật khẩu</label>
              <input
                type="password"
                className="form-control"
                id="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="rememberMe"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="rememberMe">Ghi nhớ đăng nhập</label>
            </div>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
          <div className="mt-3 text-center">
            <a href="/register" className="text-decoration-none">Chưa có tài khoản? Đăng ký ngay</a>
          </div>
        </div>
      </div>
    </div>
  );
}
