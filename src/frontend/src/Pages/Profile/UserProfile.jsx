import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  getUserByUsername, 
  getUserPosts,
  createComment,
  updateComment,
  deleteComment,
  likePost,
  unlikePost,
  likeComment,
  unlikeComment
} from '../../Utils/api';
import { useOutletContext } from 'react-router-dom';
import PostItem from '../../Components/PostItem';
import LoadingPost from '../../Components/LoadingPost';
import { toast } from 'react-toastify';

const UserProfile = () => {
  const { username } = useParams();
  const [users, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useOutletContext();
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  // Resolve current user id from context first, then localStorage as fallback
  const currentUserId = (user && (user._id || user.id)) || currentUser._id || currentUser.id;

  // State for comments
  const [isCommentsExpanded, setIsCommentsExpanded] = useState({});
  const [commentTexts, setCommentTexts] = useState({});
  const [commentAttachments, setCommentAttachments] = useState({});
  const [replyTo, setReplyTo] = useState({});
  const [replyTexts, setReplyTexts] = useState({});
  const [replyAttachments, setReplyAttachments] = useState({});

  // State for liked posts
  const [likedPosts, setLikedPosts] = useState(new Set());

  // Sync liked posts from posts data
  useEffect(() => {
    if (posts && posts.length > 0 && currentUserId) {
      const likedFromPosts = new Set();

      posts.forEach(post => {
        if (post.likes && Array.isArray(post.likes)) {
          const userLiked = post.likes.some(like =>
            String(like.userId?._id || like.userId) === String(currentUserId)
          );
          if (userLiked) {
            likedFromPosts.add(post._id);
          }
        }
      });

      setLikedPosts(likedFromPosts);
    }
  }, [posts, currentUserId]);

  // Format time helper
  const formatTime = (date) => {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (isNaN(d.getTime())) return "";
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return d.toLocaleDateString("vi-VN");
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Organize comments helper
  const organizeComments = (comments) => {
    const commentMap = {};
    const rootComments = [];

    comments.forEach(comment => {
      commentMap[comment._id] = { ...comment, replies: [] };
    });

    comments.forEach(comment => {
      if (comment.parentId && commentMap[comment.parentId]) {
        commentMap[comment.parentId].replies.push(commentMap[comment._id]);
      } else {
        rootComments.push(commentMap[comment._id]);
      }
    });

    return rootComments;
  };

  // Fetch thông tin user
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await getUserByUsername(username, token);
        
        if (response.success) {
          setUser(response.user);
        } else {
          setError(response.error || 'Không tìm thấy người dùng');
          toast.error(response.error || 'Không tìm thấy người dùng');
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Có lỗi xảy ra khi tải thông tin người dùng');
        toast.error('Có lỗi xảy ra khi tải thông tin người dùng');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [username, token]);

  // Fetch bài viết của user
  useEffect(() => {
    const fetchUserPosts = async () => {
      try {
        setLoadingPosts(true);
        const response = await getUserPosts(username, { page, limit: 10 }, token);
        
        if (response.success) {
          if (page === 1) {
            setPosts(response.data);
          } else {
            setPosts(prev => [...prev, ...response.data]);
          }
          setTotalPages(response.pagination.pages);
          setHasMore(page < response.pagination.pages);
        } else {
          toast.error(response.error || 'Không thể tải bài viết');
        }
      } catch (err) {
        console.error('Error fetching user posts:', err);
        toast.error('Có lỗi xảy ra khi tải bài viết');
      } finally {
        setLoadingPosts(false);
      }
    };

    if (users) {
      fetchUserPosts();
    }
  }, [username, page, users, token]);

  const loadMorePosts = () => {
    if (hasMore && !loadingPosts) {
      setPage(prev => prev + 1);
    }
  };

  const handlePostDeleted = (postId) => {
    setPosts(prevPosts => prevPosts.filter(post => post._id !== postId));
    toast.success('Đã xóa bài viết thành công');
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post._id === updatedPost._id ? { ...post, ...updatedPost } : post
      )
    );
  };

  // Toggle comments
  const toggleComments = (postId) => {
    setIsCommentsExpanded(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  // Handle comment change
  const handleCommentChange = (postId, value) => {
    setCommentTexts(prev => ({ ...prev, [postId]: value }));
  };

  // Handle attachment change
  const handleAttachmentChange = (postId, files) => {
    setCommentAttachments(prev => ({ ...prev, [postId]: Array.from(files) }));
  };

  // Remove attachment
  const removeAttachment = (postId, index) => {
    setCommentAttachments(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).filter((_, i) => i !== index)
    }));
  };

  // Submit comment
  const handleSubmitComment = async (postId) => {
    if (!token) {
      toast.error('Vui lòng đăng nhập để bình luận');
      return;
    }

    const content = commentTexts[postId]?.trim();
    const attachments = commentAttachments[postId] || [];

    if (!content && attachments.length === 0) {
      toast.warning('Vui lòng nhập nội dung hoặc đính kèm file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('postId', postId);
      formData.append('content', content || '');
      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await createComment(token, formData);
      
      if (response.success) {
        // Refresh posts to get updated comments
        const updatedPosts = await getUserPosts(username, { page: 1, limit: posts.length }, token);
        if (updatedPosts.success) {
          setPosts(updatedPosts.data);
        }
        
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));
        setCommentAttachments(prev => ({ ...prev, [postId]: [] }));
        toast.success('Đã thêm bình luận');
      }
    } catch (err) {
      toast.error('Không thể thêm bình luận');
    }
  };

  // Handle reply
  const handleReplyChange = (commentId, value) => {
    setReplyTexts(prev => ({ ...prev, [commentId]: value }));
  };

  const handleReplyAttachmentChange = (commentId, files) => {
    setReplyAttachments(prev => ({ ...prev, [commentId]: Array.from(files) }));
  };

  const removeReplyAttachment = (commentId, index) => {
    setReplyAttachments(prev => ({
      ...prev,
      [commentId]: (prev[commentId] || []).filter((_, i) => i !== index)
    }));
  };

  const handleSubmitReply = async (postId, parentId) => {
    if (!token) {
      toast.error('Vui lòng đăng nhập để trả lời');
      return;
    }

    const content = replyTexts[parentId]?.trim();
    const attachments = replyAttachments[parentId] || [];

    if (!content && attachments.length === 0) {
      toast.warning('Vui lòng nhập nội dung hoặc đính kèm file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('postId', postId);
      formData.append('content', content || '');
      formData.append('parentId', parentId);
      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await createComment(token, formData);
      
      if (response.success) {
        // Refresh posts
        const updatedPosts = await getUserPosts(username, { page: 1, limit: posts.length }, token);
        if (updatedPosts.success) {
          setPosts(updatedPosts.data);
        }
        
        setReplyTexts(prev => ({ ...prev, [parentId]: '' }));
        setReplyAttachments(prev => ({ ...prev, [parentId]: [] }));
        setReplyTo(null);
        toast.success('Đã thêm trả lời');
      }
    } catch (err) {
      toast.error('Không thể thêm trả lời');
    }
  };

  // Handle like post
  const handleLike = async (postId) => {
    if (!token) {
      toast.info('Vui lòng đăng nhập để thích bài viết');
      return;
    }

    const isCurrentlyLiked = likedPosts.has(postId);

    try {
      // Optimistic UI update
      if (isCurrentlyLiked) {
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        await unlikePost(token, postId);
      } else {
        setLikedPosts(prev => new Set([...prev, postId]));
        await likePost(token, postId);
      }

      // Refresh posts to sync with server
      const updatedPosts = await getUserPosts(username, { page: 1, limit: posts.length }, token);
      if (updatedPosts.success) {
        setPosts(updatedPosts.data);
      }
    } catch (err) {
      console.error('Error liking post:', err);
      // Revert optimistic update on error
      if (isCurrentlyLiked) {
        setLikedPosts(prev => new Set([...prev, postId]));
      } else {
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      }
      toast.error('Không thể thực hiện');
    }
  };

  // Handle edit post
  const handleEditPost = (post) => {
    // This would open edit modal - implement if needed
    toast.info('Chức năng chỉnh sửa sẽ được thêm');
  };

  // Handle delete post (only for own profile)
  const handleDeletePost = async (postId) => {
    // Already handled by handlePostDeleted
  };

  // Handle post click
  const onPostClick = (post) => {
    // Could navigate to post detail
    window.location.href = `/post/${post.slug}`;
  };

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !users) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger" role="alert">
          <i className="ph ph-warning-circle me-2"></i>
          {error || 'Không tìm thấy người dùng'}
        </div>
        <Link to="/" className="btn btn-primary">
          <i className="ph ph-arrow-left me-2"></i>
          Quay về trang chủ
        </Link>
      </div>
    );
  }

  const isOwnProfile = currentUser.username === users.username;

  return (
    <div className="container py-4">
      {/* Profile Header */}
      <div className="card mb-4">
        <div className="card-body">
          {/* Cover Photo (optional - có thể thêm sau) */}
          <div className="position-relative mb-4" style={{ height: '200px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px' }}>
            {/* Avatar positioned at bottom of cover */}
            <div className="position-absolute" style={{ bottom: '-50px', left: '30px' }}>
              <img
                src={users.avatarUrl || users.avatar || 'https://ui-avatars.com/api/?background=random&name=user'}
                alt={users.displayName || users.username}
                className="rounded-circle border border-4 border-white"
                style={{ width: '120px', height: '120px', objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* User Info */}
          <div className="mt-5 pt-3">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h2 className="mb-1">{users.displayName || users.username}</h2>
                <p className="text-muted mb-2">@{users.username}</p>
                {users.bio && (
                  <p className="mb-3">{users.bio}</p>
                )}
                
                {/* User Details */}
                <div className="d-flex flex-wrap gap-3 mb-3">
                  {users.faculty && (
                    <span className="badge bg-light text-dark">
                      <i className="ph ph-graduation-cap me-1"></i>
                      {users.faculty}
                    </span>
                  )}
                  {users.class && (
                    <span className="badge bg-light text-dark">
                      <i className="ph ph-users me-1"></i>
                      {users.class}
                    </span>
                  )}
                  {users.email && (
                    <span className="text-muted">
                      <i className="ph ph-envelope me-1"></i>
                      {users.email}
                    </span>
                  )}
                  {users.phone && (
                    <span className="text-muted">
                      <i className="ph ph-phone me-1"></i>
                      {users.phone}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="d-flex gap-4">
                  <div>
                    <strong>{users.stats?.postsCount || 0}</strong>
                    <span className="text-muted ms-1">bài viết</span>
                  </div>
                  <div>
                    <strong>{users.stats?.commentsCount || 0}</strong>
                    <span className="text-muted ms-1">bình luận</span>
                  </div>
                  <div>
                    <strong>{users.stats?.likesReceived || 0}</strong>
                    <span className="text-muted ms-1">lượt thích</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div>
                {isOwnProfile ? (
                  <Link to="/profile" className="btn btn-primary">
                    <i className="ph ph-pencil me-2"></i>
                    Chỉnh sửa trang cá nhân
                  </Link>
                ) : (
                  <div className="d-flex gap-2">
                    <button className="btn btn-primary">
                      <i className="ph ph-chat-circle me-2"></i>
                      Nhắn tin
                    </button>
                    <button className="btn btn-outline-secondary">
                      <i className="ph ph-user-plus me-2"></i>
                      Theo dõi
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <a className="nav-link active" href="#posts">
            <i className="ph ph-newspaper me-2"></i>
            Bài viết ({users.stats?.postsCount || 0})
          </a>
        </li>
        <li className="nav-item">
          <a className="nav-link disabled" href="#about">
            <i className="ph ph-info me-2"></i>
            Giới thiệu
          </a>
        </li>
      </ul>

      {/* Posts Section */}
      <div>
        <h4 className="mb-3">Bài viết của {users.displayName || users.username}</h4>
        
        {loadingPosts && page === 1 ? (
          <>
            <LoadingPost />
            <LoadingPost />
            <LoadingPost />
          </>
        ) : posts.length > 0 ? (
          <>
            {posts.map((post) => (
              <PostItem
                key={post._id}
                post={post}
                user={user}
                currentUserId={currentUserId}
                isLiked={likedPosts.has(post._id)}
                isCommentsExpanded={isCommentsExpanded[post._id]}
                commentTexts={commentTexts ?? {}}
                commentAttachments={commentAttachments ?? {}}
                handleCommentChange={handleCommentChange}
                handleAttachmentChange={handleAttachmentChange}
                removeAttachment={removeAttachment}
                handleSubmitComment={handleSubmitComment}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                replyTexts={replyTexts ?? {}}
                replyAttachments={replyAttachments ?? {}}
                handleReplyChange={handleReplyChange}
                handleReplyAttachmentChange={handleReplyAttachmentChange}
                removeReplyAttachment={removeReplyAttachment}
                handleSubmitReply={handleSubmitReply}
                formatTime={formatTime}
                formatFileSize={formatFileSize}
                organizeComments={organizeComments}
                handleLike={handleLike}
                handleDeletePost={handlePostDeleted}
                handleEditPost={handleEditPost}
                toggleComments={toggleComments}
                onPostClick={onPostClick}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center my-4">
                <button
                  className="btn btn-outline-primary"
                  onClick={loadMorePosts}
                  disabled={loadingPosts}
                >
                  {loadingPosts ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Đang tải...
                    </>
                  ) : (
                    <>
                      <i className="ph ph-arrow-down me-2"></i>
                      Xem thêm bài viết
                    </>
                  )}
                </button>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-center text-muted my-4">
                <i className="ph ph-check-circle me-2"></i>
                Đã hiển thị tất cả bài viết
              </div>
            )}
          </>
        ) : (
          <div className="card">
            <div className="card-body text-center py-5">
              <i className="ph ph-newspaper" style={{ fontSize: '64px', opacity: 0.3 }}></i>
              <h5 className="mt-3 mb-2">Chưa có bài viết nào</h5>
              <p className="text-muted">
                {isOwnProfile 
                  ? 'Bạn chưa đăng bài viết nào. Hãy chia sẻ suy nghĩ của bạn!' 
                  : `${users.displayName || users.username} chưa đăng bài viết nào.`
                }
              </p>
              {isOwnProfile && (
                <Link to="/" className="btn btn-primary mt-2">
                  <i className="ph ph-plus me-2"></i>
                  Tạo bài viết đầu tiên
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
