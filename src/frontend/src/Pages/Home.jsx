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
import PostDetail from '../Components/PostDetail';
import { useOutletContext } from "react-router-dom";
import { Link } from 'react-router-dom';
import '../assets/css/Home.css';
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
  const [page, setPage] = useState(1);
  const [limit] = useState(30);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState('');

  // State for PostDetail modal
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostDetailModal, setShowPostDetailModal] = useState(false);
  const getPosts = () => {
    setLoadingpost(true);
    const params = { page: 1, limit };
    if (searchText.trim()) params.keyword = searchText.trim();
    getAllPosts(params).then(data => {
      setPosts(Array.isArray(data) ? data : []);
      setPage(1);
      setHasMore(Array.isArray(data) ? data.length === limit : false);
      setLoadingpost(false);
    });
    setShowUpdateBtn(false);
  };

  const handleLoadMore = React.useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const params = { page: nextPage, limit };
    if (searchText.trim()) params.keyword = searchText.trim();
    getAllPosts(params).then(data => {
      const newItems = Array.isArray(data) ? data : [];
      if (newItems.length > 0) {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => String(p._id)));
          const merged = [...prev];
          newItems.forEach(item => {
            const id = String(item._id);
            if (!existingIds.has(id)) merged.push(item);
          });
          return merged;
        });
      }
      setPage(nextPage);
      setHasMore(newItems.length === limit);
    }).finally(() => setIsLoadingMore(false));
  }, [page, limit, isLoadingMore, hasMore, searchText]);


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
  }, []);

  // Open modal
  const handleOpenPostModal = () => {
    setShowPostModal(true);
    setPreview(null);
    setPostForm({ title: "", content: "", categoryId: "" });
  };
  
  // Trigger post create modal
  const handleCreatePost = () => {
    // This will be handled by PostCreate component's internal state
    // We can trigger it by programmatically clicking the PostCreate button
    document.querySelector('[data-create-post-trigger]')?.click();
  };

  // Open PostDetail modal
  const handleOpenPostDetail = (post) => {
    setSelectedPost(post);
    setShowPostDetailModal(true);
  };

  // Close PostDetail modal
  const handleClosePostDetail = () => {
    setShowPostDetailModal(false);
    setTimeout(() => setSelectedPost(null), 300); // Clear after animation
  };

  // Helpers for documents widget
  const getDocCategory = (d) => {
    const mime = (d?.mime || '').toLowerCase();
    const name = (d?.filename || '').toLowerCase();
    if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name)) return 'image';
    if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
    if (mime.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'word';
    if (mime.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'excel';
    if (mime.includes('powerpoint') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'ppt';
    if (mime.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) return 'text';
    if (mime.includes('zip') || name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z')) return 'archive';
    return 'other';
  };

  const getDocIconClass = (cat) => {
    switch (cat) {
      case 'pdf': return 'ph-duotone ph-file-pdf text-danger';
      case 'word': return 'ph-duotone ph-file-doc text-primary';
      case 'excel': return 'ph-duotone ph-file-xls text-success';
      case 'ppt': return 'ph-duotone ph-file-ppt text-warning';
      case 'text': return 'ph-duotone ph-file-text text-secondary';
      case 'image': return 'ph-duotone ph-image text-info';
      case 'archive': return 'ph-duotone ph-file-zip text-muted';
      default: return 'ph-duotone ph-file text-secondary';
    }
  };

  return (
    <div>
      <HeroSection />
      <div className="mt-4">
        {/* Welcome message */}
        {user && (
          <div className="alert mb-4 home-welcome-alert">
            <div className="d-flex align-items-center">
              <i className="ph-duotone ph-hand-waving home-welcome-icon"></i>
              <div>
                <h6 className="home-welcome-title">Xin chào, {user.displayName}!</h6>
                <small className="home-welcome-subtitle">Chào mừng bạn trở lại</small>
              </div>
            </div>
          </div>
        )}

        <div>
          {/* Facebook-style update bar */}
          {showUpdateBtn && (
            <div className="home-update-bar">
              <i className="ph-duotone ph-bell-ringing home-update-bar-icon"></i>
              <span>Có nội dung mới! Bấm để cập nhật</span>
              <button
                className="btn btn-sm btn-warning home-update-bar-btn"
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
            <div className="card border-0 shadow-sm home-card">
              <div className="card-header bg-white d-flex justify-content-between align-items-center home-card-header">
                <h5 className="d-flex align-items-center home-card-title">
                  <i className="ph-duotone ph-fire text-danger me-2 home-card-title-icon"></i>
                  Bài viết mới nhất
                </h5>
                {/* <Link
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
                </Link> */}
              </div>
              <div className="card-body p-0">
                {/* Search bar */}
                <div className="home-search-container">
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control home-search-input"
                      placeholder="Tìm kiếm bài viết..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') getPosts(); }}
                    />
                    <button
                      className="btn btn-primary home-search-btn"
                      onClick={getPosts}
                    >
                      <i className="ph ph-magnifying-glass">Tìm</i>
                    </button>
                  </div>
                </div>
                <PostList
                  posts={posts}
                  loadingpost={loadingpost}
                  onPostClick={handleOpenPostDetail}
                  hasMore={hasMore}
                  onLoadMore={handleLoadMore}
                  isLoadingMore={isLoadingMore}
                />
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            {/* Categories widget */}
            <div className="card mb-3 border-0 shadow-sm home-card">
              <div className="card-body home-card-body">
                <h6 className="fw-bold mb-3 d-flex align-items-center home-widget-title">
                  <i className="ph-duotone ph-squares-four text-primary home-widget-icon"></i>
                  Chuyên mục
                </h6>
                <div className="list-group list-group-flush">
                  {categories && categories.slice(0, 6).map(cat => (
                    <Link
                      key={cat.slug}
                      to={`/category/${cat.slug}`}
                      className="list-group-item list-group-item-action d-flex justify-content-between align-items-center border-0 home-category-item"
                    >
                      <span className="home-category-text">
                        <i className="ph ph-folder-notch-open me-2 text-primary"></i>
                        {cat.title}
                      </span>
                      <span className="badge rounded-pill home-category-badge">
                        {cat.postCount || 0}
                      </span>
                    </Link>
                  ))}
                </div>
                {categories && categories.length > 6 && (
                  <Link
                    to="/category"
                    className="btn btn-sm btn-outline-primary w-100 home-category-btn"
                  >
                    Xem tất cả
                  </Link>
                )}
              </div>
            </div>

            {/* Active users widget */}
            <div className="card mb-3 border-0 shadow-sm home-card">
              <div className="card-body home-card-body">
                <h6 className="fw-bold mb-3 d-flex align-items-center home-widget-title">
                  <i className="ph-duotone ph-users-three text-success home-widget-icon"></i>
                  Thành viên tích cực
                </h6>
                {activeUsers && activeUsers.slice(0, 5).map((u, idx) => (
                  <Link key={u._id || idx} to={`/user/${u.username}`}>
                    <div className="d-flex align-items-center home-user-item">
                      <img
                        src={u.avatarUrl || `https://ui-avatars.com/api/?background=random&name=${u.displayName || u.username}`}
                        className="rounded-circle home-user-avatar"
                        alt="Avatar"
                      />
                      <div className="flex-grow-1">
                        <div className="home-user-name">{u.displayName || u.username}</div>
                        <small className="text-muted home-user-posts">{u.postsCount || 0} bài viết</small>
                      </div>
                      <span className={`badge ${u.isOnline ? 'bg-success' : 'bg-secondary'} home-user-status`}>
                        <i className={`ph ${u.isOnline ? 'ph-check-circle' : 'ph-clock'} me-1`}></i>
                        {u.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Documents widget */}
            <div className="card mb-3 border-0 shadow-sm home-card">
              <div className="card-body home-card-body">
                <h6 className="fw-bold mb-3 d-flex align-items-center home-widget-title">
                  <i className="ph-duotone ph-file-text text-warning home-widget-icon"></i>
                  Tài liệu mới
                </h6>
                <div className="list-group list-group-flush">
                  {Array.isArray(documents) && documents.length > 0 ? (
                    documents.slice(0, 5).map((doc) => {
                      const cat = getDocCategory(doc);
                      return (
                        <Link
                          key={doc._id}
                          to={doc.storageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="list-group-item list-group-item-action border-0 d-flex align-items-center home-doc-item"
                        >
                          <i className={`${getDocIconClass(cat)} home-doc-icon`}></i>
                          <span className="text-truncate home-doc-name">{doc.filename}</span>
                          {/* <small className="text-muted" style={{ fontSize: '12px' }}>{formatBytes(doc.size)}</small> */}
                          <div className="d-flex align-items-center ms-auto gap-2">
                            <img src={doc.ownerId.avatarUrl} alt="" className="home-doc-owner-avatar" />
                            <span className="text-muted home-doc-owner-name">{doc.ownerId.displayName || doc.ownerId.username}</span>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="text-muted home-doc-empty">Chưa có tài liệu</div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick actions widget */}
            <div className="card mb-3 border-0 shadow-sm home-card">
              <div className="card-body home-card-body">
                <h6 className="fw-bold mb-3 d-flex align-items-center home-widget-title">
                  <i className="ph-duotone ph-lightning text-warning home-widget-icon"></i>
                  Thao tác nhanh
                </h6>
                <div className="d-grid gap-2 home-quick-actions">
                  <button
                    className="btn btn-primary d-flex align-items-center justify-content-center home-quick-action-btn home-quick-action-primary"
                    onClick={handleCreatePost}
                  >
                    <i className="ph-duotone ph-plus-circle me-2"></i>
                    Tạo bài viết
                  </button>
                  <Link
                    to="/documents"
                    className="btn btn-outline-primary d-flex align-items-center justify-content-center home-quick-action-btn home-quick-action-outline"
                  >
                    <i className="ph ph-upload-simple me-2"></i>
                    Tải tài liệu
                  </Link>
                  {/* <Link
                    to="/find-study-group"
                    className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                    style={{ borderRadius: '8px', padding: '10px', fontWeight: 600, fontSize: '13px' }}
                  >
                    <i className="ph ph-users me-2"></i>
                    Tìm nhóm học
                  </Link> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PostDetail Modal */}
      {showPostDetailModal && selectedPost && (
        <PostDetail
          user={user}
          post={selectedPost}
          show={showPostDetailModal}
          onClose={handleClosePostDetail}
        />
      )}
    </div >
  );
};

export default Home;

