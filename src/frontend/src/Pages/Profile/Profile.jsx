import React, { useEffect, useState } from "react";
import { getProfile, updateProfile, changePassword } from "../../Utils/api";
import { useOutletContext } from "react-router-dom";
import { Link } from "react-router-dom";
import '../../assets/css/Profile.css';

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

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [availableFaculties, setAvailableFaculties] = useState([]);
  const [activeTab, setActiveTab] = useState('info'); // 'info' or 'password'
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isOnline] = useState(true);
  const { user } = useOutletContext();

  const getMemberSince = () => {
    if (profile?.createdAt) {
      const date = new Date(profile.createdAt);
      return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    }
    return 'Tháng 1, 2024';
  };

  useEffect(() => {
    if (user) {
      setProfile(user);
      setForm({
        displayName: user.displayName || "",
        email: user.email || "",
        phone: user.phone || "",
        faculty: user.faculty || "",
        class: user.class || "",
        bio: user.bio || "",
        avatarUrl: user.avatarUrl || user.avatar || ""
      });
      setAvatarPreview(user.avatarUrl || user.avatar || "");

      // Auto-detect school based on faculty
      if (user.faculty) {
        for (const [school, faculties] of Object.entries(facultiesData)) {
          if (faculties.includes(user.faculty)) {
            setSelectedSchool(school);
            setAvailableFaculties(faculties);
            break;
          }
        }
      }
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSchoolChange = (e) => {
    const school = e.target.value;
    setSelectedSchool(school);
    if (school) {
      setAvailableFaculties(facultiesData[school]);
      // Reset faculty if not in new school
      if (form.faculty && !facultiesData[school].includes(form.faculty)) {
        setForm({ ...form, faculty: "" });
      }
    } else {
      setAvailableFaculties([]);
      setForm({ ...form, faculty: "" });
    }
  };

  const handleFacultyChange = (e) => {
    setForm({ ...form, faculty: e.target.value });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Kích thước ảnh không được vượt quá 5MB");
        return;
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError("Vui lòng chọn file ảnh");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const token = localStorage.getItem("token");

    try {
      let submitData;
      if (avatarFile) {
        submitData = new FormData();
        Object.keys(form).forEach((key) => {
          if (key !== 'avatarUrl') { // Không gửi avatarUrl cũ
            submitData.append(key, form[key]);
          }
        });
        submitData.append("avatar", avatarFile);
      } else {
        submitData = form;
      }

      const res = await updateProfile(token, submitData);
      setProfile(res);
      setForm({
        displayName: res.displayName || "",
        email: res.email || "",
        phone: res.phone || "",
        faculty: res.faculty || "",
        class: res.class || "",
        bio: res.bio || "",
        avatarUrl: res.avatarUrl || res.avatar || ""
      });
      setAvatarPreview(res.avatarUrl || res.avatar || "");
      setEditMode(false);
      setSuccess("Cập nhật thành công!");

      if (avatarFile && avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(null);

      // Reload page sau 1.5s để cập nhật avatar ở header
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err.message || "Cập nhật thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setError("");
    setSuccess("");
    // Reset form về giá trị ban đầu
    if (user) {
      setForm({
        displayName: user.displayName || "",
        email: user.email || "",
        phone: user.phone || "",
        faculty: user.faculty || "",
        class: user.class || "",
        bio: user.bio || "",
        avatarUrl: user.avatarUrl || user.avatar || ""
      });
      setAvatarPreview(user.avatarUrl || user.avatar || "");
      setAvatarFile(null);
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validate
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError("Vui lòng điền đầy đủ thông tin");
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Mật khẩu mới và xác nhận không khớp");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");

    try {
      await changePassword(token, passwordForm.currentPassword, passwordForm.newPassword);
      
      setSuccess("Đổi mật khẩu thành công!");
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Auto logout sau 2s
      setTimeout(() => {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }, 2000);
    } catch (err) {
      setError(err.message || "Đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="container mt-5">
        <div className="text-center py-5">
          vui lòng đăng nhập để xem thông tin
          <br />
          <Link to="/login" className="btn btn-primary mt-3">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-xl-10">
            <div className="profile-layout">
{/* Sidebar Profile Card - Redesigned */}
              <aside className="profile-sidebar-card" role="complementary" aria-label="Thông tin cá nhân">
                {/* Gradient Header with Pattern */}
                <div className="profile-sidebar-header">
                  <div className="profile-sidebar-avatar-wrapper">
                    {/* Avatar with Online Ring */}
                    <div className="profile-avatar-container">
                      <img
                        src={avatarPreview || `https://ui-avatars.com/api/?background=4f46e5&color=fff&name=${profile.displayName || profile.username}&size=200`}
                        alt={`Ảnh đại diện của ${profile.displayName || profile.username}`}
                        className="profile-sidebar-avatar"
                        loading="lazy"
                      />
                      {isOnline && (
                        <span 
                          className="profile-online-indicator"
                          title="Đang trực tuyến"
                          aria-label="Trạng thái: Đang trực tuyến"
                        >
                          <span className="pulse-ring"></span>
                        </span>
                      )}
                    </div>
                    
                    {/* Avatar Edit Button */}
                    {editMode && (
                      <label 
                        className="profile-sidebar-avatar-edit"
                        title="Thay đổi ảnh đại diện"
                        aria-label="Thay đổi ảnh đại diện"
                      >
                        <i className="bi bi-camera" aria-hidden="true"></i>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleAvatarChange}
                          aria-label="Tải lên ảnh đại diện mới"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Profile Info */}
                <div className="profile-sidebar-body">
                  {/* Name with Verified Badge */}
                  <div className="profile-name-section">
                    <h5 className="profile-sidebar-name" title={profile.displayName || profile.username}>
                      {profile.displayName || profile.username}
                      {profile.verified && (
                        <i 
                          className="ph-fill ph-seal-check profile-verified-badge"
                          title="Tài khoản đã xác minh"
                          aria-label="Đã xác minh"
                        ></i>
                      )}
                    </h5>
                    <p className="profile-sidebar-username">
                      <i className="ph ph-at" aria-hidden="true"></i>
                      <span>{profile.username}</span>
                    </p>
                  </div>

                  {/* Bio Preview */}
                  {profile.bio && (
                    <div className="profile-bio-preview">
                      <p>{profile.bio.length > 80 ? `${profile.bio.substring(0, 80)}...` : profile.bio}</p>
                    </div>
                  )}

                  {/* Faculty Badge */}
                  {profile.faculty && (
                    <div className="profile-sidebar-faculty" title={`${profile.faculty} - Lớp ${profile.class}`}>
                      <i className="ph-duotone ph-graduation-cap" aria-hidden="true"></i>
                      <div className="faculty-info">
                        <span className="faculty-name">{profile.faculty}</span>
                        {profile.class && <span className="class-name">Lớp {profile.class}</span>}
                      </div>
                    </div>
                  )}

                  {/* Member Since */}
                  <div className="profile-member-since">
                    <i className="ph ph-calendar-blank" aria-hidden="true"></i>
                    <span>Tham gia {getMemberSince()}</span>
                  </div>

                  {/* Stats with Progress Bars */}
                  <div className="profile-sidebar-stats-new" role="region" aria-label="Thống kê hoạt động">
                    <div className="stats-header">
                      <i className="ph-duotone ph-chart-line-up"></i>
                      <span>Hoạt động</span>
                    </div>
                    
                    <div className="stat-item">
                      <div className="stat-info">
                        <span className="stat-label">
                          <i className="ph ph-note-pencil"></i>
                          Bài viết
                        </span>
                        <span className="stat-value">{profile.stats?.postsCount || 0}</span>
                      </div>
                      <div className="stat-progress">
                        <div 
                          className="stat-progress-bar"
                          style={{ width: `${Math.min((profile.stats?.postsCount || 0) * 2, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="stat-item">
                      <div className="stat-info">
                        <span className="stat-label">
                          <i className="ph ph-chat-circle-text"></i>
                          Bình luận
                        </span>
                        <span className="stat-value">{profile.stats?.commentsCount || 0}</span>
                      </div>
                      <div className="stat-progress">
                        <div 
                          className="stat-progress-bar"
                          style={{ width: `${Math.min((profile.stats?.commentsCount || 0) * 1.5, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="stat-item">
                      <div className="stat-info">
                        <span className="stat-label">
                          <i className="ph ph-heart"></i>
                          Lượt thích
                        </span>
                        <span className="stat-value">{profile.stats?.likesReceived || 0}</span>
                      </div>
                      <div className="stat-progress">
                        <div 
                          className="stat-progress-bar"
                          style={{ width: `${Math.min((profile.stats?.likesReceived || 0) * 1, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {!editMode && (
                    <div className="profile-quick-actions">
                      <button 
                        className="quick-action-btn"
                        onClick={() => setActiveTab('info')}
                        title="Xem hồ sơ"
                      >
                        <i className="ph-duotone ph-user-circle"></i>
                        <span>Hồ sơ</span>
                      </button>
                      <button 
                        className="quick-action-btn"
                        onClick={() => setActiveTab('password')}
                        title="Đổi mật khẩu"
                      >
                        <i className="ph-duotone ph-lock-key"></i>
                        <span>Bảo mật</span>
                      </button>
                    </div>
                  )}
                </div>
              </aside>

              {/* Main Content Card */}
              <div className="profile-main-card">
                {/* Tabs */}
                <div className="profile-main-tabs">
                  <button
                    className={`profile-main-tab ${activeTab === 'info' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('info');
                      setError("");
                      setSuccess("");
                    }}
                  >
                    <i className="ph-duotone ph-user-circle-gear"></i>
                    <span>Thông tin cá nhân</span>
                  </button>
                  <button
                    className={`profile-main-tab ${activeTab === 'password' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('password');
                      setError("");
                      setSuccess("");
                      setEditMode(false);
                    }}
                  >
                    <i className="ph-duotone ph-lock-key"></i>
                    <span>Đổi mật khẩu</span>
                  </button>
                </div>


                {/* Main Body */}
                <div className="profile-main-body">
                  {/* Messages */}
                  {error && (
                    <div className="alert alert-danger d-flex align-items-center mb-4 profile-alert">
                      <i className="ph ph-warning-circle me-2"></i>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="alert alert-success d-flex align-items-center mb-4 profile-alert">
                      <i className="ph ph-check-circle me-2"></i>
                      {success}
                    </div>
                  )}

                  {/* Tab: Thông tin cá nhân */}
                  {activeTab === 'info' && (
                    <form onSubmit={handleSubmit}>
                      {/* Basic Info Section */}
                      <div className="mb-4">
                        <div className="profile-section-header">
                          <i className="ph ph-user-circle"></i>
                          <h6>Thông tin cơ bản</h6>
                          {/* Edit Button */}
                          {!editMode && activeTab === 'info' && (
                            <div className="ms-auto"  >
                              <button
                                type="button"
                                className="btn profile-edit-btn"
                                onClick={() => setEditMode(true)}
                              >
                                <i className="ph ph-pencil-simple me-2"></i>
                                Chỉnh sửa
                              </button>
                            </div>
                          )}

                        </div>

                        <div className="row g-3">
                          {/* Display Name */}
                          <div className="col-md-6">
                            <label className="profile-form-label">
                              <i className="ph ph-identification-card"></i>
                              Tên hiển thị
                            </label>
                            <input
                              name="displayName"
                              value={form.displayName}
                              onChange={handleChange}
                              disabled={!editMode}
                              className="form-control profile-form-control"
                            />
                          </div>

                          {/* Username */}
                          <div className="col-md-6">
                            <label className="profile-form-label">
                              <i className="ph ph-user"></i>
                              Tên đăng nhập
                            </label>
                            <input
                              value={profile.username}
                              disabled
                              className="form-control profile-form-control"
                            />
                          </div>

                          {/* Email */}
                          <div className="col-md-6">
                            <label className="profile-form-label">
                              <i className="ph ph-envelope"></i>
                              Email
                            </label>
                            <input
                              name="email"
                              value={form.email}
                              disabled
                              className="form-control profile-form-control"
                            />
                          </div>

                          {/* Phone */}
                          <div className="col-md-6">
                            <label className="profile-form-label">
                              <i className="ph ph-phone"></i>
                              Số điện thoại
                            </label>
                            <input
                              name="phone"
                              value={form.phone}
                              onChange={handleChange}
                              disabled={!editMode}
                              className="form-control profile-form-control"
                              placeholder="Chưa cập nhật"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Academic Info Section */}
                      <div className="mb-4">
                        <div className="profile-section-header">
                          <i className="ph ph-graduation-cap"></i>
                          <h6>Thông tin học vấn</h6>
                        </div>
                        <div className="row g-3">
                          {/* School */}
                          <div className="col-12">
                            <label className="profile-form-label">
                              <i className="ph ph-buildings"></i>
                              Trường
                            </label>
                            <select
                              value={selectedSchool}
                              onChange={handleSchoolChange}
                              disabled={!editMode}
                              className="form-select profile-form-control"
                            >
                              <option value="">-- Chọn trường --</option>
                              {Object.keys(facultiesData).map((school) => (
                                <option key={school} value={school}>
                                  {school}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Faculty */}
                          <div className="col-md-6">
                            <label className="profile-form-label">
                              <i className="ph ph-building"></i>
                              Khoa
                            </label>
                            <select
                              name="faculty"
                              value={form.faculty}
                              onChange={handleFacultyChange}
                              disabled={!editMode || !selectedSchool}
                              className="form-select profile-form-control"
                            >
                              <option value="">-- Chọn khoa --</option>
                              {availableFaculties.map((faculty) => (
                                <option key={faculty} value={faculty}>
                                  {faculty}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Class */}
                          <div className="col-md-6">
                            <label className="profile-form-label">
                              <i className="ph ph-students"></i>
                              Lớp
                            </label>
                            <input
                              name="class"
                              value={form.class}
                              onChange={handleChange}
                              disabled={!editMode}
                              className="form-control profile-form-control"
                              placeholder="Chưa cập nhật"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bio Section */}
                      <div className="mb-4">
                        <div className="profile-section-header">
                          <i className="ph ph-note-pencil"></i>
                          <h6>Giới thiệu bản thân</h6>
                        </div>
                        {/* Bio */}
                        <div className="col-12">
                          <label className="profile-form-label">
                            Tiểu sử
                          </label>
                          <textarea
                            name="bio"
                            value={form.bio}
                            onChange={handleChange}
                            disabled={!editMode}
                            className="form-control profile-form-control profile-textarea"
                            rows="5"
                            placeholder="Viết gì đó về bạn..."
                            style={{ resize: 'vertical', minHeight: '120px', maxHeight: '300px' }}
                          />
                          <small className="text-muted" style={{ fontSize: '12px' }}>
                            <i className="ph ph-info me-1"></i>
                            Tối đa 500 ký tự {form.bio ? `• Còn ${500 - form.bio.length} ký tự` : ''}
                          </small>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {editMode && (
                        <div className="border-top pt-4 mt-2">
                          <div className="d-flex gap-3">
                            <button
                              type="submit"
                              className="btn btn-primary flex-grow-1 profile-submit-btn"
                              disabled={loading}
                              style={{ minHeight: '44px' }}
                            >
                              {loading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2"></span>
                                  Đang lưu...
                                </>
                              ) : (
                                <>
                                  <i className="ph ph-check-circle me-2"></i>
                                  Lưu thay đổi
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancel}
                              className="btn btn-light profile-cancel-btn"
                              disabled={loading}
                              style={{ minHeight: '44px', minWidth: '120px' }}
                            >
                              <i className="ph ph-x-circle me-2"></i>
                              Hủy
                            </button>
                          </div>
                          <p className="text-muted text-center mt-3 mb-0" style={{ fontSize: '12px' }}>
                            <i className="ph ph-lock-simple me-1"></i>
                            Thông tin của bạn được bảo mật và an toàn
                          </p>
                        </div>
                      )}
                    </form>
                  )}

                  {/* Tab: Đổi mật khẩu */}
                  {activeTab === 'password' && (
                    <form onSubmit={handlePasswordSubmit}>
                      <div className="password-change-container">
                        <div className="password-change-header mb-4">
                          <h5 className="password-change-title">
                            <i className="ph-duotone ph-shield-check me-2"></i>
                            Đổi mật khẩu
                          </h5>
                          <p className="password-change-subtitle">
                            Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác
                          </p>
                        </div>

                        <div className="row">
                          {/* Current Password */}
                          <div className="col-12 mb-4">
                            <label className="form-label profile-form-label">
                              <i className="ph ph-lock me-2"></i>
                              Mật khẩu hiện tại
                            </label>
                            <div className="password-input-wrapper">
                              <input
                                type={showCurrentPassword ? "text" : "password"}
                                name="currentPassword"
                                value={passwordForm.currentPassword}
                                onChange={handlePasswordChange}
                                className="form-control profile-form-control"
                                placeholder="Nhập mật khẩu hiện tại"
                                autoComplete="current-password"
                              />
                              <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                <i className={`ph ${showCurrentPassword ? 'ph-eye-slash' : 'ph-eye'}`}></i>
                              </button>
                            </div>
                          </div>

                          {/* New Password */}
                          <div className="col-md-6 mb-4">
                            <label className="form-label profile-form-label">
                              <i className="ph ph-lock-key me-2"></i>
                              Mật khẩu mới
                            </label>
                            <div className="password-input-wrapper">
                              <input
                                type={showNewPassword ? "text" : "password"}
                                name="newPassword"
                                value={passwordForm.newPassword}
                                onChange={handlePasswordChange}
                                className="form-control profile-form-control"
                                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                                autoComplete="new-password"
                              />
                              <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                <i className={`ph ${showNewPassword ? 'ph-eye-slash' : 'ph-eye'}`}></i>
                              </button>
                            </div>
                          </div>

                          {/* Confirm Password */}
                          <div className="col-md-6 mb-4">
                            <label className="form-label profile-form-label">
                              <i className="ph ph-check-circle me-2"></i>
                              Xác nhận mật khẩu mới
                            </label>
                            <div className="password-input-wrapper">
                              <input
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmPassword"
                                value={passwordForm.confirmPassword}
                                onChange={handlePasswordChange}
                                className="form-control profile-form-control"
                                placeholder="Nhập lại mật khẩu mới"
                                autoComplete="new-password"
                              />
                              <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                <i className={`ph ${showConfirmPassword ? 'ph-eye-slash' : 'ph-eye'}`}></i>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Password Requirements */}
                        <div className="password-requirements mt-2 mb-4">
                          <p className="mb-2 fw-semibold text-muted" style={{ fontSize: '13px' }}>
                            <i className="ph ph-info me-1"></i>
                            Yêu cầu mật khẩu:
                          </p>
                          <ul className="requirements-list">
                            <li className={passwordForm.newPassword.length >= 6 ? 'valid' : ''}>
                              <i className={`ph ${passwordForm.newPassword.length >= 6 ? 'ph-check-circle' : 'ph-circle'}`}></i>
                              Tối thiểu 6 ký tự
                            </li>
                            <li className={passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.newPassword !== '' ? 'valid' : ''}>
                              <i className={`ph ${passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.newPassword !== '' ? 'ph-check-circle' : 'ph-circle'}`}></i>
                              Mật khẩu xác nhận khớp
                            </li>
                          </ul>
                        </div>

                        {/* Submit Button */}
                        <div className="border-top pt-4">
                          <div className="d-flex gap-3">
                            <button
                              type="submit"
                              className="btn btn-primary flex-grow-1 profile-submit-btn"
                              disabled={loading}
                              style={{ minHeight: '44px' }}
                            >
                              {loading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2"></span>
                                  Đang xử lý...
                                </>
                              ) : (
                                <>
                                  <i className="ph ph-shield-check me-2"></i>
                                  Đổi mật khẩu
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPasswordForm({
                                  currentPassword: '',
                                  newPassword: '',
                                  confirmPassword: ''
                                });
                                setError("");
                              }}
                              className="btn btn-light profile-cancel-btn"
                              disabled={loading}
                              style={{ minHeight: '44px', minWidth: '120px' }}
                            >
                              <i className="ph ph-x-circle me-2"></i>
                              Xóa
                            </button>
                          </div>
                          <div className="alert alert-warning mt-3 mb-0" style={{ border: '1px solid #fbbf24', background: '#fffbeb' }}>
                            <i className="ph ph-warning me-2" style={{ color: '#f59e0b' }}></i>
                            <small style={{ fontSize: '12px', color: '#92400e' }}>
                              Sau khi đổi mật khẩu, bạn sẽ được đăng xuất tự động để đảm bảo bảo mật.
                            </small>
                          </div>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Profile;