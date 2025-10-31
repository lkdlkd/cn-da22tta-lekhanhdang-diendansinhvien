import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPostsByCategory, getCategoryById } from '../../Utils/api';
import PostList from '../../Components/PostList';
import PostDetail from '../../Components/PostDetail';
import { useOutletContext } from 'react-router-dom';
import LoadingPost from '../../Components/LoadingPost';
const { socket } = require('../../Utils/socket');

const CategoryPosts = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user ,categories} = useOutletContext();
  const [category, setCategory] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for PostDetail modal
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostDetailModal, setShowPostDetailModal] = useState(false);

  // Load data khi slug thay đổi
  useEffect(() => {
    loadCategoryAndPosts();
  }, [slug]);

  // Setup socket listeners (chỉ phụ thuộc vào slug)
  useEffect(() => {
    // 🔥 REALTIME: Lắng nghe bài viết mới
    const handleNewPost = (newPost) => {
      // Chỉ thêm nếu bài viết thuộc category hiện tại
      setPosts(prev => {
        // Kiểm tra category từ state hiện tại
        if (category && String(newPost.categoryId?._id) === String(category._id)) {
          if (prev.some(p => p._id === newPost._id)) return prev;
          return [newPost, ...prev];
        }
        return prev;
      });
    };

    socket.on('post:new', handleNewPost);

    // 🔥 REALTIME: Cập nhật bài viết
    socket.on('post:updated', ({ postId, post: updatedPost }) => {
      setPosts(prev => prev.map(post => {
        if (String(post._id) === String(postId)) {
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
    });

    // 🔥 REALTIME: Xóa bài viết
    socket.on('post:deleted', ({ postId }) => {
      setPosts(prev => prev.filter(post => String(post._id) !== String(postId)));
    });

    // 🔥 REALTIME: Like bài viết
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

    // 🔥 REALTIME: Unlike bài viết
    socket.on('post:unliked', ({ postId, likeId }) => {
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

    // 🔥 REALTIME: Bình luận mới
    socket.on('comment:new', ({ postId, comment }) => {
      setPosts(prev => prev.map(post => {
        if (String(post._id) === String(postId)) {
          if (post.comments && post.comments.some(c => c._id === comment._id)) return post;
          return {
            ...post,
            comments: [...(post.comments || []), comment],
            commentsCount: (post.commentsCount || 0) + 1
          };
        }
        return post;
      }));
    });

    // 🔥 REALTIME: Cập nhật bình luận
    socket.on('comment:updated', ({ commentId, postId, comment: updatedComment }) => {
      setPosts(prev => prev.map(post => {
        if (String(post._id) === String(postId)) {
          return {
            ...post,
            comments: (post.comments || []).map(c => 
              String(c._id) === String(commentId) ? { ...c, ...updatedComment } : c
            )
          };
        }
        return post;
      }));
    });

    // 🔥 REALTIME: Xóa bình luận
    socket.on('comment:deleted', ({ commentId, postId }) => {
      setPosts(prev => prev.map(post => {
        if (String(post._id) === String(postId)) {
          return {
            ...post,
            comments: (post.comments || []).filter(c => String(c._id) !== String(commentId)),
            commentsCount: Math.max(0, (post.commentsCount || 0) - 1)
          };
        }
        return post;
      }));
    });

    // 🔥 REALTIME: Like comment
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

    // 🔥 REALTIME: Unlike comment
    socket.on('comment:unliked', ({ commentId, postId, likeId }) => {
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

    // Cleanup khi unmount
    return () => {
      socket.off('post:new', handleNewPost);
      socket.off('post:updated');
      socket.off('post:deleted');
      socket.off('post:liked');
      socket.off('post:unliked');
      socket.off('comment:new');
      socket.off('comment:updated');
      socket.off('comment:deleted');
      socket.off('comment:liked');
      socket.off('comment:unliked');
    };
  }, [slug]); // Chỉ phụ thuộc vào slug, KHÔNG phụ thuộc category

  const loadCategoryAndPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load category info và posts song song
      const [postsData] = await Promise.all([
        // getCategoryById(slug),
        getPostsByCategory(slug)
      ]);

      setCategory(categories.find(cat => cat.slug === slug) || null);
      setPosts(postsData);
    } catch (err) {
      console.error('Error loading category posts:', err);
      setError(err.message || 'Không thể tải bài viết');
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center py-5">
          <LoadingPost />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <i className="ph ph-warning-circle me-2" style={{ fontSize: '24px' }}></i>
          <div>
            <strong>Lỗi!</strong> {error}
          </div>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => navigate(-1)}
        >
          <i className="ph ph-arrow-left me-2"></i>
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* Header với thông tin chuyên mục */}
      <div className="card border-0 shadow-sm mb-4" style={{ 
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div className="card-body" style={{ padding: '24px' }}>
          <div className="d-flex align-items-center mb-3">
            <button 
              className="btn btn-light btn-sm me-3"
              onClick={() => navigate(-1)}
              style={{ borderRadius: '8px' }}
            >
              <i className="ph ph-arrow-left me-1"></i>
              Quay lại
            </button>
            <div className="flex-grow-1">
              <h4 className="mb-2 d-flex align-items-center" style={{ fontWeight: 700 }}>
                <i className="ph-duotone ph-folder-notch-open me-2" style={{ fontSize: '32px' }}></i>
                {category?.title || 'Chuyên mục'}
              </h4>
              {category?.description && (
                <p className="mb-0" style={{ opacity: 0.95, fontSize: '14px' }}>
                  {category.description}
                </p>
              )}
            </div>
          </div>
          
          {/* Stats */}
          <div className="d-flex gap-4 mt-3" style={{ fontSize: '14px' }}>
            <div className="d-flex align-items-center">
              <i className="ph ph-file-text me-2" style={{ fontSize: '20px' }}></i>
              <span><strong>{posts.length}</strong> bài viết</span>
            </div>
            {category?.count !== undefined && (
              <div className="d-flex align-items-center">
                <i className="ph ph-eye me-2" style={{ fontSize: '20px' }}></i>
                <span><strong>{category.count}</strong> lượt xem</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-12">
          {/* Posts list */}
          {posts.length === 0 ? (
            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
              <div className="card-body text-center py-5">
                <i className="ph-duotone ph-folder-open" style={{ 
                  fontSize: '64px', 
                  color: '#ccc',
                  marginBottom: '16px'
                }}></i>
                <h5 className="text-muted mb-3">Chưa có bài viết nào</h5>
                <p className="text-muted mb-4">
                  Chuyên mục này chưa có bài viết. Hãy là người đầu tiên đăng bài!
                </p>
                {user && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/')}
                    style={{ 
                      borderRadius: '8px',
                      padding: '10px 24px',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none'
                    }}
                  >
                    <i className="ph ph-plus-circle me-2"></i>
                    Tạo bài viết mới
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
              <div className="card-header bg-white d-flex justify-content-between align-items-center" style={{ 
                borderBottom: '2px solid #f0f2f5',
                padding: '16px 20px',
                borderRadius: '12px 12px 0 0'
              }}>
                <h5 className="mb-0 d-flex align-items-center" style={{ fontWeight: 700, fontSize: '18px' }}>
                  <i className="ph-duotone ph-list-bullets text-primary me-2" style={{ fontSize: '22px' }}></i>
                  Danh sách bài viết
                </h5>
                <span className="badge rounded-pill" style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontSize: '12px',
                  padding: '6px 12px'
                }}>
                  {posts.length} bài viết
                </span>
              </div>
              <div className="card-body p-0">
                <PostList 
                  user={user}
                  posts={posts} 
                  loadingpost={false} 
                  onPostClick={handleOpenPostDetail}
                />
              </div>
            </div>
          )}
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
    </div>
  );
};

export default CategoryPosts;
