import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import CommentItem from "./CommentItem";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
const PostItem = ({
  post,
  currentUserId,
  isLiked,
  isCommentsExpanded,
  commentTexts,
  setCommentTexts,
  commentAttachments,
  setCommentAttachments,
  handleCommentChange,
  handleAttachmentChange,
  removeAttachment,
  handleSubmitComment,
  replyTo,
  setReplyTo,
  replyTexts,
  setReplyTexts,
  replyAttachments,
  setReplyAttachments,
  handleReplyChange,
  handleReplyAttachmentChange,
  removeReplyAttachment,
  handleSubmitReply,
  formatTime,
  formatFileSize,
  organizeComments,
  handleLike,
  handleDeletePost,
  handleEditPost,
  toggleComments
}) => {
  const hasComments = post.comments && post.comments.length > 0;
  const organizedComments = hasComments ? organizeComments(post.comments) : [];

  // State for image lightbox
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // State for "Xem thêm" content
  const [isExpanded, setIsExpanded] = useState(false);
  const contentLimit = 300;

  // State for options menu
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // State for likes modal
  const [showLikesModal, setShowLikesModal] = useState(false);

  // State for liked comments (local to this post)
  const [likedComments, setLikedComments] = useState(new Set());

  // Sync liked comments from post data on mount/update
  React.useEffect(() => {
    if (post.comments && currentUserId) {
      const likedCommentIds = new Set();

      // Function to check likes recursively for nested comments
      const checkCommentLikes = (comments) => {
        comments.forEach(comment => {
          // Check if current user liked this comment
          if (comment.likes && Array.isArray(comment.likes)) {
            const userLiked = comment.likes.some(like =>
              String(like.userId?._id || like.userId) === String(currentUserId)
            );
            if (userLiked) {
              likedCommentIds.add(comment._id);
            }
          }

          // Check replies recursively
          if (comment.replies && comment.replies.length > 0) {
            checkCommentLikes(comment.replies);
          }
        });
      };

      checkCommentLikes(post.comments);
      setLikedComments(likedCommentIds);
    }
  }, [post.comments, currentUserId]);

  // Handle like/unlike comment
  const handleLikeComment = async (commentId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.info("Vui lòng đăng nhập để thích bình luận");
      return;
    }

    try {
      const { likeComment, unlikeComment } = await import("../Utils/api");
      const isLiked = likedComments.has(commentId);

      if (isLiked) {
        await unlikeComment(token, commentId);
        setLikedComments(prev => {
          const newSet = new Set(prev);
          newSet.delete(commentId);
          return newSet;
        });
      } else {
        await likeComment(token, commentId);
        setLikedComments(prev => new Set(prev).add(commentId));
      }
    } catch (error) {
      // Fallback to UI-only toggle if API fails
      setLikedComments(prev => {
        const newSet = new Set(prev);
        if (newSet.has(commentId)) {
          newSet.delete(commentId);
        } else {
          newSet.add(commentId);
        }
        return newSet;
      });
    }
  };

  // Check if current user is the post author
  const isAuthor = currentUserId && post.authorId &&
    (String(currentUserId) === String(post.authorId._id || post.authorId));

  // Get all image attachments
  const imageAttachments = post.attachments?.filter(file => file.mime && file.mime.startsWith("image")) || [];

  const openLightbox = (imageUrl, index) => {
    setLightboxImage(imageUrl);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  const nextImage = () => {
    if (lightboxIndex < imageAttachments.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
      setLightboxImage(imageAttachments[lightboxIndex + 1].storageUrl);
    }
  };

  const prevImage = () => {
    if (lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
      setLightboxImage(imageAttachments[lightboxIndex - 1].storageUrl);
    }
  };

  // Initialize navigate hook for navigation
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: "white", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", marginBottom: "16px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src={post.authorId?.avatarUrl || "/default-avatar.png"}
            alt="Avatar"
            style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontWeight: "600", fontSize: "15px", color: "#050505" }}>
                {post.authorId?.displayName || post.authorId?.username || "Ẩn danh"}
              </span>
              {post.pinned && (
                <span style={{ backgroundColor: "#fff3cd", color: "#856404", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>📌 Ghim</span>
              )}
              {post.locked && (
                <span style={{ backgroundColor: "#e7e9eb", color: "#65676b", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>🔒 Đã khóa</span>
              )}
            </div>
            <div style={{ fontSize: "13px", color: "#65676b" }}>
              <span
                onClick={() => navigate(`/post/${post.slug}`, { state: { post } })}
                style={{
                  cursor: "pointer",
                  transition: "text-decoration 0.2s"
                }}
                onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
              >
                {formatTime(post.createdAt)}
              </span> · <span style={{ backgroundColor: "#e7f3ff", color: "#1877f2", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", fontWeight: "500" }}>{post.categoryId?.title || "Chung"}</span>
            </div>
          </div>

          {/* Options Menu Button */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                color: "#65676b",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 0.2s"
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = "#f2f3f5"}
              onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
            >
              ⋯
            </button>

            {/* Dropdown Menu */}
            {showOptionsMenu && (
              <>
                {/* Backdrop to close menu */}
                <div
                  onClick={() => setShowOptionsMenu(false)}
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 998
                  }}
                />

                {/* Menu */}
                <div style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  backgroundColor: "white",
                  borderRadius: "8px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                  minWidth: "200px",
                  zIndex: 999,
                  overflow: "hidden",
                  marginTop: "4px"
                }}>
                  {isAuthor && (
                    <>
                      <button
                        onClick={() => {
                          setShowOptionsMenu(false);
                          handleEditPost(post._id);
                        }}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          border: "none",
                          background: "none",
                          textAlign: "left",
                          cursor: "pointer",
                          fontSize: "15px",
                          color: "#050505",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          transition: "background-color 0.2s"
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = "#f2f3f5"}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <span style={{ fontSize: "18px" }}>✏️</span>
                        <span>Chỉnh sửa bài viết</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowOptionsMenu(false);
                          handleDeletePost(post._id);
                        }}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          border: "none",
                          background: "none",
                          textAlign: "left",
                          cursor: "pointer",
                          fontSize: "15px",
                          color: "#e41e3f",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          transition: "background-color 0.2s"
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = "#fee"}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <span style={{ fontSize: "18px" }}>🗑️</span>
                        <span style={{ fontWeight: "600" }}>Xóa bài viết</span>
                      </button>

                      <div style={{
                        height: "1px",
                        backgroundColor: "#e4e6eb",
                        margin: "4px 0"
                      }} />
                    </>
                  )}

                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      navigator.clipboard.writeText(window.location.origin + `/post/${post.slug}`);
                      alert("Đã sao chép link bài viết!");
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "none",
                      background: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "15px",
                      color: "#050505",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      transition: "background-color 0.2s"
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = "#f2f3f5"}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <span style={{ fontSize: "18px" }}>🔗</span>
                    <span>Sao chép liên kết</span>
                  </button>

                  {!isAuthor && (
                    <button
                      onClick={() => {
                        setShowOptionsMenu(false);
                        alert("Chức năng báo cáo đang được phát triển");
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "15px",
                        color: "#050505",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        transition: "background-color 0.2s"
                      }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = "#f2f3f5"}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <span style={{ fontSize: "18px" }}>⚠️</span>
                      <span>Báo cáo bài viết</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 16px 12px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#050505", marginBottom: "8px", lineHeight: "1.4" }}>
          <span
            onClick={() => navigate(`/post/${post.slug}`, { state: { post } })}
            style={{
              color: "#050505",
              textDecoration: "none",
              cursor: "pointer",
              transition: "color 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.color = "#1877f2"}
            onMouseOut={e => e.currentTarget.style.color = "#050505"}
          >
            {post.title}
          </span>
        </h3>
        <div style={{ fontSize: "15px", color: "#050505", lineHeight: "1.5", marginBottom: "8px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {post.excerpt ? (
            post.excerpt
          ) : (
            <>
              {isExpanded || !post.content || post.content.length <= contentLimit
                ? post.content
                : post.content.slice(0, contentLimit) + "..."}
            </>
          )}
        </div>
        {!post.excerpt && post.content && post.content.length > contentLimit && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: "none",
              border: "none",
              color: "#65676b",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              padding: "0",
              marginBottom: "8px",
              transition: "color 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.color = "#050505"}
            onMouseOut={(e) => e.currentTarget.style.color = "#65676b"}
          >
            {isExpanded ? "Ẩn bớt" : "Xem thêm"}
          </button>
        )}
        {post.tags && post.tags.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
            {post.tags.map((tag, idx) => (
              <span key={idx} style={{ color: "#1877f2", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <>
          {/* Image attachments */}
          {imageAttachments.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: imageAttachments.length === 1 ? "1fr" : "repeat(2, 1fr)", gap: "2px" }}>
              {imageAttachments.map((file, idx) => (
                <img
                  key={idx}
                  src={file.storageUrl || file}
                  alt="attachment"
                  onClick={() => openLightbox(file.storageUrl || file, idx)}
                  style={{ width: "100%", height: imageAttachments.length === 1 ? "400px" : "200px", objectFit: "cover", cursor: "pointer" }}
                />
              ))}
            </div>
          )}

          {/* Non-image attachments */}
          {post.attachments.filter(file => !(file.mime && file.mime.startsWith("image"))).map((file, idx) => (
            <Link
              key={idx}
              to={file.storageUrl || file}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
                backgroundColor: "#f0f2f5",
                borderRadius: "8px",
                textDecoration: "none",
                margin: "8px 16px",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#e4e6eb"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f0f2f5"}
            >
              <div style={{
                width: "40px",
                height: "40px",
                backgroundColor: "#fff",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "12px",
                fontSize: "20px"
              }}>
                �
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#050505", fontWeight: "500", fontSize: "14px", marginBottom: "2px" }}>
                  {file.filename || "Tài liệu"}
                </div>
                <div style={{ color: "#65676b", fontSize: "12px" }}>
                  {formatFileSize(file.size || 0)}
                </div>
              </div>
              <div style={{ color: "#1877f2", fontSize: "14px", fontWeight: "600" }}>
                Tải xuống
              </div>
            </Link>
          ))}
        </>
      )}

      {/* Stats */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #e4e6eb", borderBottom: "1px solid #e4e6eb", display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#65676b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {(post.likesCount > 0 || isLiked) && (
            <>
              <span style={{
                background: "#1877f2",
                color: "white",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px"
              }}>👍</span>
              <span
                onClick={() => setShowLikesModal(true)}
                style={{
                  cursor: "pointer",
                  transition: "text-decoration 0.2s"
                }}
                onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
              >
                {post.likesCount || post.likes?.length || 0}
              </span>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <span style={{ cursor: "pointer", transition: "color 0.2s" }}
            onMouseOver={e => e.currentTarget.style.color = "#050505"}
            onMouseOut={e => e.currentTarget.style.color = "#65676b"}
          >
            {post.commentsCount || 0} bình luận
          </span>
          <span style={{ cursor: "pointer", transition: "color 0.2s" }}
            onMouseOver={e => e.currentTarget.style.color = "#050505"}
            onMouseOut={e => e.currentTarget.style.color = "#65676b"}
          >
            {post.views || 0} lượt xem
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: "4px 8px", display: "flex", justifyContent: "space-around" }}>
        <button
          onClick={() => handleLike(post._id)}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            padding: "8px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: "600",
            color: isLiked ? "#1877f2" : "#65676b",
            transition: "background-color 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = "#f2f3f5"}
          onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
        >
          <span style={{ fontSize: "18px" }}>{isLiked ? "👍" : "👍🏻"}</span>
          <span style={{ color: isLiked ? "#1877f2" : "#65676b" }}>Thích</span>
        </button>
        <button
          onClick={() => toggleComments(post._id)}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            padding: "8px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: "600",
            color: isCommentsExpanded ? "#1877f2" : "#65676b",
            transition: "background-color 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = "#f2f3f5"}
          onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
        >
          💬 Bình luận
        </button>
        <button style={{
          flex: 1,
          background: "none",
          border: "none",
          padding: "8px",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "15px",
          fontWeight: "600",
          color: "#65676b",
          transition: "background-color 0.2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px"
        }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = "#f2f3f5"}
          onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
        >
          ↗️ Chia sẻ
        </button>
      </div>

      {/* Comments Section */}
      {isCommentsExpanded && (
        <div style={{ borderTop: "1px solid #e4e6eb", padding: "12px 16px", backgroundColor: "#f7f8fa" }}>
          {/* Existing Comments */}
          {hasComments ? (
            <div style={{ marginBottom: "16px" }}>
              {organizedComments.map(cmt => (
                <CommentItem
                  key={cmt._id}
                  comment={cmt}
                  postId={post._id}
                  isReply={false}
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
                  currentUserId={currentUserId}
                  likedComments={likedComments}
                  handleLikeComment={handleLikeComment}
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "20px", color: "#65676b", fontSize: "14px" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>💬</div>
              <div style={{ fontWeight: "500" }}>Chưa có bình luận nào</div>
              <div style={{ fontSize: "13px", marginTop: "4px" }}>Hãy là người đầu tiên bình luận!</div>
            </div>
          )}

          {/* Comment Input - Facebook Style */}
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <img
              src="/default-avatar.png"
              alt="Your avatar"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ position: "relative" }}>
                <textarea
                  value={commentTexts[post._id] || ''}
                  onChange={e => handleCommentChange(post._id, e.target.value)}
                  placeholder="Viết bình luận..."
                  style={{
                    width: "100%",
                    backgroundColor: "#f0f2f5",
                    border: "none",
                    borderRadius: "18px",
                    padding: "8px 40px 8px 12px",
                    fontSize: "13px",
                    resize: "none",
                    minHeight: "36px",
                    outline: "none",
                    fontFamily: "inherit",
                    transition: "background-color 0.2s"
                  }}
                  rows={1}
                  onInput={e => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onFocus={e => e.currentTarget.style.backgroundColor = "#e4e6eb"}
                  onBlur={e => e.currentTarget.style.backgroundColor = "#f0f2f5"}
                />
                <label
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    cursor: "pointer",
                    fontSize: "18px",
                    color: "#65676b",
                    transition: "transform 0.2s"
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = "translateY(-50%) scale(1.1)"}
                  onMouseOut={e => e.currentTarget.style.transform = "translateY(-50%) scale(1)"}
                >
                  📎
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip,.rar"
                    onChange={e => handleAttachmentChange(post._id, e.target.files)}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {/* Attachment Previews */}
              {commentAttachments[post._id] && commentAttachments[post._id].length > 0 && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                  gap: "6px",
                  marginTop: "8px"
                }}>
                  {commentAttachments[post._id].map((item, idx) => (
                    <div key={idx} style={{
                      position: "relative",
                      backgroundColor: "#f0f2f5",
                      borderRadius: "8px",
                      overflow: "hidden"
                    }}>
                      {item.preview ? (
                        <img
                          src={item.preview}
                          alt="preview"
                          style={{
                            width: "100%",
                            height: "80px",
                            objectFit: "cover"
                          }}
                        />
                      ) : (
                        <div style={{
                          height: "80px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "6px"
                        }}>
                          <span style={{ fontSize: "20px", marginBottom: "4px" }}>📎</span>
                          <span style={{
                            fontSize: "9px",
                            color: "#65676b",
                            textAlign: "center",
                            wordBreak: "break-word",
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical"
                          }}>{item.name}</span>
                        </div>
                      )}
                      <button
                        onClick={() => removeAttachment(post._id, idx)}
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(0,0,0,0.6)",
                          color: "white",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                          transition: "background-color 0.2s"
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.8)"}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.6)"}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Send Button */}
              {((commentTexts[post._id] && commentTexts[post._id].trim()) ||
                (commentAttachments[post._id] && commentAttachments[post._id].length > 0)) && (
                  <button
                    onClick={() => handleSubmitComment(post._id)}
                    style={{
                      marginTop: "8px",
                      backgroundColor: "#1877f2",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 14px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "background-color 0.2s"
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = "#166fe5"}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = "#1877f2"}
                  >
                    Gửi
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for images */}
      {lightboxImage && (
        <div
          onClick={closeLightbox}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "white",
              fontSize: "24px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background-color 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
          >
            ×
          </button>

          {/* Previous button */}
          {imageAttachments.length > 1 && lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              style={{
                position: "absolute",
                left: "20px",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "none",
                color: "white",
                fontSize: "24px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
            >
              ‹
            </button>
          )}

          {/* Next button */}
          {imageAttachments.length > 1 && lightboxIndex < imageAttachments.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              style={{
                position: "absolute",
                right: "20px",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "none",
                color: "white",
                fontSize: "24px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
            >
              ›
            </button>
          )}

          {/* Image counter */}
          {imageAttachments.length > 1 && (
            <div style={{
              position: "absolute",
              top: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              color: "white",
              fontSize: "14px",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              padding: "6px 12px",
              borderRadius: "12px"
            }}>
              {lightboxIndex + 1} / {imageAttachments.length}
            </div>
          )}

          {/* Image */}
          <img
            src={lightboxImage}
            alt="lightbox"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              objectFit: "contain",
              borderRadius: "8px"
            }}
          />
        </div>
      )}

      {/* Likes Modal */}
      {showLikesModal && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowLikesModal(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(244, 244, 244, 0.8)",
              zIndex: 1050,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {/* Modal */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 12px 28px rgba(0,0,0,0.15)",
                width: "90%",
                maxWidth: "500px",
                maxHeight: "600px",
                display: "flex",
                flexDirection: "column"
              }}
            >
              {/* Header */}
              <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e4e6eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#050505" }}>
                  Người đã thích
                </h3>
                <button
                  onClick={() => setShowLikesModal(false)}
                  style={{
                    background: "#f0f2f5",
                    border: "none",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    color: "#65676b",
                    transition: "background-color 0.2s"
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = "#e4e6eb"}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = "#f0f2f5"}
                >
                  ✕
                </button>
              </div>

              {/* Likes List */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px 0"
              }}>
                {post.likes && post.likes.length > 0 ? (
                  post.likes.map((like, index) => (
                    <div
                      key={like._id || index}
                      style={{
                        padding: "8px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        cursor: "pointer",
                        transition: "background-color 0.2s"
                      }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = "#f2f3f5"}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <img
                        src={like.userId?.avatarUrl || "/default-avatar.png"}
                        alt="Avatar"
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          objectFit: "cover"
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: "600",
                          fontSize: "15px",
                          color: "#050505"
                        }}>
                          {like.userId?.displayName || like.userId?.username || "Người dùng"}
                        </div>
                        {like.userId?.faculty && (
                          <div style={{
                            fontSize: "13px",
                            color: "#65676b"
                          }}>
                            {like.userId.faculty}
                            {like.userId.class && ` - ${like.userId.class}`}
                          </div>
                        )}
                      </div>
                      <span style={{
                        background: "#1877f2",
                        color: "white",
                        borderRadius: "50%",
                        width: "24px",
                        height: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px"
                      }}>👍</span>
                    </div>
                  ))
                ) : (
                  <div style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "#65676b",
                    fontSize: "15px"
                  }}>
                    Chưa có ai thích bài viết này
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PostItem;
