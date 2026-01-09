import React, { useState, useContext, useEffect } from "react";
import PostItem from "./PostItem";
import EditPostModal from "./EditPostModal";
import { AuthContext } from "../Context/AuthContext";
import { useOutletContext } from "react-router-dom";
import * as api from "../Utils/api";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import '../assets/css/PostListStyles.css';
const PostList = ({ posts, loadingpost, onPostUpdate, onPostClick, hasMore: hasMoreProp, onLoadMore, isLoadingMore }) => {
    const { auth } = useContext(AuthContext);
    const token = auth.token;
    const { user } = useOutletContext();
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

    const [replyTo, setReplyTo] = useState({});
    const [replyTexts, setReplyTexts] = useState({});
    const [replyAttachments, setReplyAttachments] = useState({});

    // State for edit modal
    const [editingPost, setEditingPost] = useState(null);

    // Loading states
    const [isSubmittingComment, setIsSubmittingComment] = useState({});
    const [isSubmittingReply, setIsSubmittingReply] = useState({});

    // State for client-side pagination (fallback if server pagination not provided)
    const [visibleCount, setVisibleCount] = useState(30);
    const POSTS_PER_PAGE = 30;

    // Reset visible count when posts change
    useEffect(() => {
        setVisibleCount(20); // số bài viết muốn hiển thị ban đầu   
    }, [posts]);

    const handleLoadMore = () => {
        if (typeof onLoadMore === 'function') {
            onLoadMore();
        } else {
            setVisibleCount(prev => prev + POSTS_PER_PAGE);
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

        // Prevent double submission
        if (isSubmittingReply[parentId]) return;
        if (!token) {
            toast.info("Vui lòng đăng nhập để bình luận!");
            return;
        }
        setIsSubmittingReply(prev => ({ ...prev, [parentId]: true }));

        try {
            let formData;
            if (attachments.length > 0) {
                formData = new FormData();
                formData.append('postId', postId);
                formData.append('content', text || '');
                formData.append('parentId', parentId);
                attachments.forEach((att) => {
                    formData.append('attachments', att.file);
                });
            }
            const res = await import('../Utils/api').then(api =>
                api.createComment(token, attachments.length > 0 ? formData : { postId, content: text, parentId })
            );
            if (res.success) {
                attachments.forEach(att => { if (att.preview) URL.revokeObjectURL(att.preview); });
                setReplyTexts(prev => ({ ...prev, [parentId]: '' }));
                setReplyAttachments(prev => ({ ...prev, [parentId]: [] }));
                setReplyTo(prev => ({ ...prev, [parentId]: false }));
            } else {
                toast.error(res.error || 'Lỗi gửi trả lời');
            }
        } catch (err) {
            toast.error(err.message || 'Lỗi gửi trả lời');
        } finally {
            setIsSubmittingReply(prev => ({ ...prev, [parentId]: false }));
        }
    };

    const [likedPosts, setLikedPosts] = useState(new Set());
    const [expandedComments, setExpandedComments] = useState(new Set());
    const [commentTexts, setCommentTexts] = useState({});
    const [commentAttachments, setCommentAttachments] = useState({});

    // Sync liked posts with posts data from database
    useEffect(() => {
        if (posts && posts.length > 0 && currentUserId) {
            const newLikedPosts = new Set();

            posts.forEach(post => {
                if (post.likes && Array.isArray(post.likes)) {
                    // Check if current user liked this post
                    const userLiked = post.likes.some(like =>
                        String(like.userId?._id || like.userId) === String(currentUserId)
                    );

                    if (userLiked) {
                        newLikedPosts.add(post._id);
                    }
                }
            });

            setLikedPosts(newLikedPosts);
        }
    }, [posts, currentUserId]); // Run when posts data changes

    const handleLike = async (postId) => {
        if (!token) {
            toast.info("Vui lòng đăng nhập để thích bài viết!");
            return;
        }

        try {
            const isLiked = likedPosts.has(postId);

            if (isLiked) {
                const result = await api.unlikePost(token, postId);
                if (!result.success) {
                    throw new Error(result.error || "Lỗi khi bỏ thích bài viết");
                }
                setLikedPosts(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(postId);
                    return newSet;
                });
            } else {
                const result = await api.likePost(token, postId);
                if (!result.success) {
                    throw new Error(result.error || "Lỗi khi thích bài viết");
                }
                setLikedPosts(prev => {
                    const newSet = new Set(prev);
                    newSet.add(postId);
                    return newSet;
                });
            }

            // Reload posts để cập nhật like count
            if (onPostUpdate) {
                onPostUpdate();
            }
        } catch (error) {
            toast.error(error.message || "Lỗi khi thích/bỏ thích bài viết");
        }
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
                    const result = await api.deletePost(token, postId);
                    if (result.success) {
                        toast.success("Đã xóa bài viết thành công!");
                        if (onPostUpdate) {
                            onPostUpdate();
                        }
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

    const handleEditPost = (postId) => {
        const postToEdit = posts.find(p => p._id === postId);
        if (postToEdit) {
            setEditingPost(postToEdit);
        }
    };

    const handleCloseEditModal = () => {
        setEditingPost(null);
    };

    const handleUpdateSuccess = () => {
        if (onPostUpdate) {
            onPostUpdate();
        }
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
        setCommentTexts(prev => ({
            ...prev,
            [postId]: value
        }));
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
            return {
                ...prev,
                [postId]: updated
            };
        });
    };

    const handleSubmitComment = async (postId) => {
        const text = commentTexts[postId];
        const attachments = commentAttachments[postId] || [];

        if ((!text || !text.trim()) && attachments.length === 0) return;

        // Prevent double submission
        if (isSubmittingComment[postId]) return;
        if (!token) {
            toast.info("Vui lòng đăng nhập để bình luận!");
            return;
        }
        setIsSubmittingComment(prev => ({ ...prev, [postId]: true }));

        try {
            let formData;

            if (attachments.length > 0) {
                formData = new FormData();
                formData.append('postId', postId);
                formData.append('content', text || '');
                attachments.forEach((att) => {
                    formData.append('attachments', att.file);
                });
            }

            const res = await import('../Utils/api').then(api =>
                api.createComment(token, attachments.length > 0 ? formData : { postId, content: text })
            );

            if (res.success) {
                attachments.forEach(att => {
                    if (att.preview) URL.revokeObjectURL(att.preview);
                });
                setCommentTexts(prev => ({ ...prev, [postId]: '' }));
                setCommentAttachments(prev => ({ ...prev, [postId]: [] }));
            } else {
                toast.error(res.error || 'Lỗi gửi bình luận')
            }
        } catch (err) {
            toast.error(err.message || 'Lỗi gửi bình luận');
        } finally {
            setIsSubmittingComment(prev => ({ ...prev, [postId]: false }));
        }
    };

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

    // Tổ chức comments thành cấu trúc parent-children
    const organizeComments = (comments) => {
        const commentMap = {};
        const rootComments = [];

        // Tạo map của tất cả comments
        comments.forEach(comment => {
            commentMap[comment._id] = { ...comment, replies: [] };
        });

        // Phân loại thành root comments và replies
        comments.forEach(comment => {
            if (comment.parentId && commentMap[comment.parentId]) {
                commentMap[comment.parentId].replies.push(commentMap[comment._id]);
            } else {
                rootComments.push(commentMap[comment._id]);
            }
        });

        // Sắp xếp comments và replies theo thời gian mới nhất
        rootComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        rootComments.forEach(comment => {
            comment.replies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        });

        return rootComments;
    };

    // CommentItem is now imported from its own file

    // Loading skeleton
    if (loadingpost) {
        return (
            <div>
                {[...Array(3)].map((_, idx) => (
                    <div key={idx} className="post-list-skeleton">
                        <div className="skeleton-header">
                            <div className="skeleton-avatar"></div>
                            <div className="skeleton-header-content">
                                <div className="skeleton-title"></div>
                                <div className="skeleton-subtitle"></div>
                            </div>
                        </div>
                        <div className="skeleton-body"></div>
                        <div className="skeleton-actions">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="skeleton-button"></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Empty state
    if (!posts || posts.length === 0) {
        return (
            <div className="post-list-empty">
                <div className="post-list-empty-icon">📝</div>
                <h3 className="post-list-empty-title">
                    Chưa có bài viết nào
                </h3>
                <p>Hãy là người đầu tiên chia sẻ điều gì đó!</p>
            </div>
        );
    }

    // Determine pagination mode and visible items
    const serverPaginated = typeof onLoadMore === 'function';
    const visiblePosts = serverPaginated ? posts : posts.slice(0, visibleCount);
    const hasMore = serverPaginated ? !!hasMoreProp : posts.length > visibleCount;

    return (
        <div>
            {visiblePosts.map(post => (
                <PostItem
                    key={post._id}
                    user={user}
                    post={post}
                    currentUserId={currentUserId}
                    isLiked={likedPosts.has(post._id)}
                    isCommentsExpanded={expandedComments.has(post._id)}
                    commentTexts={commentTexts}
                    commentAttachments={commentAttachments}
                    replyTo={replyTo}
                    replyTexts={replyTexts}
                    replyAttachments={replyAttachments}
                    handleLike={handleLike}
                    handleDeletePost={handleDeletePost}
                    handleEditPost={handleEditPost}
                    toggleComments={toggleComments}
                    handleCommentChange={handleCommentChange}
                    handleAttachmentChange={handleAttachmentChange}
                    removeAttachment={removeAttachment}
                    handleSubmitComment={handleSubmitComment}
                    organizeComments={organizeComments}
                    formatTime={formatTime}
                    formatFileSize={formatFileSize}
                    setReplyTo={setReplyTo}
                    handleReplyChange={handleReplyChange}
                    handleReplyAttachmentChange={handleReplyAttachmentChange}
                    removeReplyAttachment={removeReplyAttachment}
                    handleSubmitReply={handleSubmitReply}
                    onPostClick={onPostClick}
                    isSubmittingComment={isSubmittingComment[post._id]}
                    isSubmittingReply={isSubmittingReply}
                />
            ))}

            {/* Load More Button */}
            {hasMore && (
                <div className="load-more-container">
                    <button
                        onClick={handleLoadMore}
                        disabled={serverPaginated && isLoadingMore}
                        className="load-more-button"
                    >
                        <i className="bi bi-arrow-down load-more-icon"></i>
                        {serverPaginated
                            ? (isLoadingMore ? 'Đang tải...' : 'Xem thêm')
                            : `Xem thêm ${Math.min(POSTS_PER_PAGE, posts.length - visibleCount)} bài viết`}
                    </button>
                </div>
            )}

            {/* Show total count (client-side paging only) */}
            {!serverPaginated && !hasMore && posts.length > POSTS_PER_PAGE && (
                <div className="total-count-container">
                    <i className="bi bi-check-circle total-count-icon"></i>
                    Đã hiển thị tất cả {posts.length} bài viết
                </div>
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
};

export default PostList;