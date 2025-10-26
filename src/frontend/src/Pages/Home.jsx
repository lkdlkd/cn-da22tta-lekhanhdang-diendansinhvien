import React from 'react';
import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Table from "react-bootstrap/Table";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { getAllPosts } from "../Utils/api";
import HeroSection from '../Components/HeroSection';
import PostList from '../Components/PostList';
import PostCreate from '../Components/PostCreate';
import { useOutletContext } from "react-router-dom";
const { socket } = require('../Utils/socket');

const Home = () => {
  const { user, categories, featuredPosts, activeUsers, documents } = useOutletContext();
  const [showPostModal, setShowPostModal] = useState(false);
  const [postForm, setPostForm] = useState({
    title: "",
    content: "",
    categoryId: "",
  });
  const [preview, setPreview] = useState(null);
  const token = localStorage.getItem("token");
  const [loadingpost, setLoadingpost] = React.useState(true);
  const [posts, setPosts] = React.useState([]);
  const getPosts = React.useCallback(() => {
    setLoadingpost(true);
    getAllPosts().then(data => {
      setPosts(data);
      setLoadingpost(false);
    });
    setShowUpdateBtn(false);
  }, []);


  const [showUpdateBtn, setShowUpdateBtn] = React.useState(false);
  React.useEffect(() => {
    getPosts();
    // Kết nối socket để nhận realtime bài viết mới
    socket.on('post:new', (newPost) => {
      setPosts(prev => {
        // Nếu đã có post này thì không thêm lại
        if (prev.some(p => p._id === newPost._id)) return prev;
        return [newPost, ...prev];
      });
      toast.info('Có bài viết mới!');
    });
    // Lắng nghe bình luận mới (thêm trực tiếp vào post tương ứng)
    const handleNewComment = ({ postId, comment }) => {
      setPosts(prev => prev.map(post => {
        if (post._id === postId) {
          // Nếu đã có comment này thì không thêm lại
          if (post.comments && post.comments.some(c => c._id === comment._id)) return post;
          return {
            ...post,
            comments: post.comments ? [...post.comments, comment] : [comment],
            commentsCount: (post.commentsCount || 0) + 1
          };
        }
        return post;
      }));
      // toast.info('Có bình luận mới!');
    };
    socket.on('comment:new', handleNewComment);
    return () => {
      socket.off('post:new');
      socket.off('comment:new', handleNewComment);
    };
  }, [getPosts]);


  // Open modal
  const handleOpenPostModal = () => {
    setShowPostModal(true);
    setPreview(null);
    setPostForm({ title: "", content: "", categoryId: "" });
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
            Hiện có <b>{posts.length}</b> bài viết trên diễn đàn. Hãy tham gia đóng góp nhé!
          </div>
          {/* Facebook-style update bar */}
          {showUpdateBtn && (
            <div style={{
              position: 'sticky',
              top: 0,
              zIndex: 100,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: '#fffbe6',
              border: '1px solid #ffe58f',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              padding: '8px 0',
              marginBottom: 12,
              borderRadius: 8,
              fontWeight: 500,
              color: '#856404',
              gap: 12
            }}>
              <span>Đã có bài viết hoặc bình luận mới</span>
              <button className="btn btn-sm btn-warning" style={{ fontWeight: 600 }} onClick={getPosts}>
                Cập nhật
              </button>
            </div>
          )}

          {/* <button className="btn btn-primary" onClick={handleOpenPostModal}>Tạo bài viết mới</button> */}
          <PostCreate categories={categories} token={token} onPostCreated={handleOpenPostModal} />
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
              <div className="card-body p-0">
                <PostList posts={posts} loadingpost={loadingpost} />
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
          </div>
        </div>
      </div>
    </div >
  );
};

export default Home;

