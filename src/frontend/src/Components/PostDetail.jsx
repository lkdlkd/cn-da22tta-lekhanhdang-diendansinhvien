import React, { useEffect, useState, useContext, useRef } from "react";
import Layout from './Layout';
import { useParams } from "react-router-dom";
import { getPostBySlug, createComment } from "../Utils/api";
import PostItem from "./PostItem";
import { AuthContext } from "../Context/AuthContext";
const { socket } = require('../Utils/socket');

export default function PostDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Use ref to avoid adding post to dependencies
  const postRef = useRef(null);
  postRef.current = post;

  // Fetch post only once when slug changes
  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const data = await getPostBySlug(slug);
        setPost(data);
        setError(null);
        // Auto expand comments for detail page
        if (data._id) {
          setExpandedComments(new Set([data._id]));
        }
      } catch (err) {
        setError("Không tìm thấy bài viết hoặc có lỗi xảy ra.");
        setPost(null);
      }
      setLoading(false);
    };
    fetchPost();
  }, [slug]); // Only depend on slug

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

    socket.on('post:liked', handlePostLiked);
    socket.on('post:unliked', handlePostUnliked);
    socket.on('comment:liked', handleCommentLiked);
    socket.on('comment:unliked', handleCommentUnliked);
    socket.on('comment:new', handleNewComment);

    return () => {
      socket.off('post:liked', handlePostLiked);
      socket.off('post:unliked', handlePostUnliked);
      socket.off('comment:liked', handleCommentLiked);
      socket.off('comment:unliked', handleCommentUnliked);
      socket.off('comment:new', handleNewComment);
    };
  }, []); // Empty dependencies - setup once  // Load liked posts từ localStorage
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
      alert("Vui lòng đăng nhập để thích bài viết");
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
    if (!window.confirm("Bạn có chắc muốn xóa bài viết này?")) {
      return;
    }

    try {
      const { deletePost } = await import("../Utils/api");
      await deletePost(token, postId);
      alert("Đã xóa bài viết thành công");
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Có lỗi xảy ra khi xóa bài viết");
    }
  };

  const handleEditPost = (postId) => {
    window.location.href = `/edit-post/${postId}`;
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
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('Có lỗi khi đăng bình luận');
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
    } catch (err) {
      console.error('Error posting reply:', err);
      alert('Có lỗi khi đăng trả lời');
    }
  };

  const formatTime = (date) => {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (isNaN(d.getTime())) return "N/A";
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

  return (
    <div className="container mt-4">
      {loading ? (
        <div style={{
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
          padding: "12px 16px"
        }}>
          <div className="alert alert-info">Đang tải bài viết...</div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : post ? (
        <PostItem
          post={post}
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
    </div>
  );
}
