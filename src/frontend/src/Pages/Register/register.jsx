
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

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

  // Handle school change - update available faculties
  const handleSchoolChange = (e) => {
    const selectedSchool = e.target.value;
    setFormData({ 
      ...formData, 
      school: selectedSchool,
      faculty: '' // Reset faculty when school changes
    });
    setAvailableFaculties(facultiesData[selectedSchool] || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }
    if (!formData.username || !formData.displayName || !formData.email || !formData.school || !formData.faculty || !formData.class) {
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
          school: '',
          faculty: '',
          class: '',
        });
        setAvailableFaculties([]);
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
    <div 
      className="min-vh-100 d-flex align-items-center justify-content-center" 
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '40px 20px'
      }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
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
                <i className="ph-duotone ph-user-circle-plus" style={{ fontSize: '48px' }}></i>
                <h3 className="mt-2 mb-1" style={{ fontWeight: 700 }}>Đăng ký tài khoản</h3>
                <p className="mb-0" style={{ opacity: 0.9, fontSize: '14px' }}>
                  Tham gia cộng đồng sinh viên ngay!
                </p>
              </div>

              {/* Body */}
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    {/* Display Name */}
                    <div className="col-12 mb-3">
                      <label htmlFor="displayName" className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                        <i className="ph ph-identification-card me-2"></i>
                        Họ và tên <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="displayName"
                        placeholder="Nhập họ và tên đầy đủ"
                        value={formData.displayName}
                        onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                        required
                        style={{
                          borderRadius: '10px',
                          padding: '12px 16px',
                          border: '2px solid #e0e0e0',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    {/* Username */}
                    <div className="col-12 mb-3">
                      <label htmlFor="username" className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                        <i className="ph ph-user me-2"></i>
                        Tên đăng nhập <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="username"
                        placeholder="VD: nguyenvana"
                        value={formData.username}
                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                        required
                        style={{
                          borderRadius: '10px',
                          padding: '12px 16px',
                          border: '2px solid #e0e0e0',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    {/* Email */}
                    <div className="col-12 mb-3">
                      <label htmlFor="email" className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                        <i className="ph ph-envelope me-2"></i>
                        Email sinh viên <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        id="email"
                        placeholder="example@student.edu.vn"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        required
                        style={{
                          borderRadius: '10px',
                          padding: '12px 16px',
                          border: '2px solid #e0e0e0',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    {/* Phone */}
                    <div className="col-12 mb-3">
                      <label htmlFor="phone" className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                        <i className="ph ph-phone me-2"></i>
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        className="form-control"
                        id="phone"
                        placeholder="Nhập số điện thoại (tùy chọn)"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        style={{
                          borderRadius: '10px',
                          padding: '12px 16px',
                          border: '2px solid #e0e0e0',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    {/* School - Trường */}
                    <div className="col-12 mb-3">
                      <label htmlFor="school" className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                        <i className="ph ph-buildings me-2"></i>
                        Trường <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        id="school"
                        value={formData.school}
                        onChange={handleSchoolChange}
                        required
                        style={{
                          borderRadius: '10px',
                          padding: '12px 16px',
                          border: '2px solid #e0e0e0',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Chọn trường</option>
                        {Object.keys(facultiesData).map(school => (
                          <option key={school} value={school}>{school}</option>
                        ))}
                      </select>
                    </div>

                    {/* Faculty - Khoa */}
                    <div className="col-md-6 mb-3">
                      <label htmlFor="faculty" className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                        <i className="ph ph-building me-2"></i>
                        Khoa <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        id="faculty"
                        value={formData.faculty}
                        onChange={e => setFormData({ ...formData, faculty: e.target.value })}
                        required
                        disabled={!formData.school}
                        style={{
                          borderRadius: '10px',
                          padding: '12px 16px',
                          border: '2px solid #e0e0e0',
                          fontSize: '14px',
                          backgroundColor: !formData.school ? '#f8f9fa' : 'white',
                          cursor: !formData.school ? 'not-allowed' : 'pointer'
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

                    {/* Class */}
                    <div className="col-md-6 mb-3">
                      <label htmlFor="class" className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                        <i className="ph ph-students me-2"></i>
                        Lớp <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="class"
                        placeholder="VD: CNTT-K15"
                        value={formData.class}
                        onChange={e => setFormData({ ...formData, class: e.target.value })}
                        required
                        style={{
                          borderRadius: '10px',
                          padding: '12px 16px',
                          border: '2px solid #e0e0e0',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    {/* Password */}
                    <div className="col-md-6 mb-3">
                      <label htmlFor="password" className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                        <i className="ph ph-lock-key me-2"></i>
                        Mật khẩu <span className="text-danger">*</span>
                      </label>
                      <div className="position-relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          className="form-control"
                          id="password"
                          placeholder="Nhập mật khẩu"
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                          required
                          style={{
                            borderRadius: '10px',
                            padding: '12px 16px',
                            paddingRight: '45px',
                            border: '2px solid #e0e0e0',
                            fontSize: '14px'
                          }}
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

                    {/* Confirm Password */}
                    <div className="col-md-6 mb-3">
                      <label htmlFor="confirmPassword" className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                        <i className="ph ph-lock-key me-2"></i>
                        Xác nhận mật khẩu <span className="text-danger">*</span>
                      </label>
                      <div className="position-relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          className="form-control"
                          id="confirmPassword"
                          placeholder="Nhập lại mật khẩu"
                          value={formData.confirmPassword}
                          onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                          required
                          style={{
                            borderRadius: '10px',
                            padding: '12px 16px',
                            paddingRight: '45px',
                            border: '2px solid #e0e0e0',
                            fontSize: '14px'
                          }}
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
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          <i className={`ph ${showConfirmPassword ? 'ph-eye-slash' : 'ph-eye'}`}></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Error/Success messages */}
                  {error && (
                    <div 
                      className="alert alert-danger d-flex align-items-center" 
                      style={{ borderRadius: '10px', fontSize: '14px' }}
                    >
                      <i className="ph ph-warning-circle me-2" style={{ fontSize: '20px' }}></i>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div 
                      className="alert alert-success d-flex align-items-center" 
                      style={{ borderRadius: '10px', fontSize: '14px' }}
                    >
                      <i className="ph ph-check-circle me-2" style={{ fontSize: '20px' }}></i>
                      {success}
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
                        Đang đăng ký...
                      </>
                    ) : (
                      <>
                        <i className="ph ph-user-plus me-2"></i>
                        Đăng ký
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

                {/* Login link */}
                <div className="text-center">
                  <p className="mb-0" style={{ fontSize: '14px', color: '#666' }}>
                    Đã có tài khoản?{' '}
                    <Link 
                      to="/login" 
                      className="text-decoration-none"
                      style={{ color: '#667eea', fontWeight: 700 }}
                    >
                      Đăng nhập ngay
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
