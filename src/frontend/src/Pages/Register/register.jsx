
import React, { useState } from 'react';

const faculties = [
  'Khoa Công nghệ thông tin',
  'Khoa Kỹ thuật phần mềm',
  'Khoa Khoa học máy tính',
  'Khoa An toàn thông tin',
  'Khoa Quản trị kinh doanh',
  'Khoa Kế toán',
  'Khoa Marketing',
  'Khoa Luật',
  'Khoa Ngôn ngữ Anh',
  'Khoa Thiết kế đồ họa',
];

export function Register() {
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    faculty: '',
    class: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }
    if (!formData.username || !formData.displayName || !formData.email || !formData.faculty || !formData.class) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
          phone: formData.phone,
          faculty: formData.faculty,
          class: formData.class,
        }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setSuccess('Đăng ký thành công!');
        setFormData({
          displayName: '',
          username: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
          faculty: '',
          class: '',
        });
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } else {
        setError(data.error || 'Đăng ký thất bại');
      }
    } catch (err) {
      setError('Không thể kết nối máy chủ');
    }
    setLoading(false);
  };

  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100">
      <div className="card shadow-lg p-4" style={{ maxWidth: 450, width: '100%' }}>
        <div className="card-body">
          <h3 className="card-title text-center mb-4">Đăng ký tài khoản</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="displayName" className="form-label">Họ và tên</label>
              <input
                type="text"
                className="form-control"
                id="displayName"
                placeholder="Nhập họ và tên đầy đủ"
                value={formData.displayName}
                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">Tên đăng nhập</label>
              <input
                type="text"
                className="form-control"
                id="username"
                placeholder="VD: nguyenvana"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email sinh viên</label>
              <input
                type="email"
                className="form-control"
                id="email"
                placeholder="example@student.edu.vn"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="phone" className="form-label">Số điện thoại</label>
              <input
                type="tel"
                className="form-control"
                id="phone"
                placeholder="Nhập số điện thoại (tùy chọn)"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="faculty" className="form-label">Khoa</label>
              <select
                className="form-select"
                id="faculty"
                value={formData.faculty}
                onChange={e => setFormData({ ...formData, faculty: e.target.value })}
                required
              >
                <option value="">Chọn khoa</option>
                {faculties.map(faculty => (
                  <option key={faculty} value={faculty}>{faculty}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label htmlFor="class" className="form-label">Lớp</label>
              <input
                type="text"
                className="form-control"
                id="class"
                placeholder="VD: CNTT-K15"
                value={formData.class}
                onChange={e => setFormData({ ...formData, class: e.target.value })}
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
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">Xác nhận mật khẩu</label>
              <input
                type="password"
                className="form-control"
                id="confirmPassword"
                placeholder="Nhập lại mật khẩu"
                value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            {success && <div className="alert alert-success py-2">{success}</div>}
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </button>
          </form>
          <div className="mt-3 text-center">
            <a href="/login" className="text-decoration-none">Đã có tài khoản? Đăng nhập ngay</a>
          </div>
        </div>
      </div>
    </div>
  );
}
