import React from 'react';
import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Table from "react-bootstrap/Table";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { createPost } from "../Utils/api";
import HeroSection from '../Components/HeroSection';
import { useOutletContext } from "react-router-dom";
const Home = () => {
  const { user, categories, featuredPosts, activeUsers, documents ,allPosts} = useOutletContext();
  const [showPostModal, setShowPostModal] = useState(false);
  const [postForm, setPostForm] = useState({
    title: "",
    content: "",
    categoryId: "",
  });
  const [preview, setPreview] = useState(null);
  const token = localStorage.getItem("token");

  // Open modal
  const handleOpenPostModal = () => {
    setShowPostModal(true);
    setPreview(null);
    setPostForm({ title: "", content: "", categoryId: "" });
  };

  // Close modal
  const handleClosePostModal = () => {
    setShowPostModal(false);
    setPreview(null);
  };

  // Handle form change
  const handleFormChange = (e) => {
    setPostForm({ ...postForm, [e.target.name]: e.target.value });
  };

  // Preview post
  const handlePreview = () => {
    setPreview({ ...postForm });
  };

  // Submit post
  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!postForm.title || !postForm.content || !postForm.categoryId) {
      toast.error("Vui lòng điền đầy đủ thông tin bài viết!");
      return;
    }
    const result = await Swal.fire({
      title: "Xác nhận đăng bài?",
      text: "Bạn có chắc muốn đăng bài viết này?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Đăng bài",
      cancelButtonText: "Hủy",
    });
    if (result.isConfirmed) {
      try {
        await createPost(token, postForm);
        toast.success("Đăng bài thành công!");
        setShowPostModal(false);
      } catch (err) {
        toast.error("Lỗi khi đăng bài");
      }
    }
  };
  return (
    <div>
      <HeroSection />
      <div className="container mt-4">
        {user && (
          <div className="alert alert-success mb-4">
            Xin chào <b>{user.name}</b>! Bạn là <b>{user.role}</b>.
          </div>
        )}
        <div>
          <div className="alert alert-info mb-4">
            Hiện có <b>{allPosts.length}</b> bài viết trên diễn đàn. Hãy tham gia đóng góp nhé!
          </div>
          <button className="btn btn-primary" onClick={handleOpenPostModal}> Tạo bài viết mới </button>

        </div>
        <div className="row">
          <div className="col-lg-8">
            <div className="card mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-pin-angle-fill text-warning me-2"></i>
                  Bài viết nổi bật
                </h5>
                <a href="/posts" className="text-decoration-none">Xem tất cả</a>
              </div>
              <div className="card-body">
                {allPosts && allPosts.map(post => (
                  <div key={post._id} className="d-flex mb-3 pb-3 border-bottom">
                    <img src={post.avatar} className="user-avatar me-3" alt="Avatar" />
                    <div className="flex-grow-1">
                      <h6 className="mb-1"><a href={`/post/${post.slug}`} className="text-dark text-decoration-none">{post.title}</a></h6>
                      <div className="post-meta mb-1">
                        <span className="me-2"><i className="bi bi-person-circle me-1"></i>{post.author}</span>
                        <span className="me-2"><i className="bi bi-clock me-1"></i>{post.time}</span>
                        <span className="me-2"><i className="bi bi-chat-dots me-1"></i>{post.comments} bình luận</span>
                        <span className="me-2"><i className="bi bi-eye me-1"></i>{post.views} lượt xem</span>
                        <span className="badge badge-custom ms-2">{post.category}</span>
                      </div>
                      <p className="mb-0 text-muted">{post.excerpt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="sidebar-widget mb-4">
              <h6 className="fw-bold mb-3">
                <i className="bi bi-grid-3x3-gap me-2 text-primary"></i>
                Chuyên mục phổ biến
              </h6>
              <div className="list-group list-group-flush">
                {categories && categories.map(cat => (
                  <a key={cat.slug} href={`/category/${cat.slug}`} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                    {cat.title}
                    <span className="badge bg-primary rounded-pill">{cat.count}</span>
                  </a>
                ))}
              </div>
            </div>
            <div className="sidebar-widget mb-4">
              <h6 className="fw-bold mb-3">
                <i className="bi bi-people me-2 text-success"></i>
                Thành viên tích cực
              </h6>
              {activeUsers && activeUsers.map(u => (
                <div key={u.name} className="d-flex align-items-center mb-3">
                  <img src={u.avatar} className="user-avatar me-3" alt="Avatar" />
                  <div>{u.name}</div>
                  <div className="ms-auto">
                    <span className="badge bg-success">{u.posts} bài viết</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="sidebar-widget mb-4">
              <h6 className="fw-bold mb-3">
                <i className="bi bi-file-earmark-text me-2 text-warning"></i>
                Tài liệu mới
              </h6>
              <div className="list-group list-group-flush">
                {documents && documents.map(doc => (
                  <a key={doc.title} href={doc.url} className="list-group-item list-group-item-action">
                    {doc.title}
                  </a>
                ))}
              </div>
            </div>
            <div className="sidebar-widget mb-4">
              <h6 className="fw-bold mb-3">
                <i className="bi bi-lightning me-2 text-primary"></i>
                Thao tác nhanh
              </h6>
              <div className="d-grid gap-2">
                <button className="btn btn-primary" onClick={handleOpenPostModal}>Tạo bài viết</button>
                <a href="/upload-document" className="btn btn-outline-primary">Tải tài liệu</a>
                <a href="/find-study-group" className="btn btn-outline-secondary">Tìm nhóm học</a>
              </div>
            </div>
            {/* Modal đăng bài viết */}
            <Modal show={showPostModal} onHide={handleClosePostModal} centered>
              <Modal.Header closeButton>
                <Modal.Title>Đăng bài viết mới</Modal.Title>
              </Modal.Header>
              <form onSubmit={handleSubmitPost}>
                <Modal.Body>
                  <div className="mb-3">
                    <label className="form-label">Tiêu đề</label>
                    <input type="text" className="form-control" name="title" value={postForm.title} onChange={handleFormChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Nội dung</label>
                    <textarea className="form-control" name="content" value={postForm.content} onChange={handleFormChange} rows={4} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Chuyên mục</label>
                    <select className="form-select" name="categoryId" value={postForm.categoryId} onChange={handleFormChange} required>
                      <option value="">-- Chọn chuyên mục --</option>
                      {categories && categories.map(cat => (
                        <option key={cat.slug} value={cat._id || cat.slug}>{cat.title}</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" className="btn btn-outline-info me-2" onClick={handlePreview}>Xem trước</button>
                  {preview && (
                    <div className="mt-3">
                      <h6>Xem trước bài viết</h6>
                      <Table bordered>
                        <tbody>
                          <tr><th>Tiêu đề</th><td>{preview.title}</td></tr>
                          <tr><th>Nội dung</th><td>{preview.content}</td></tr>
                          <tr><th>Chuyên mục</th><td>{categories?.find(c => c._id === preview.categoryId || c.slug === preview.categoryId)?.title || preview.categoryId}</td></tr>
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <button type="submit" className="btn btn-primary">Đăng bài</button>
                  <button type="button" className="btn btn-secondary" onClick={handleClosePostModal}>Đóng</button>
                </Modal.Footer>
              </form>
            </Modal>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

