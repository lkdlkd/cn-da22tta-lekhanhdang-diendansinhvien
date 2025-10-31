import React, { useState, useContext, useEffect } from "react";
import PostItem from "./PostItem";
import EditPostModal from "./EditPostModal";
import { AuthContext } from "../Context/AuthContext";
import { useOutletContext } from "react-router-dom";
import * as api from "../Utils/api";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
const PostList = ({ posts, loadingpost, onPostUpdate, onPostClick }) => {
    const { auth } = useContext(AuthContext);
    const token = auth.token || localStorage.getItem('token');
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

    // State for pagination
    const [visibleCount, setVisibleCount] = useState(30);
    const POSTS_PER_PAGE = 30;

    // Reset visible count when posts change
    useEffect(() => {
        setVisibleCount(20); // số bài viết muốn hiển thị ban đầu   
    }, [posts]);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + POSTS_PER_PAGE);
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
                console.error(res.error || 'Lỗi gửi trả lời');
            }
        } catch (err) {
            console.error(err.message || 'Lỗi gửi trả lời');
        }
    };

    const [likedPosts, setLikedPosts] = useState(new Set());
    const [expandedComments, setExpandedComments] = useState(new Set());
    const [commentTexts, setCommentTexts] = useState({});
    const [commentAttachments, setCommentAttachments] = useState({});

    // Load liked posts từ server hoặc localStorage
    useEffect(() => {
        // TODO: Fetch liked posts from server
        // For now, load from localStorage
        const savedLikes = localStorage.getItem('likedPosts');
        if (savedLikes) {
            try {
                const likesArray = JSON.parse(savedLikes);
                setLikedPosts(new Set(likesArray));
            } catch (error) {
                console.error("Error loading liked posts:", error);
            }
        }
    }, []);

    // Sync liked posts with posts data when posts load
    useEffect(() => {
        if (posts && posts.length > 0 && currentUserId) {
            const newLikedPosts = new Set(likedPosts);

            posts.forEach(post => {
                if (post.likes && Array.isArray(post.likes)) {
                    // Check if current user liked this post
                    const userLiked = post.likes.some(like =>
                        String(like.userId?._id || like.userId) === String(currentUserId)
                    );

                    if (userLiked) {
                        newLikedPosts.add(post._id);
                    } else {
                        newLikedPosts.delete(post._id);
                    }
                }
            });

            setLikedPosts(newLikedPosts);
        }
    }, [posts, currentUserId]); // Run when posts data changes

    // Save liked posts to localStorage
    useEffect(() => {
        localStorage.setItem('likedPosts', JSON.stringify([...likedPosts]));
    }, [likedPosts]);

    const handleLike = async (postId) => {
        if (!token) {
            toast.info("Vui lòng đăng nhập để thích bài viết!");
            return;
        }

        try {
            const isLiked = likedPosts.has(postId);

            if (isLiked) {
                await api.unlikePost(token, postId);
                setLikedPosts(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(postId);
                    return newSet;
                });
            } else {
                await api.likePost(token, postId);
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
            console.error("Error liking/unliking post:", error);
            // Nếu API chưa implement, vẫn cho phép toggle UI
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

        try {
            const token = localStorage.getItem('token');
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
                console.log('Comment submitted successfully');
            } else {
                console.error(res.error || 'Lỗi gửi bình luận');
            }
        } catch (err) {
            console.error(err.message || 'Lỗi gửi bình luận');
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

        return rootComments;
    };

    // CommentItem is now imported from its own file

    // Loading skeleton
    if (loadingpost) {
        return (
            <div>
                {[...Array(3)].map((_, idx) => (
                    <div key={idx} style={{
                        backgroundColor: "white",
                        borderRadius: "8px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                        marginBottom: "16px",
                        padding: "12px 16px"
                    }}>
                        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                            <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                backgroundColor: "#e4e6eb"
                            }}></div>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    width: "150px",
                                    height: "16px",
                                    backgroundColor: "#e4e6eb",
                                    borderRadius: "4px",
                                    marginBottom: "8px"
                                }}></div>
                                <div style={{
                                    width: "100px",
                                    height: "14px",
                                    backgroundColor: "#e4e6eb",
                                    borderRadius: "4px"
                                }}></div>
                            </div>
                        </div>
                        <div style={{
                            width: "100%",
                            height: "60px",
                            backgroundColor: "#e4e6eb",
                            borderRadius: "4px",
                            marginBottom: "12px"
                        }}></div>
                        <div style={{
                            display: "flex",
                            gap: "8px",
                            paddingTop: "12px",
                            borderTop: "1px solid #e4e6eb"
                        }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{
                                    width: "80px",
                                    height: "32px",
                                    backgroundColor: "#e4e6eb",
                                    borderRadius: "4px"
                                }}></div>
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
            <div style={{
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "40px",
                textAlign: "center",
                color: "#65676b"
            }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📝</div>
                <h3 style={{ fontSize: "20px", marginBottom: "8px", color: "#050505" }}>
                    Chưa có bài viết nào
                </h3>
                <p>Hãy là người đầu tiên chia sẻ điều gì đó!</p>
            </div>
        );
    }

    // Get visible posts
    const visiblePosts = posts.slice(0, visibleCount);
    const hasMore = posts.length > visibleCount;

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
                />
            ))}

            {/* Load More Button */}
            {hasMore && (
                <div 
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        padding: '20px',
                        marginTop: '16px'
                    }}
                >
                    <button
                        onClick={handleLoadMore}
                        style={{
                            backgroundColor: 'white',
                            border: '2px solid #e4e6eb',
                            borderRadius: '8px',
                            padding: '12px 32px',
                            fontSize: '15px',
                            fontWeight: 600,
                            color: '#050505',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f0f2f5';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
                        }}
                    >
                        <i className="ph ph-arrow-down" style={{ fontSize: '18px' }}></i>
                        Xem thêm {Math.min(POSTS_PER_PAGE, posts.length - visibleCount)} bài viết
                    </button>
                </div>
            )}

            {/* Show total count */}
            {!hasMore && posts.length > POSTS_PER_PAGE && (
                <div 
                    style={{
                        textAlign: 'center',
                        padding: '20px',
                        color: '#65676b',
                        fontSize: '14px'
                    }}
                >
                    <i className="ph ph-check-circle" style={{ fontSize: '18px', marginRight: '8px' }}></i>
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