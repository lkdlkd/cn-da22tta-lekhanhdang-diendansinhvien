import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../../Context/AuthContext';
import {
  getUserByUsername,
  getUserPosts,
  createComment,
  deletePost,
  updateComment,
  deleteComment,
  likePost,
  unlikePost,
  likeComment,
  unlikeComment,
  createReport
} from '../../Utils/api';
import Swal from 'sweetalert2';
import { useOutletContext } from 'react-router-dom';
import PostItem from '../../Components/PostItem';
import LoadingPost from '../../Components/LoadingPost';
import { toast } from 'react-toastify';
import EditPostModal from '../../Components/EditPostModal';
import { useNavigate } from 'react-router-dom';
import '../../assets/css/UserProfile.css';

const { socket } = require('../../Utils/socket');
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
  const { auth } = useContext(AuthContext);
  const token = auth.token;
  const currentUser = user;
  // Resolve current user id from context first, then localStorage as fallback
  const currentUserId = currentUser && (currentUser._id || currentUser.id);
  // State for comments
  const [isCommentsExpanded, setIsCommentsExpanded] = useState({});
  const [commentTexts, setCommentTexts] = useState({});
  const [commentAttachments, setCommentAttachments] = useState({});
  const [replyTo, setReplyTo] = useState({});
  const [replyTexts, setReplyTexts] = useState({});
  const [replyAttachments, setReplyAttachments] = useState({});

  // State for liked posts
  const [likedPosts, setLikedPosts] = useState(new Set());
  const navigate = useNavigate();
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

  // Realtime updates for this user's posts and their comments/likes
  useEffect(() => {
    // New post by this user
    const handleNewPost = (newPost) => {
      const authorUsername = newPost?.authorId?.username || newPost?.author?.username;
      if (authorUsername && authorUsername === username) {
        setPosts(prev => {
          if (prev.some(p => String(p._id) === String(newPost._id))) return prev;
          return [newPost, ...prev];
        });
      }
    };

    // Post updated
    const handlePostUpdated = ({ postId, post: updatedPost }) => {
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
    };

    // Post deleted
    const handlePostDeleted = ({ postId }) => {
      setPosts(prev => prev.filter(post => String(post._id) !== String(postId)));
    };

    // Post liked
    const handlePostLiked = ({ postId, like }) => {
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
    };

    // Post unliked
    const handlePostUnliked = ({ postId, likeId }) => {
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
    };

    // New comment on a post
    const handleCommentNew = ({ postId, comment }) => {
      setPosts(prev => prev.map(post => {
        if (String(post._id) === String(postId)) {
          if (post.comments && post.comments.some(c => String(c._id) === String(comment._id))) return post;
          return {
            ...post,
            comments: [...(post.comments || []), comment],
            commentsCount: (post.commentsCount || 0) + 1
          };
        }
        return post;
      }));
    };

    // Comment updated
    const handleCommentUpdated = ({ commentId, postId, comment: updatedComment }) => {
      setPosts(prev => prev.map(post => {
        if (String(post._id) === String(postId)) {
          return {
            ...post,
            comments: (post.comments || []).map(c => String(c._id) === String(commentId) ? { ...c, ...updatedComment } : c)
          };
        }
        return post;
      }));
    };

    // Comment deleted
    const handleCommentDeleted = ({ commentId, postId }) => {
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
    };

    // Comment liked
    const handleCommentLiked = ({ commentId, postId, like }) => {
      setPosts(prev => prev.map(post => {
        if (String(post._id) === String(postId)) {
          return {
            ...post,
            comments: (post.comments || []).map(c => {
              if (String(c._id) === String(commentId)) {
                return { ...c, likes: [...(c.likes || []), like] };
              }
              return c;
            })
          };
        }
        return post;
      }));
    };

    // Comment unliked
    const handleCommentUnliked = ({ commentId, postId, likeId }) => {
      setPosts(prev => prev.map(post => {
        if (String(post._id) === String(postId)) {
          return {
            ...post,
            comments: (post.comments || []).map(c => {
              if (String(c._id) === String(commentId)) {
                return { ...c, likes: (c.likes || []).filter(l => String(l._id) !== String(likeId)) };
              }
              return c;
            })
          };
        }
        return post;
      }));
    };

    // Register listeners
    socket.on('post:new', handleNewPost);
    socket.on('post:updated', handlePostUpdated);
    socket.on('post:deleted', handlePostDeleted);
    socket.on('post:liked', handlePostLiked);
    socket.on('post:unliked', handlePostUnliked);
    socket.on('comment:new', handleCommentNew);
    socket.on('comment:updated', handleCommentUpdated);
    socket.on('comment:deleted', handleCommentDeleted);
    socket.on('comment:liked', handleCommentLiked);
    socket.on('comment:unliked', handleCommentUnliked);

    // Cleanup
    return () => {
      socket.off('post:new', handleNewPost);
      socket.off('post:updated', handlePostUpdated);
      socket.off('post:deleted', handlePostDeleted);
      socket.off('post:liked', handlePostLiked);
      socket.off('post:unliked', handlePostUnliked);
      socket.off('comment:new', handleCommentNew);
      socket.off('comment:updated', handleCommentUpdated);
      socket.off('comment:deleted', handleCommentDeleted);
      socket.off('comment:liked', handleCommentLiked);
      socket.off('comment:unliked', handleCommentUnliked);
    };
  }, [username]);

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

  // Handle report user
  const handleReportUser = async () => {
    if (!token) {
      toast.error('Vui lòng đăng nhập để báo cáo');
      return;
    }

    const { value: reason } = await Swal.fire({
      title: 'Báo cáo người dùng',
      html: `
        <p class="text-start mb-3">Bạn muốn báo cáo <strong>@${users.username}</strong>?</p>
        <select id="report-reason" class="form-select">
          <option value="">-- Chọn lý do --</option>
          <option value="spam">Spam hoặc quảng cáo</option>
          <option value="Quấy rối hoặc bắt nạt">Quấy rối hoặc bắt nạt</option>
          <option value="Ngôn từ thù ghét">Ngôn từ thù ghét</option>
          <option value="Nội dung không phù hợp">Nội dung không phù hợp</option>
          <option value="Mạo danh">Mạo danh</option>
          <option value="Lý do khác">Lý do khác</option>
        </select>
        <textarea id="report-detail" class="form-control mt-3" rows="3" placeholder="Mô tả chi tiết (không bắt buộc)"></textarea>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Gửi báo cáo',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const reason = document.getElementById('report-reason').value;
        const detail = document.getElementById('report-detail').value;
        
        if (!reason) {
          Swal.showValidationMessage('Vui lòng chọn lý do báo cáo');
          return false;
        }
        
        return { reason, detail };
      }
    });

    if (reason) {
      try {
        const reasonText = reason.detail 
          ? `${reason.reason}: ${reason.detail}` 
          : reason.reason;

        const response = await createReport(token, 'user', users._id, reasonText);
        
        if (response.success) {
          toast.success('Đã gửi báo cáo. Cảm ơn bạn đã giúp giữ cộng đồng an toàn!');
        } else {
          toast.error(response.error || 'Không thể gửi báo cáo');
        }
      } catch (error) {
        console.error('Error reporting user:', error);
        toast.error('Có lỗi xảy ra khi gửi báo cáo');
      }
    }
  };

  const [editingPost, setEditingPost] = useState(null);

  // Handle edit post
  const handleEditPost = (postId) => {
    const postToEdit = posts.find(p => p._id === postId);
    if (postToEdit) {
      setEditingPost(postToEdit);
    }
  };

  const handleCloseEditModal = () => {
    setEditingPost(null);
  };
  const handleUpdateSuccess = (updatedPost) => {
    // setPosts(prevPosts =>
    //   prevPosts.map(post =>
    //     post._id === updatedPost._id ? updatedPost : post
    //   )
    // );
  };
  const handleDeletePost = async (postId) => {

    Swal.fire({
      title: 'Bạn có chắc muốn xóa bài viết này?',
      text: "Hành động này không thể hoàn tác!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      customClass: {
        container: 'swal-on-modal'
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const result = await deletePost(token, postId);
          if (result.success) {
            toast.success("Đã xóa bài viết thành công!");

          } else {
            toast.error(result.error || "Lỗi xóa bài viết");
          }
        } catch (error) {
          console.error("Error deleting post:", error);
          toast.error(error.message || "Lỗi xóa bài viết");
        }
      }
    });
  };

  // Handle post click
  const onPostClick = (post) => {
    // Could navigate to post detail
    navigate(`/post/${post.slug}`);
  };

  if (loading) {
    return (
      <LoadingPost />
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
  
  // Kiểm tra currentUser trước khi truy cập username
  const isOwnProfile = currentUser && users && currentUser.username === users.username;

  return (
    <div className="">
      {/* Profile Header */}
      <div className="card mb-4">
        <div className="card-body">
          {/* Cover Photo */}
          <div className="user-profile-cover">
            {/* Avatar positioned at bottom of cover */}
            <div className="user-profile-avatar-container">
              <img
                src={users.avatarUrl || users.avatar || 'https://ui-avatars.com/api/?background=random&name=user'}
                alt={users.displayName || users.username}
                className="user-profile-avatar"
              />
            </div>
          </div>

          {/* User Info */}
          <div className="user-profile-info">
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
                  {/* {users.email && (
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
                  )} */}
                </div>

                {/* Stats */}
                <div className="user-profile-stats">
                  <div className="user-profile-stat-item">
                    <strong>{users.stats?.postsCount || 0}</strong>
                    <span className="text-muted">bài viết</span>
                  </div>
                  <div className="user-profile-stat-item">
                    <strong>{users.stats?.commentsCount || 0}</strong>
                    <span className="text-muted">bình luận</span>
                  </div>
                  <div className="user-profile-stat-item">
                    <strong>{users.stats?.likesReceived || 0}</strong>
                    <span className="text-muted">lượt thích</span>
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
                  <div className="user-profile-actions">
                    <Link to={`/message/${users.username}`} className="btn btn-primary">
                      <i className="ph ph-chat-circle me-2"></i>
                      Nhắn tin
                    </Link>
                    <button className="btn btn-outline-danger" onClick={handleReportUser}>
                      <i className="ph ph-warning me-2"></i>
                      Báo cáo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
                handleDeletePost={handleDeletePost}
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
            <div className="card-body user-profile-empty-card">
              <i className="ph ph-newspaper user-profile-empty-icon"></i>
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
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={handleCloseEditModal}
          onUpdate={handleUpdateSuccess}
        />
      )}
    </div>
  );
};

export default UserProfile;
