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
import { Link } from 'react-router-dom';
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
    });

    // Lắng nghe bài viết được cập nhật realtime
    socket.on('post:updated', ({ postId, post: updatedPost }) => {
      setPosts(prev => prev.map(post => {
        if (String(post._id) === String(postId)) {
          // Giữ lại comments và likes hiện tại
          return {
            ...updatedPost,
            comments: post.comments || [],
            likes: post.likes || [],
            likesCount: post.likesCount || 0,
            commentsCount: post.commentsCount || 0
          };
        }
        return post;
      }));
      // toast.success('Bài viết đã được cập nhật!');
    });

    // Lắng nghe bài viết bị xóa realtime
    socket.on('post:deleted', ({ postId }) => {
      setPosts(prev => prev.filter(post => String(post._id) !== String(postId)));
      // toast.info('Một bài viết đã bị xóa');
    });

    // Lắng nghe like bài viết realtime
    socket.on('post:liked', ({ postId, like }) => {
      setPosts(prev => prev.map(post => {
        if (String(post._id) === String(postId)) {
          return {
            ...post,
            likes: [...(post.likes || []), like],
            likesCount: (post.likesCount || 0) + 1
          };
        }
        return post;
      }));
    });

    // Lắng nghe unlike bài viết realtime
    socket.on('post:unliked', ({ postId, likeId, userId }) => {
      setPosts(prev => prev.map(post => {
        if (String(post._id) === String(postId)) {
          return {
            ...post,
            likes: (post.likes || []).filter(like => String(like._id) !== String(likeId)),
            likesCount: Math.max(0, (post.likesCount || 0) - 1)
          };
        }
        return post;
      }));
    });

    // Lắng nghe like comment realtime
    socket.on('comment:liked', ({ commentId, postId, like }) => {
      setPosts(prev => prev.map(post => {
        if (String(post._id) === String(postId)) {
          return {
            ...post,
            comments: (post.comments || []).map(comment => {
              if (String(comment._id) === String(commentId)) {
                return {
                  ...comment,
                  likes: [...(comment.likes || []), like]
                };
              }
              return comment;
            })
          };
        }
        return post;
      }));
    });

    // Lắng nghe unlike comment realtime
    socket.on('comment:unliked', ({ commentId, postId, likeId, userId }) => {
      setPosts(prev => prev.map(post => {
        if (String(post._id) === String(postId)) {
          return {
            ...post,
            comments: (post.comments || []).map(comment => {
              if (String(comment._id) === String(commentId)) {
                return {
                  ...comment,
                  likes: (comment.likes || []).filter(like => String(like._id) !== String(likeId))
                };
              }
              return comment;
            })
          };
        }
        return post;
      }));
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

    // Lắng nghe cập nhật bình luận realtime
    socket.on('comment:updated', ({ commentId, postId, comment: updatedComment }) => {
      setPosts(prev => prev.map(post => {
        if (post._id === postId) {
          // Hàm đệ quy để cập nhật comment ở bất kỳ cấp độ nào
          const updateCommentRecursive = (comments) => {
            return comments.map(c => {
              if (c._id === commentId) {
                return { ...c, ...updatedComment };
              }
              if (c.replies && c.replies.length > 0) {
                return { ...c, replies: updateCommentRecursive(c.replies) };
              }
              return c;
            });
          };

          return {
            ...post,
            comments: post.comments ? updateCommentRecursive(post.comments) : []
          };
        }
        return post;
      }));
    });

    // Lắng nghe xóa bình luận realtime
    socket.on('comment:deleted', ({ commentId, postId, parentId }) => {
      setPosts(prev => prev.map(post => {
        if (post._id === postId) {
          // Hàm đệ quy để xóa comment ở bất kỳ cấp độ nào
          const deleteCommentRecursive = (comments) => {
            return comments.filter(c => {
              if (c._id === commentId) return false;
              if (c.replies && c.replies.length > 0) {
                c.replies = deleteCommentRecursive(c.replies);
              }
              return true;
            });
          };

          const newComments = post.comments ? deleteCommentRecursive(post.comments) : [];
          return {
            ...post,
            comments: newComments,
            commentsCount: Math.max(0, (post.commentsCount || 0) - 1)
          };
        }
        return post;
      }));
    });

    return () => {
      socket.off('post:new');
      socket.off('post:updated');
      socket.off('post:deleted');
      socket.off('post:liked');
      socket.off('post:unliked');
      socket.off('comment:liked');
      socket.off('comment:unliked');
      socket.off('comment:new', handleNewComment);
      socket.off('comment:updated');
      socket.off('comment:deleted');
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
        {/* Welcome message */}
        {user && (
          <div
            className="alert mb-4"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              padding: '16px 20px',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.2)'
            }}
          >
            <div className="d-flex align-items-center">
              <i className="ph-duotone ph-hand-waving" style={{ fontSize: '28px', marginRight: '12px' }}></i>
              <div>
                <h6 className="mb-0" style={{ fontWeight: 600 }}>Xin chào, {user.displayName}!</h6>
                <small style={{ opacity: 0.9 }}>Chào mừng bạn trở lại</small>
              </div>
            </div>
          </div>
        )}

        <div>
          {/* Facebook-style update bar */}
          {showUpdateBtn && (
            <div style={{
              position: 'sticky',
              top: '70px',
              zIndex: 100,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #fff9e6 0%, #ffe8cc 100%)',
              border: '1px solid #ffd699',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              padding: '12px 20px',
              marginBottom: 16,
              borderRadius: 12,
              fontWeight: 500,
              color: '#856404',
              gap: 12,
              animation: 'slideDown 0.3s ease-out'
            }}>
              <i className="ph-duotone ph-bell-ringing" style={{ fontSize: '20px' }}></i>
              <span>Có nội dung mới! Bấm để cập nhật</span>
              <button
                className="btn btn-sm btn-warning"
                style={{
                  fontWeight: 600,
                  borderRadius: '8px',
                  padding: '6px 20px',
                  boxShadow: '0 2px 8px rgba(255,193,7,0.3)'
                }}
                onClick={getPosts}
              >
                <i className="ph-duotone ph-arrow-clockwise me-1"></i>
                Cập nhật ngay
              </button>
            </div>
          )}

          {/* Post create component */}
          <PostCreate user={user} categories={categories} token={token} onPostCreated={handleOpenPostModal} />
        </div>
        <div className="row">
          <div className="col-lg-8 mb-4">
            {/* Main content - Posts */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
              <div className="card-header bg-white d-flex justify-content-between align-items-center" style={{
                borderBottom: '2px solid #f0f2f5',
                padding: '16px 20px',
                borderRadius: '12px 12px 0 0'
              }}>
                <h5 className="mb-0 d-flex align-items-center" style={{ fontWeight: 700, fontSize: '18px' }}>
                  <i className="ph-duotone ph-fire text-danger me-2" style={{ fontSize: '22px' }}></i>
                  Bài viết mới nhất
                </h5>
                <Link
                  to="/posts"
                  className="text-decoration-none"
                  style={{
                    color: '#1877f2',
                    fontWeight: 600,
                    fontSize: '13px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#0d6efd'}
                  onMouseOut={(e) => e.target.style.color = '#1877f2'}
                >
                  Xem tất cả <i className="ph ph-arrow-right"></i>
                </Link>
              </div>
              <div className="card-body p-0">
                <PostList posts={posts} loadingpost={loadingpost} />
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            {/* Categories widget */}
            <div className="card mb-3 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
              <div className="card-body" style={{ padding: '16px' }}>
                <h6 className="fw-bold mb-3 d-flex align-items-center" style={{ fontSize: '15px' }}>
                  <i className="ph-duotone ph-squares-four text-primary me-2" style={{ fontSize: '18px' }}></i>
                  Chuyên mục
                </h6>
                <div className="list-group list-group-flush">
                  {categories && categories.slice(0, 6).map(cat => (
                    <Link
                      key={cat.slug}
                      to={`/category/${cat.slug}`}
                      className="list-group-item list-group-item-action d-flex justify-content-between align-items-center border-0"
                      style={{
                        padding: '12px 0',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                        marginBottom: '4px',
                        textDecoration: 'none'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.paddingLeft = '8px';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.paddingLeft = '0';
                      }}
                    >
                      <span style={{ fontSize: '13px' }}>
                        <i className="ph ph-folder-notch-open me-2 text-primary"></i>
                        {cat.title}
                      </span>
                      <span className="badge rounded-pill" style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        fontSize: '10px'
                      }}>
                        {cat.count || 0}
                      </span>
                    </Link>
                  ))}
                </div>
                {categories && categories.length > 6 && (
                  <Link
                    to="/categories"
                    className="btn btn-sm btn-outline-primary w-100 mt-2"
                    style={{ borderRadius: '8px', fontWeight: 600, fontSize: '13px' }}
                  >
                    Xem tất cả
                  </Link>
                )}
              </div>
            </div>

            {/* Active users widget */}
            <div className="card mb-3 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
              <div className="card-body" style={{ padding: '16px' }}>
                <h6 className="fw-bold mb-3 d-flex align-items-center" style={{ fontSize: '15px' }}>
                  <i className="ph-duotone ph-users-three text-success me-2" style={{ fontSize: '18px' }}></i>
                  Thành viên tích cực
                </h6>
                {activeUsers && activeUsers.slice(0, 5).map((u, idx) => (
                  <div
                    key={u._id || idx}
                    className="d-flex align-items-center mb-2 p-2"
                    style={{
                      borderRadius: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <img
                      src={u.avatarUrl || `https://ui-avatars.com/api/?background=random&name=${u.displayName || u.username}`}
                      className="rounded-circle me-2"
                      alt="Avatar"
                      style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                    />
                    <div className="flex-grow-1">
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{u.displayName || u.username}</div>
                      <small className="text-muted" style={{ fontSize: '11px' }}>{u.postsCount || 0} bài viết</small>
                    </div>
                    <span className={`badge ${u.isOnline ? 'bg-success' : 'bg-secondary'}`} style={{ borderRadius: '20px', fontSize: '10px' }}>
                      <i className={`ph ${u.isOnline ? 'ph-check-circle' : 'ph-clock'} me-1`}></i>
                      {u.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents widget */}
            <div className="card mb-3 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
              <div className="card-body" style={{ padding: '16px' }}>
                <h6 className="fw-bold mb-3 d-flex align-items-center" style={{ fontSize: '15px' }}>
                  <i className="ph-duotone ph-file-text text-warning me-2" style={{ fontSize: '18px' }}></i>
                  Tài liệu mới
                </h6>
                <div className="list-group list-group-flush">
                  {documents && documents.slice(0, 5).map((doc, idx) => (
                    <Link
                      key={doc.title || idx}
                      to={doc.url}
                      className="list-group-item list-group-item-action border-0 d-flex align-items-center"
                      style={{
                        padding: '10px 0',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                        marginBottom: '4px',
                        textDecoration: 'none'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.paddingLeft = '8px';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.paddingLeft = '0';
                      }}
                    >
                      <i className="ph ph-file-pdf text-danger me-2" style={{ fontSize: '18px' }}></i>
                      <span style={{ fontSize: '13px' }}>{doc.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick actions widget */}
            <div className="card mb-3 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
              <div className="card-body" style={{ padding: '16px' }}>
                <h6 className="fw-bold mb-3 d-flex align-items-center" style={{ fontSize: '15px' }}>
                  <i className="ph-duotone ph-lightning text-warning me-2" style={{ fontSize: '18px' }}></i>
                  Thao tác nhanh
                </h6>
                <div className="d-grid gap-2">
                  <button
                    className="btn btn-primary d-flex align-items-center justify-content-center"
                    onClick={handleOpenPostModal}
                    style={{
                      borderRadius: '8px',
                      padding: '10px',
                      fontWeight: 600,
                      fontSize: '13px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none'
                    }}
                  >
                    <i className="ph-duotone ph-plus-circle me-2"></i>
                    Tạo bài viết
                  </button>
                  <Link
                    to="/upload-document"
                    className="btn btn-outline-primary d-flex align-items-center justify-content-center"
                    style={{ borderRadius: '8px', padding: '10px', fontWeight: 600, fontSize: '13px' }}
                  >
                    <i className="ph ph-upload-simple me-2"></i>
                    Tải tài liệu
                  </Link>
                  <Link
                    to="/find-study-group"
                    className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                    style={{ borderRadius: '8px', padding: '10px', fontWeight: 600, fontSize: '13px' }}
                  >
                    <i className="ph ph-users me-2"></i>
                    Tìm nhóm học
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};

export default Home;

