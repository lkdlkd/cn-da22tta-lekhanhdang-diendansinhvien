import React, { useEffect, useState } from "react";
import { getProfile, updateProfile } from "../../Utils/api";
import { useOutletContext } from "react-router-dom";
const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
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
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
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
          submitData.append(key, form[key]);
        });
        submitData.append("avatar", avatarFile);
      } else {
        submitData = form;
      }
      const res = await updateProfile(token, submitData);
      setProfile(res);
      setEditMode(false);
      setSuccess("Cập nhật thành công!");
      if (avatarFile && avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(null);
    } catch (err) {
      setError("Cập nhật thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Đang tải...</div>;
  if (!profile) return <div>Không có thông tin cá nhân</div>;

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", padding: 32 }}>
      <h2 style={{ marginBottom: 24 }}>Thông tin cá nhân</h2>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
        <div style={{ position: "relative", width: 96, height: 96 }}>
          <img
            src={avatarPreview || "/default-avatar.png"}
            alt="Avatar"
            style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: "2px solid #e4e6eb" }}
          />
          {editMode && (
            <label style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              background: "#1877f2",
              color: "#fff",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              border: "2px solid #fff"
            }}>
              <span style={{ fontSize: 18 }}>📷</span>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
            </label>
          )}
        </div>
      </div>
      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ color: "green", marginBottom: 12 }}>{success}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>Tên hiển thị</label>
          <input name="displayName" value={form.displayName} onChange={handleChange} disabled={!editMode} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Email</label>
          <input name="email" value={form.email} onChange={handleChange} disabled={!editMode} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Số điện thoại</label>
          <input name="phone" value={form.phone} onChange={handleChange} disabled={!editMode} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Khoa</label>
          <input name="faculty" value={form.faculty} onChange={handleChange} disabled={!editMode} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Lớp</label>
          <input name="class" value={form.class} onChange={handleChange} disabled={!editMode} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Tiểu sử</label>
          <textarea name="bio" value={form.bio} onChange={handleChange} disabled={!editMode} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
        </div>
        {editMode ? (
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" style={{ background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontWeight: 600 }}>Lưu</button>
            <button type="button" onClick={() => setEditMode(false)} style={{ background: "#e4e6eb", color: "#050505", border: "none", borderRadius: 6, padding: "8px 20px", fontWeight: 600 }}>Hủy</button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditMode(true)} style={{ background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontWeight: 600 }}>Chỉnh sửa</button>
        )}
      </form>
    </div>
  );
};

export default Profile;
