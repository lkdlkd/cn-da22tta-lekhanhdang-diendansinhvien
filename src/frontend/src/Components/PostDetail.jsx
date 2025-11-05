import React, { useEffect, useState, useContext, useRef } from "react";
import Layout from './Layout';
import { useParams, useNavigate } from "react-router-dom";
import Modal from "react-bootstrap/Modal";
import { getPostBySlug, createComment } from "../Utils/api";
import PostItem from "./PostItem";
import { AuthContext } from "../Context/AuthContext";
import { useOutletContext } from "react-router-dom";
import LoadingPost from "./LoadingPost";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import EditPostModal from "./EditPostModal";
const { socket } = require('../Utils/socket');

export default function PostDetail({ post: initialPost, show, onClose }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(initialPost || null);
  const [loading, setLoading] = useState(!initialPost);
  const [error, setError] = useState(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [showModal, setShowModal] = useState(show !== undefined ? show : true);
  const { user } = useOutletContext();
  const { auth } = useContext(AuthContext);
  const token = auth.token || localStorage.getItem('token');

  // Decode token để lấy user ID
  let currentUserId = null;
  if (token) {
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      currentUserId = decoded._id || decoded.userId || decoded.id;
    } catch (error) {
      console.error("Token decode error:", error);
    }
  }

  const [likedPosts, setLikedPosts] = useState(new Set());
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [commentTexts, setCommentTexts] = useState({});
  const [commentAttachments, setCommentAttachments] = useState({});
  const [replyTo, setReplyTo] = useState({});
  const [replyTexts, setReplyTexts] = useState({});
  const [replyAttachments, setReplyAttachments] = useState({});

  // State for edit modal
  const [editingPost, setEditingPost] = useState(null);

  // Use ref to avoid adding post to dependencies
  const postRef = useRef(null);
  postRef.current = post;

  // Sync with external show prop
  useEffect(() => {
    if (show !== undefined) {
      setShowModal(show);
    }
  }, [show]);

  // Set post from initialPost prop
  useEffect(() => {
    if (initialPost) {
      console.log('PostDetail received initialPost:', initialPost);
      console.log('Post createdAt:', initialPost.createdAt);
      console.log('Post author:', initialPost.authorId);
      setPost(initialPost);
      setLoading(false);
      // Auto expand comments when post is provided via props
      if (initialPost._id) {
        setExpandedComments(new Set([initialPost._id]));
      }
    }
  }, [initialPost]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle ESC key and background click to close modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isDesktop) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isDesktop, navigate]);

  // Prevent body scroll when modal is open on desktop
  useEffect(() => {
    if (isDesktop && showModal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isDesktop, showModal]);

  // Fetch post only once when slug changes (only if no initialPost provided)
  useEffect(() => {
    if (initialPost) return; // Skip fetch if post provided via props

    const fetchPost = async () => {
      setLoading(true);
      try {
        const data = await getPostBySlug(slug);

        // Kiểm tra nếu API trả về lỗi
        if (!data.success && data.error) {
          setError("Không tìm thấy bài viết");
          setPost(null);
          setLoading(false);
          return;
        }

        setPost(data);
        setError(null);

        // Auto expand comments for detail page
        if (data._id) {
          setExpandedComments(new Set([data._id]));
        }
      } catch (err) {
        console.error('Error fetching post:', err); // Debug log
        setError("Không tìm thấy bài viết hoặc có lỗi xảy ra.");
        setPost(null);
      }
      setLoading(false);
    };

    if (slug) { // Only fetch if slug exists
      fetchPost();
    }
  }, [slug, initialPost]); // Depend on both slug and initialPost

  // Setup socket listeners separately
  useEffect(() => {
    // Lắng nghe socket events cho realtime updates
    const handlePostLiked = ({ postId, like }) => {
      const currentPost = postRef.current;
      if (currentPost && String(currentPost._id) === String(postId)) {
        setPost(prev => ({
          ...prev,
          likes: [...(prev.likes || []), like],
          likesCount: (prev.likesCount || 0) + 1
        }));
      }
    };

    const handlePostUnliked = ({ postId, likeId }) => {
      const currentPost = postRef.current;
      if (currentPost && String(currentPost._id) === String(postId)) {
        setPost(prev => ({
          ...prev,
          likes: (prev.likes || []).filter(like => String(like._id) !== String(likeId)),
          likesCount: Math.max(0, (prev.likesCount || 0) - 1)
        }));
      }
    };

    const handleCommentLiked = ({ commentId, postId, like }) => {
      const currentPost = postRef.current;
      if (currentPost && String(currentPost._id) === String(postId)) {
        setPost(prev => ({
          ...prev,
          comments: (prev.comments || []).map(comment => {
            if (String(comment._id) === String(commentId)) {
              return {
                ...comment,
                likes: [...(comment.likes || []), like]
              };
            }
            return comment;
          })
        }));
      }
    };

    const handleCommentUnliked = ({ commentId, postId, likeId }) => {
      const currentPost = postRef.current;
      if (currentPost && String(currentPost._id) === String(postId)) {
        setPost(prev => ({
          ...prev,
          comments: (prev.comments || []).map(comment => {
            if (String(comment._id) === String(commentId)) {
              return {
                ...comment,
                likes: (comment.likes || []).filter(like => String(like._id) !== String(likeId))
              };
            }
            return comment;
          })
        }));
      }
    };

    const handleNewComment = ({ postId, comment }) => {
      const currentPost = postRef.current;
      if (currentPost && String(currentPost._id) === String(postId)) {
        setPost(prev => ({
          ...prev,
          comments: prev.comments && prev.comments.some(c => c._id === comment._id)
            ? prev.comments
            : [...(prev.comments || []), comment],
          commentsCount: (prev.commentsCount || 0) + 1
        }));
      }
    };

    // Realtime update post content when edited
    const handlePostUpdated = ({ postId, post }) => {
      const currentPost = postRef.current;
      if (currentPost && String(currentPost._id) === String(postId)) {
        setPost(prev => ({
          ...prev,
          title: post.title || prev.title,
          content: post.content || prev.content,
          excerpt: post.excerpt || prev.excerpt,
          categoryId: post.categoryId || prev.categoryId,
          tags: post.tags || prev.tags,
          attachments: post.attachments || prev.attachments,
          slug: post.slug || prev.slug

        }));
        // toast.info('Bài viết đã được cập nhật', { autoClose: 2000 });
      }
    };

    // Handle post deletion
    const handlePostDeleted = ({ postId }) => {
      const currentPost = postRef.current;
      if (currentPost && String(currentPost._id) === String(postId)) {
        // toast.warning('Bài viết đã bị xóa');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    };

    socket.on('post:liked', handlePostLiked);
    socket.on('post:unliked', handlePostUnliked);
    socket.on('comment:liked', handleCommentLiked);
    socket.on('comment:unliked', handleCommentUnliked);
    socket.on('comment:new', handleNewComment);
    socket.on('post:updated', handlePostUpdated);
    socket.on('post:deleted', handlePostDeleted);

    return () => {
      socket.off('post:liked', handlePostLiked);
      socket.off('post:unliked', handlePostUnliked);
      socket.off('comment:liked', handleCommentLiked);
      socket.off('comment:unliked', handleCommentUnliked);
      socket.off('comment:new', handleNewComment);
      socket.off('post:updated', handlePostUpdated);
      socket.off('post:deleted', handlePostDeleted);
    };
  }, [navigate]); // Add navigate to dependencies  // Load liked posts từ localStorage
  useEffect(() => {
    const savedLikes = localStorage.getItem('likedPosts');
    if (savedLikes) {
      try {
        const likesArray = JSON.parse(savedLikes);
        setLikedPosts(new Set(likesArray));
      } catch (error) {
        console.error('Error loading likes:', error);
      }
    }
  }, []);

  // Sync liked posts with post data when post loads
  useEffect(() => {
    if (post && post.likes && currentUserId) {
      const newLikedPosts = new Set(likedPosts);

      // Check if current user liked this post
      const userLiked = post.likes.some(like =>
        String(like.userId?._id || like.userId) === String(currentUserId)
      );

      if (userLiked) {
        newLikedPosts.add(post._id);
      } else {
        newLikedPosts.delete(post._id);
      }

      setLikedPosts(newLikedPosts);
    }
  }, [post, currentUserId]); // Run when post data changes

  // Save liked posts to localStorage
  useEffect(() => {
    localStorage.setItem('likedPosts', JSON.stringify([...likedPosts]));
  }, [likedPosts]);

  const handleLike = async (postId) => {
    if (!token) {
      toast.info("Vui lòng đăng nhập để thích bài viết");
      return;
    }

    try {
      const { likePost, unlikePost } = await import("../Utils/api");
      const isLiked = likedPosts.has(postId);

      if (isLiked) {
        await unlikePost(token, postId);
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      } else {
        await likePost(token, postId);
        setLikedPosts(prev => new Set(prev).add(postId));
      }

      // Don't refresh - socket will handle the update
    } catch (error) {
      console.error("Error toggling like:", error);
      // Fallback to UI-only toggle if API fails
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(postId)) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });
    }
  };

  const handleDeletePost = async (postId) => {
    const result = await Swal.fire({
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
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const { deletePost } = await import("../Utils/api");
      await deletePost(token, postId);
      toast.success("Đã xóa bài viết thành công");

      // Close modal if open, otherwise redirect
      if (onClose) {
        onClose();
      } else {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Có lỗi xảy ra khi xóa bài viết");
    }
  };

  const handleEditPost = (postId) => {
    console.log("Editing post:", postId);
    if (post) {
      setEditingPost(post);
    }
  };

  const handleCloseEditModal = () => {
    setEditingPost(null);
  };

  const handleUpdateSuccess = async () => {
    // Reload post data after successful update
    if (post && post.slug) {
      try {
        const token = localStorage.getItem('token');
        const res = await getPostBySlug(post.slug);
        if (res.success) {
          setPost(res.data);
          toast.success("Cập nhật bài viết thành công!");
        }
      } catch (error) {
        console.error("Error reloading post:", error);
      }
    }
    setEditingPost(null);
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleCommentChange = (postId, value) => {
    setCommentTexts(prev => ({ ...prev, [postId]: value }));
  };

  const handleAttachmentChange = (postId, files) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const previews = fileArray.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      name: file.name,
      type: file.type,
      size: file.size
    }));
    setCommentAttachments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), ...previews]
    }));
  };

  const removeAttachment = (postId, index) => {
    setCommentAttachments(prev => {
      const current = prev[postId] || [];
      if (current[index]?.preview) {
        URL.revokeObjectURL(current[index].preview);
      }
      const updated = current.filter((_, idx) => idx !== index);
      return { ...prev, [postId]: updated };
    });
  };

  const handleSubmitComment = async (postId) => {
    const text = commentTexts[postId];
    const attachments = commentAttachments[postId] || [];

    if ((!text || !text.trim()) && attachments.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      let formData;
      if (attachments.length > 0) {
        formData = new FormData();
        formData.append('postId', postId);
        formData.append('content', text || ' ');
        attachments.forEach(att => {
          formData.append('attachments', att.file);
        });
      }

      await createComment(token, formData || { postId, content: text });

      // Don't refresh - socket will handle the update
      // Clear form
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      setCommentAttachments(prev => ({ ...prev, [postId]: [] }));

      // Cleanup previews
      attachments.forEach(att => {
        if (att.preview) URL.revokeObjectURL(att.preview);
      });
    } catch (err) {
      console.error('Error posting comment:', err);
      toast.error('Có lỗi khi đăng bình luận');
    }
  };

  const handleReplyChange = (commentId, value) => {
    setReplyTexts(prev => ({ ...prev, [commentId]: value }));
  };

  const handleReplyAttachmentChange = (commentId, files) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const previews = fileArray.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      name: file.name,
      type: file.type,
      size: file.size
    }));
    setReplyAttachments(prev => ({ ...prev, [commentId]: [...(prev[commentId] || []), ...previews] }));
  };

  const removeReplyAttachment = (commentId, index) => {
    setReplyAttachments(prev => {
      const current = prev[commentId] || [];
      if (current[index]?.preview) {
        URL.revokeObjectURL(current[index].preview);
      }
      const updated = current.filter((_, idx) => idx !== index);
      return { ...prev, [commentId]: updated };
    });
  };

  const handleSubmitReply = async (postId, parentId) => {
    const text = replyTexts[parentId];
    const attachments = replyAttachments[parentId] || [];
    if ((!text || !text.trim()) && attachments.length === 0) return;
    try {
      const token = localStorage.getItem('token');
      let formData;
      if (attachments.length > 0) {
        formData = new FormData();
        formData.append('postId', postId);
        formData.append('parentId', parentId);
        formData.append('content', text || ' ');
        attachments.forEach(att => {
          formData.append('attachments', att.file);
        });
      }

      await createComment(token, formData || { postId, parentId, content: text });

      // Don't refresh - socket will handle the update
      // Clear form
      setReplyTexts(prev => ({ ...prev, [parentId]: '' }));
      setReplyAttachments(prev => ({ ...prev, [parentId]: [] }));
      setReplyTo(prev => ({ ...prev, [parentId]: false }));

      // Cleanup previews
      attachments.forEach(att => {
        if (att.preview) URL.revokeObjectURL(att.preview);
      });
    } catch (err) {
      console.error('Error posting reply:', err);
      toast.error('Có lỗi khi đăng trả lời');
    }
  };

  const formatTime = (date) => {
    if (!date) return "N/A"; // Check if date exists first
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    if (!d || isNaN(d.getTime())) return "N/A"; // Check if valid date
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
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

  const organizeComments = (comments) => {
    const commentMap = {};
    const rootComments = [];

    comments.forEach(comment => {
      commentMap[comment._id] = { ...comment, replies: [] };
    });

    comments.forEach(comment => {
      if (comment.parentId) {
        commentMap[comment.parentId]?.replies.push(commentMap[comment._id]);
      } else {
        rootComments.push(commentMap[comment._id]);
      }
    });

    return rootComments;
  };

  // Loading Skeleton Component (Facebook style)


  const handleCloseModal = () => {
    setShowModal(false);
    setTimeout(() => {
      if (onClose) {
        onClose(); // Use parent's close handler if provided
      } else {
        navigate(-1); // Fallback to navigation
      }
    }, 300); // Wait for modal animation to complete
  };

  // Desktop Modal Layout
  if (isDesktop) {
    return (
      <>
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .shimmer-wrapper {
            position: relative;
            overflow: hidden;
            background: #f0f2f5;
          }
          .shimmer-wrapper::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
            animation: shimmer 1.5s infinite;
          }
          
          /* Custom Modal Styles */
          .post-detail-modal .modal-dialog {
            max-width: 700px;
            margin: 1.75rem auto;
          }
          
          .post-detail-modal .modal-content {
            border: none;
            border-radius: 12px;
            box-shadow: 0 12px 28px rgba(0,0,0,0.15);
          }
          
          .post-detail-modal .modal-body {
            padding: 0;
            max-height: 85vh;
            overflow-y: auto;
          }
          
          .post-detail-modal .modal-backdrop {
            backdrop-filter: blur(5px);
            background-color: rgba(255, 255, 255, 0.9);
          }
          
          .post-detail-modal .btn-close {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.7) url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23fff'%3e%3cpath d='M.293.293a1 1 0 011.414 0L8 6.586 14.293.293a1 1 0 111.414 1.414L9.414 8l6.293 6.293a1 1 0 01-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 01-1.414-1.414L6.586 8 .293 1.707a1 1 0 010-1.414z'/%3e%3c/svg%3e") center/1em auto no-repeat;
            opacity: 1;
            z-index: 1060;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          }
          
          .post-detail-modal .btn-close:hover {
            background-color: rgba(0, 0, 0, 0.9);
            transform: scale(1.1);
          }
        `}</style>

        <Modal
          show={showModal}
          onHide={handleCloseModal}
          centered
          size="lg"
          className="post-detail-modal"
          // backdrop="static"
          keyboard={true}
        >
          <Modal.Header style={{ 
            borderBottom: '1px solid #e4e6eb', 
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <button
              onClick={handleCloseModal}
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: 600,
                color: '#050505',
                padding: '6px 12px',
                borderRadius: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#f2f3f5'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span style={{ fontSize: '20px' }}>←</span>
              <span>Trở về</span>
            </button>
          </Modal.Header>
          <Modal.Body>
            {loading ? (
              <div style={{ padding: '20px' }}>
                <LoadingPost />
              </div>
            ) : error ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>😞</div>
                <h3 style={{ fontSize: '20px', marginBottom: '8px', color: '#050505' }}>
                  Không tìm thấy bài viết
                </h3>
                <p style={{ color: '#65676b', marginBottom: '20px' }}>{error}</p>
                <button
                  onClick={handleCloseModal}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: '#1877f2',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontWeight: 600
                  }}
                >
                  Quay lại
                </button>
              </div>
            ) : post ? (
              <PostItem
                post={post}
                user={user}
                currentUserId={currentUserId}
                isLiked={likedPosts.has(post._id)}
                isCommentsExpanded={expandedComments.has(post._id)}
                commentTexts={commentTexts}
                setCommentTexts={setCommentTexts}
                commentAttachments={commentAttachments}
                setCommentAttachments={setCommentAttachments}
                handleCommentChange={handleCommentChange}
                handleAttachmentChange={handleAttachmentChange}
                removeAttachment={removeAttachment}
                handleSubmitComment={handleSubmitComment}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                replyTexts={replyTexts}
                setReplyTexts={setReplyTexts}
                replyAttachments={replyAttachments}
                setReplyAttachments={setReplyAttachments}
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
                onPostClick={() => { }} // Empty function to prevent navigation in modal
              />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                <p style={{ color: '#65676b' }}>Không có dữ liệu bài viết.</p>
              </div>
            )}
          </Modal.Body>
        </Modal>

        {/* Edit Post Modal */}
        {editingPost && (
          <EditPostModal
            post={editingPost}
            onClose={handleCloseEditModal}
            onUpdate={handleUpdateSuccess}
          />
        )}
      </>
    );
  }

  // Mobile Full Page Layout
  return (
    <div className="container mt-4">
      {/* Header with back button */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '16px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 600,
            color: '#050505',
            padding: '6px 12px',
            borderRadius: '6px',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#f2f3f5'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span style={{ fontSize: '20px' }}>←</span>
          <span>Trở về</span>
        </button>
      </div>

      {loading ? (
        <LoadingPost />
      ) : error ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😞</div>
          <h3 style={{ fontSize: '20px', marginBottom: '8px', color: '#050505' }}>
            Không tìm thấy bài viết
          </h3>
          <p style={{ color: '#65676b', marginBottom: '20px' }}>{error}</p>
          <button
            onClick={handleCloseModal}
            className="btn btn-primary"
            style={{
              backgroundColor: '#1877f2',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 600
            }}
          >
            Quay lại
          </button>
        </div>
      ) : post ? (
        <PostItem
          post={post}
          user={user}
          currentUserId={currentUserId}
          isLiked={likedPosts.has(post._id)}
          isCommentsExpanded={expandedComments.has(post._id)}
          commentTexts={commentTexts}
          setCommentTexts={setCommentTexts}
          commentAttachments={commentAttachments}
          setCommentAttachments={setCommentAttachments}
          handleCommentChange={handleCommentChange}
          handleAttachmentChange={handleAttachmentChange}
          removeAttachment={removeAttachment}
          handleSubmitComment={handleSubmitComment}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          replyTexts={replyTexts}
          setReplyTexts={setReplyTexts}
          replyAttachments={replyAttachments}
          setReplyAttachments={setReplyAttachments}
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
        />
      ) : (
        <div className="alert alert-warning">Không có dữ liệu bài viết.</div>
      )}

      {/* Edit Post Modal */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={handleCloseEditModal}
          onUpdate={handleUpdateSuccess}
        />
      )}
    </div>
  );
}
