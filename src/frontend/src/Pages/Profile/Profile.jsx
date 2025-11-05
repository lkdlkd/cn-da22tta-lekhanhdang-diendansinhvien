import React, { useEffect, useState } from "react";
import { getProfile, updateProfile } from "../../Utils/api";
import { useOutletContext } from "react-router-dom";
import { Link } from "react-router-dom";

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
  const { user } = useOutletContext();

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
    <div className="">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          {/* Header Card */}
          <div 
            className="card border-0 shadow-sm mb-4" 
            style={{ 
              borderRadius: '16px',
              overflow: 'hidden'
            }}
          >
            {/* Cover/Banner */}
            <div 
              style={{
                height: '180px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                position: 'relative'
              }}
            >
              <div 
                style={{
                  position: 'absolute',
                  bottom: '-60px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 2
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={avatarPreview || `https://ui-avatars.com/api/?background=random&name=${profile.displayName || profile.username}&size=200`}
                    alt="Avatar"
                    style={{ 
                      width: '140px', 
                      height: '140px', 
                      borderRadius: '50%', 
                      objectFit: 'cover', 
                      border: '5px solid white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  />
                  {editMode && (
                    <label 
                      className="btn btn-primary btn-sm"
                      style={{
                        position: 'absolute',
                        bottom: '5px',
                        right: '5px',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: '3px solid white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }}
                    >
                      <i className="ph ph-camera" style={{ fontSize: '20px' }}></i>
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: "none" }} 
                        onChange={handleAvatarChange} 
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="card-body text-center" style={{ paddingTop: '70px' }}>
              <h4 className="mb-1" style={{ fontWeight: 700 }}>
                {profile.displayName || profile.username}
              </h4>
              <p className="text-muted mb-2" style={{ fontSize: '14px' }}>
                <i className="ph ph-at me-1"></i>
                {profile.username}
              </p>
              {profile.faculty && (
                <p className="text-muted mb-0" style={{ fontSize: '13px' }}>
                  <i className="ph ph-graduation-cap me-1"></i>
                  {profile.faculty} • {profile.class}
                </p>
              )}
              
              {/* Stats */}
              <div className="d-flex justify-content-center gap-4 mt-4">
                <div className="text-center">
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea' }}>
                    {profile.stats?.postsCount || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>Bài viết</div>
                </div>
                <div className="text-center">
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea' }}>
                    {profile.stats?.commentsCount || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>Bình luận</div>
                </div>
                <div className="text-center">
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea' }}>
                    {profile.stats?.likesReceived || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>Lượt thích</div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div 
            className="card border-0 shadow-sm" 
            style={{ borderRadius: '16px' }}
          >
            <div 
              className="card-header bg-white d-flex justify-content-between align-items-center"
              style={{
                borderBottom: '2px solid #f0f2f5',
                padding: '20px 24px',
                borderRadius: '16px 16px 0 0'
              }}
            >
              <h5 className="mb-0" style={{ fontWeight: 700, fontSize: '18px' }}>
                <i className="ph-duotone ph-user-circle-gear text-primary me-2" style={{ fontSize: '24px' }}></i>
                Thông tin cá nhân
              </h5>
              {!editMode && (
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={() => setEditMode(true)}
                  style={{
                    borderRadius: '8px',
                    padding: '8px 20px',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none'
                  }}
                >
                  <i className="ph ph-pencil-simple me-2"></i>
                  Chỉnh sửa
                </button>
              )}
            </div>

            <div className="card-body p-4">
              {/* Messages */}
              {error && (
                <div 
                  className="alert alert-danger d-flex align-items-center mb-4" 
                  style={{ borderRadius: '10px', fontSize: '14px' }}
                >
                  <i className="ph ph-warning-circle me-2" style={{ fontSize: '20px' }}></i>
                  {error}
                </div>
              )}
              {success && (
                <div 
                  className="alert alert-success d-flex align-items-center mb-4" 
                  style={{ borderRadius: '10px', fontSize: '14px' }}
                >
                  <i className="ph ph-check-circle me-2" style={{ fontSize: '20px' }}></i>
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Display Name */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                      <i className="ph ph-identification-card me-2"></i>
                      Tên hiển thị
                    </label>
                    <input 
                      name="displayName" 
                      value={form.displayName} 
                      onChange={handleChange} 
                      disabled={!editMode}
                      className="form-control"
                      style={{
                        borderRadius: '10px',
                        padding: '12px 16px',
                        border: '2px solid #e0e0e0',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f8f9fa'
                      }}
                    />
                  </div>

                  {/* Email */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                      <i className="ph ph-envelope me-2"></i>
                      Email
                    </label>
                    <input 
                      name="email" 
                      value={form.email} 
                      onChange={handleChange} 
                      disabled={!editMode}
                      className="form-control"
                      style={{
                        borderRadius: '10px',
                        padding: '12px 16px',
                        border: '2px solid #e0e0e0',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f8f9fa'
                      }}
                    />
                  </div>

                  {/* Phone */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                      <i className="ph ph-phone me-2"></i>
                      Số điện thoại
                    </label>
                    <input 
                      name="phone" 
                      value={form.phone} 
                      onChange={handleChange} 
                      disabled={!editMode}
                      className="form-control"
                      placeholder="Chưa cập nhật"
                      style={{
                        borderRadius: '10px',
                        padding: '12px 16px',
                        border: '2px solid #e0e0e0',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f8f9fa'
                      }}
                    />
                  </div>

                  {/* Username */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                      <i className="ph ph-user me-2"></i>
                      Tên đăng nhập
                    </label>
                    <input 
                      value={profile.username} 
                      disabled
                      className="form-control"
                      style={{
                        borderRadius: '10px',
                        padding: '12px 16px',
                        border: '2px solid #e0e0e0',
                        fontSize: '14px',
                        backgroundColor: '#f8f9fa',
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>

                  {/* Faculty */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                      <i className="ph ph-buildings me-2"></i>
                      Trường
                    </label>
                    <select
                      value={selectedSchool}
                      onChange={handleSchoolChange}
                      disabled={!editMode}
                      className="form-select"
                      style={{
                        borderRadius: '10px',
                        padding: '12px 16px',
                        border: '2px solid #e0e0e0',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f8f9fa'
                      }}
                    >
                      <option value="">-- Chọn trường --</option>
                      {Object.keys(facultiesData).map((school) => (
                        <option key={school} value={school}>
                          {school}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-md-6 mb-3">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                      <i className="ph ph-building me-2"></i>
                      Khoa
                    </label>
                    <select
                      name="faculty"
                      value={form.faculty}
                      onChange={handleFacultyChange}
                      disabled={!editMode || !selectedSchool}
                      className="form-select"
                      style={{
                        borderRadius: '10px',
                        padding: '12px 16px',
                        border: '2px solid #e0e0e0',
                        fontSize: '14px',
                        backgroundColor: editMode && selectedSchool ? 'white' : '#f8f9fa',
                        cursor: !selectedSchool ? 'not-allowed' : 'pointer'
                      }}
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
                  <div className="col-md-6 mb-3">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                      <i className="ph ph-students me-2"></i>
                      Lớp
                    </label>
                    <input 
                      name="class" 
                      value={form.class} 
                      onChange={handleChange} 
                      disabled={!editMode}
                      className="form-control"
                      placeholder="Chưa cập nhật"
                      style={{
                        borderRadius: '10px',
                        padding: '12px 16px',
                        border: '2px solid #e0e0e0',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f8f9fa'
                      }}
                    />
                  </div>

                  {/* Bio */}
                  <div className="col-12 mb-3">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '14px' }}>
                      <i className="ph ph-note-pencil me-2"></i>
                      Tiểu sử
                    </label>
                    <textarea 
                      name="bio" 
                      value={form.bio} 
                      onChange={handleChange} 
                      disabled={!editMode}
                      className="form-control"
                      rows="4"
                      placeholder="Viết gì đó về bạn..."
                      style={{
                        borderRadius: '10px',
                        padding: '12px 16px',
                        border: '2px solid #e0e0e0',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f8f9fa',
                        resize: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                {editMode && (
                  <div className="d-flex gap-2 mt-3">
                    <button 
                      type="submit" 
                      className="btn btn-primary flex-grow-1"
                      disabled={loading}
                      style={{
                        borderRadius: '10px',
                        padding: '12px',
                        fontWeight: 600,
                        fontSize: '15px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none'
                      }}
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
                      className="btn btn-light"
                      disabled={loading}
                      style={{
                        borderRadius: '10px',
                        padding: '12px 24px',
                        fontWeight: 600,
                        fontSize: '15px',
                        border: '2px solid #e0e0e0'
                      }}
                    >
                      <i className="ph ph-x-circle me-2"></i>
                      Hủy
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
