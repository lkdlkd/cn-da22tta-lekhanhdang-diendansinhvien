import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext";
import CommentItem from "./CommentItem";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import '../assets/css/PostItemStyles.css';

const PostItem = ({
  post,
  user,
  currentUserId,
  isLiked,
  isCommentsExpanded,
  commentTexts,
  commentAttachments,
  handleCommentChange,
  handleAttachmentChange,
  removeAttachment,
  handleSubmitComment,
  replyTo,
  setReplyTo,
  replyTexts,
  replyAttachments,
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
  toggleComments,
  onPostClick,
  isSubmittingComment,
  isSubmittingReply
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
  
  // State for comment pagination
  const INITIAL_COMMENTS_COUNT = 5;
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(INITIAL_COMMENTS_COUNT);
  
  const { auth } = useContext(AuthContext);
  const token = auth.token;

  // Reset visible comments when comment section is opened or closed
  React.useEffect(() => {
    if (isCommentsExpanded) {
      setVisibleCommentsCount(INITIAL_COMMENTS_COUNT);
    }
  }, [isCommentsExpanded]);

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
    if (!token) {
      toast.info("Vui lòng đăng nhập để thích bình luận");
      return;
    }

    try {
      const { likeComment, unlikeComment } = await import("../Utils/api");
      const isLiked = likedComments.has(commentId);

      if (isLiked) {
        const result = await unlikeComment(token, commentId);
        if (!result.success) {
          throw new Error(result.error || "Lỗi khi bỏ thích bình luận");
        }
        setLikedComments(prev => {
          const newSet = new Set(prev);
          newSet.delete(commentId);
          return newSet;
        });
      } else {
        const result = await likeComment(token, commentId);
        if (!result.success) {
          throw new Error(result.error || "Lỗi khi thích bình luận");
        }
        setLikedComments(prev => new Set(prev).add(commentId));
      }
    } catch (error) {
      toast.error(error.message || "Không thể thực hiện");
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
    <>
      <div className="post-item-card">
        {/* Header */}
        <div className="post-item-header">
          <div className="post-item-header-content">
            <Link to={`/user/${post.authorId?.username}`} className="post-item-avatar-link">
              <img
                src={post.authorId?.avatarUrl || "https://ui-avatars.com/api/?background=random&name=user"}
                alt="Avatar"
                className="post-item-avatar"
              />
            </Link>
            <div className="post-item-user-info">
              <div className="post-item-user-name-wrapper">
                <Link
                  to={`/user/${post.authorId?.username}`}
                  className="post-item-user-name"
                >
                  {post.authorId?.displayName || post.authorId?.username || "Ẩn danh"}
                </Link>
                {post.pinned && (
                  <span className="post-item-badge post-item-badge-pinned">
                    <i className="bi bi-pin-angle-fill me-1"></i>Ghim
                  </span>
                )}
                {post.locked && (
                  <span className="post-item-badge post-item-badge-locked">
                    <i className="bi bi-lock-fill me-1"></i>Đã khóa
                  </span>
                )}
              </div>
              <div className="post-item-meta">
                <span
                  onClick={() => navigate(`/post/${post.slug}`, { state: { post } })}
                  className="post-item-time"
                >
                  {formatTime(post.createdAt)}
                </span> · <span className="post-item-category">{post.categoryId?.title || "Chung"}</span>
              </div>
            </div>

            {/* Options Menu Button */}
            <div className="post-item-options-wrapper">
              <button
                onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                className="post-item-options-btn"
              >
                ⋯
              </button>

              {/* Dropdown Menu */}
              {showOptionsMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    onClick={() => setShowOptionsMenu(false)}
                    className="post-item-options-backdrop"
                  />

                  {/* Menu */}
                  <div className="post-item-options-menu">
                    {isAuthor && (
                      <>
                        <button
                          onClick={() => {
                            setShowOptionsMenu(false);
                            handleEditPost(post._id);
                          }}
                          className="post-item-options-menu-item"
                        >
                          <i className="bi bi-pencil post-item-options-menu-item-icon"></i>
                          <span>Chỉnh sửa bài viết</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowOptionsMenu(false);
                            handleDeletePost(post._id);
                          }}
                          className="post-item-options-menu-item danger"
                        >
                          <i className="bi bi-trash post-item-options-menu-item-icon"></i>
                          <span>Xóa bài viết</span>
                        </button>

                        <div className="post-item-options-divider" />
                      </>
                    )}

                    <button
                      onClick={() => {
                        setShowOptionsMenu(false);
                        navigator.clipboard.writeText(window.location.origin + `/post/${post.slug}`);
                        toast.info("Đã sao chép link bài viết!");
                      }}
                      className="post-item-options-menu-item"
                    >
                      <i className="bi bi-link-45deg post-item-options-menu-item-icon"></i>
                      <span>Sao chép liên kết</span>
                    </button>

                    {!isAuthor && (
                      <button
                        className="post-item-options-menu-item"
                        onClick={async () => {
                          setShowOptionsMenu(false);

                          // Hiển thị dialog chọn lý do báo cáo
                          const { value: reason } = await Swal.fire({
                            title: 'Báo cáo bài viết',
                            html: `
                            <p class="text-start mb-3">Bạn muốn báo cáo bài viết <strong>"${post.title}"</strong>?</p>
                            <div class="text-start" style="max-height: 300px; overflow-y: auto; padding: 10px; border: 1px solid #e4e6eb; border-radius: 8px; background-color: #f8f9fa;">
                              <div style="margin-bottom: 10px;">
                                <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 6px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#e4e6eb'" onmouseout="this.style.backgroundColor='transparent'">
                                  <input type="radio" name="report-reason" value="Spam hoặc quảng cáo" style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                                  <span style="font-size: 14px; color: #050505;">Spam hoặc quảng cáo</span>
                                </label>
                              </div>
                              <div style="margin-bottom: 10px;">
                                <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 6px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#e4e6eb'" onmouseout="this.style.backgroundColor='transparent'">
                                  <input type="radio" name="report-reason" value="Quấy rối hoặc bắt nạt" style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                                  <span style="font-size: 14px; color: #050505;">Quấy rối hoặc bắt nạt</span>
                                </label>
                              </div>
                              <div style="margin-bottom: 10px;">
                                <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 6px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#e4e6eb'" onmouseout="this.style.backgroundColor='transparent'">
                                  <input type="radio" name="report-reason" value="Ngôn từ thù ghét" style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                                  <span style="font-size: 14px; color: #050505;">Ngôn từ thù ghét</span>
                                </label>
                              </div>
                              <div style="margin-bottom: 10px;">
                                <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 6px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#e4e6eb'" onmouseout="this.style.backgroundColor='transparent'">
                                  <input type="radio" name="report-reason" value="Nội dung không phù hợp" style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                                  <span style="font-size: 14px; color: #050505;">Nội dung không phù hợp</span>
                                </label>
                              </div>
                              <div style="margin-bottom: 10px;">
                                <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 6px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#e4e6eb'" onmouseout="this.style.backgroundColor='transparent'">
                                  <input type="radio" name="report-reason" value="Thông tin sai sự thật" style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                                  <span style="font-size: 14px; color: #050505;">Thông tin sai sự thật</span>
                                </label>
                              </div>
                              <div style="margin-bottom: 10px;">
                                <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 6px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#e4e6eb'" onmouseout="this.style.backgroundColor='transparent'">
                                  <input type="radio" name="report-reason" value="Bạo lực hoặc nguy hiểm" style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                                  <span style="font-size: 14px; color: #050505;">Bạo lực hoặc nguy hiểm</span>
                                </label>
                              </div>
                              <div style="margin-bottom: 10px;">
                                <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 6px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#e4e6eb'" onmouseout="this.style.backgroundColor='transparent'">
                                  <input type="radio" name="report-reason" value="Vi phạm bản quyền" style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                                  <span style="font-size: 14px; color: #050505;">Vi phạm bản quyền</span>
                                </label>
                              </div>
                              <div style="margin-bottom: 10px;">
                                <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 6px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#e4e6eb'" onmouseout="this.style.backgroundColor='transparent'">
                                  <input type="radio" name="report-reason" value="Lý do khác" style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                                  <span style="font-size: 14px; color: #050505;">Lý do khác</span>
                                </label>
                              </div>
                            </div>
                            <textarea id="report-detail" class="form-control mt-3" rows="3" placeholder="Mô tả chi tiết (không bắt buộc)" style="font-size: 14px;"></textarea>
                          `,
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#dc3545',
                            cancelButtonColor: '#6c757d',
                            confirmButtonText: 'Gửi báo cáo',
                            cancelButtonText: 'Hủy',
                            width: '600px',
                            customClass: {
                              container: 'swal-report-container'
                            },
                            preConfirm: () => {
                              const selectedReason = document.querySelector('input[name="report-reason"]:checked');
                              const detail = document.getElementById('report-detail').value;

                              if (!selectedReason) {
                                Swal.showValidationMessage('Vui lòng chọn lý do báo cáo');
                                return false;
                              }

                              return { reason: selectedReason.value, detail };
                            }
                          });

                          if (reason) {
                            try {
                              const { createReport } = await import("../Utils/api");

                              if (!token) {
                                toast.error("Vui lòng đăng nhập để báo cáo");
                                return;
                              }

                              const reasonText = reason.detail
                                ? `${reason.reason}: ${reason.detail}`
                                : reason.reason;

                              const result = await createReport(token, 'post', post._id, reasonText);

                              if (result.success) {
                                toast.success("Đã gửi báo cáo. Cảm ơn bạn đã giúp giữ cộng đồng an toàn!");
                              } else {
                                toast.error(result.error || "Không thể gửi báo cáo");
                              }
                            } catch (error) {
                              console.error("Error reporting post:", error);
                              toast.error("Có lỗi xảy ra khi gửi báo cáo");
                            }
                          }
                        }}
                      >
                        <i className="bi bi-exclamation-triangle post-item-options-menu-item-icon"></i>
                        <span>Báo cáo bài viết</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Moderation Status Badge */}
        {post.moderationStatus && post.moderationStatus !== 'approved' && post.authorId._id === currentUserId && (
          <div className={`post-item-moderation ${post.moderationStatus === 'pending' ? 'pending' : 'rejected'}`}>
            <i className={`bi ${post.moderationStatus === 'pending' ? 'bi-hourglass-split' : 'bi-x-circle'} post-item-moderation-icon`}></i>
            <div className="post-item-moderation-content">
              <div className="post-item-moderation-title">
                {post.moderationStatus === 'pending'
                  ? 'Bài viết đang chờ duyệt'
                  : 'Bài viết đã bị từ chối'}
              </div>
              <div className="post-item-moderation-text">
                {post.moderationStatus === 'pending'
                  ? 'Bài viết của bạn đang được kiểm duyệt bởi quản trị viên. Vui lòng chờ.'
                  : `Lý do: ${post.rejectionReason || 'Không có lý do cụ thể'}`}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="post-item-content">
          <h3 className="post-item-title">
            <span
              onClick={() => onPostClick ? onPostClick(post) : navigate(`/post/${post.slug}`, { state: { post } })}
              className="post-item-title-link"
            >
              {post.title}
            </span>
          </h3>
          <div className="post-item-text">
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
              className="post-item-expand-btn"
            >
              {isExpanded ? "Ẩn bớt" : "Xem thêm"}
            </button>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="post-item-tags">
              {post.tags.map((tag, idx) => (
                <span key={idx} className="post-item-tag">#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Attachments */}
        {post.attachments && post.attachments.length > 0 && (
          <>
            {/* Image attachments */}
            {imageAttachments.length > 0 && (
              <div className={`post-item-images ${imageAttachments.length === 1 ? 'single' : 'multiple'}`}>
                {imageAttachments.map((file, idx) => (
                  <img
                    key={idx}
                    src={file.storageUrl || file}
                    alt="attachment"
                    onClick={() => openLightbox(file.storageUrl || file, idx)}
                    className={`post-item-image ${imageAttachments.length === 1 ? 'single' : 'multiple'}`}
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
                className="post-item-file"
              >
                <div className="post-item-file-icon">
                  �
                </div>
                <div className="post-item-file-info">
                  <div className="post-item-file-name">
                    {file.filename || "Tài liệu"}
                  </div>
                  <div className="post-item-file-size">
                    {formatFileSize(file.size || 0)}
                  </div>
                </div>
                <div className="post-item-file-download">
                  Tải xuống
                </div>
              </Link>
            ))}
          </>
        )}

        {/* Stats */}
        <div className="post-item-stats">
          <div className="post-item-stats-likes">
            {(post.likesCount > 0 || isLiked) && (
              <>
                <span className="post-item-like-icon">👍</span>
                <span
                  onClick={() => setShowLikesModal(true)}
                  className="post-item-like-count"
                >
                  {post.likesCount || post.likes?.length || 0}
                </span>
              </>
            )}
          </div>
          <div className="post-item-stats-right">
            <span>
              {post.commentsCount || 0} bình luận
            </span>
            <span>
              {post.views || 0} lượt xem
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="post-item-actions">
          <button
            onClick={() => handleLike(post._id)}
            className={`post-item-action-btn ${isLiked ? 'active' : ''}`}
          >
            <i className={`bi ${isLiked ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'} post-item-action-icon`}></i>
            <span>Thích</span>
          </button>
          <button
            onClick={() => toggleComments(post._id)}
            className={`post-item-action-btn ${isCommentsExpanded ? 'active' : ''}`}
          >
            <i className="bi bi-chat me-2"></i>Bình luận
          </button>
          <button
            className="post-item-action-btn"
            onClick={() => {
              setShowOptionsMenu(false);
              navigator.clipboard.writeText(window.location.origin + `/post/${post.slug}`);
              toast.info("Chia sẻ bài viết thành công!");
            }}
          >
            <i className="bi bi-share me-2"></i>Chia sẻ
          </button>
        </div>

        {/* Comments Section */}
        {isCommentsExpanded && (
          <div className="post-item-comments">
            {/* Existing Comments */}
            {hasComments ? (
              <div className="post-item-comments-list">
                {organizedComments.slice(0, visibleCommentsCount).map(cmt => (
                  <CommentItem
                    key={cmt._id}
                    comment={cmt}
                    postId={post._id}
                    isReply={false}
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
                    currentUserId={currentUserId}
                    likedComments={likedComments}
                    handleLikeComment={handleLikeComment}
                    isSubmittingReply={isSubmittingReply}
                  />
                ))}
                
                {/* Show More/Less Comments Buttons */}
                {organizedComments.length > INITIAL_COMMENTS_COUNT && (
                  <div className="post-item-show-more-comments">
                    {visibleCommentsCount < organizedComments.length ? (
                      <button
                        onClick={() => setVisibleCommentsCount(prev => Math.min(prev + 5, organizedComments.length))}
                        className="post-item-show-more-comments-btn"
                      >
                        <i className="bi bi-chevron-down me-2"></i>
                        Xem thêm {Math.min(5, organizedComments.length - visibleCommentsCount)} bình luận
                      </button>
                    ) : (
                      <button
                        onClick={() => setVisibleCommentsCount(INITIAL_COMMENTS_COUNT)}
                        className="post-item-show-less-comments-btn"
                      >
                        <i className="bi bi-chevron-up me-2"></i>
                        Ẩn bớt bình luận
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="post-item-comments-empty">
                <i className="bi bi-chat post-item-comments-empty-icon"></i>
                <div className="post-item-comments-empty-title">Chưa có bình luận nào</div>
                <div className="post-item-comments-empty-subtitle">Hãy là người đầu tiên bình luận!</div>
              </div>
            )}
            {/* Comment Input - Simple Style */}
            <div className="post-item-comment-input-wrapper">
              <img
                src={user?.avatarUrl || "https://ui-avatars.com/api/?background=random&name=user"}
                alt="Your avatar"
                className="post-item-comment-avatar"
              />
              <div className="post-item-comment-input-container">
                <div className="post-item-comment-textarea-wrapper">
                  <textarea
                    value={commentTexts[post._id] || ''}
                    onChange={e => handleCommentChange(post._id, e.target.value)}
                    placeholder={`Bình luận dưới tên ${user?.displayName || user?.username || 'bạn'}...`}
                    className="post-item-comment-textarea"
                    rows={1}
                    onInput={e => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if ((commentTexts[post._id] && commentTexts[post._id].trim()) || 
                            (commentAttachments[post._id] && commentAttachments[post._id].length > 0)) {
                          handleSubmitComment(post._id);
                        }
                      }
                    }}
                  />
                </div>

                {/* Icon toolbar */}
                <div className="post-item-comment-icons">
                  <label className="post-item-comment-icon-btn" title="Hình ảnh">
                    <i className="bi bi-image"></i>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={e => handleAttachmentChange(post._id, e.target.files)}
                      style={{ display: "none" }}
                    />
                  </label>
                  <label className="post-item-comment-icon-btn" title="Đính kèm file">
                    <i className="bi bi-paperclip"></i>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.zip,.rar"
                      onChange={e => handleAttachmentChange(post._id, e.target.files)}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                {/* Attachment Previews */}
                {commentAttachments[post._id] && commentAttachments[post._id].length > 0 && (
                  <div className="post-item-comment-previews">
                    {commentAttachments[post._id].map((item, idx) => (
                      <div key={idx} className="post-item-comment-preview">
                        {item.preview ? (
                          <img
                            src={item.preview}
                            alt="preview"
                            className="post-item-comment-preview-image"
                          />
                        ) : (
                          <div className="post-item-comment-preview-file">
                            <i className="bi bi-paperclip post-item-comment-preview-file-icon"></i>
                            <span className="post-item-comment-preview-file-name">{item.name}</span>
                          </div>
                        )}
                        <button
                          onClick={() => removeAttachment(post._id, idx)}
                          className="post-item-comment-preview-remove"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Send Button - Always visible on the right */}
              <button
                onClick={() => handleSubmitComment(post._id)}
                disabled={
                  isSubmittingComment || 
                  ((!commentTexts[post._id] || !commentTexts[post._id].trim()) && 
                   (!commentAttachments[post._id] || commentAttachments[post._id].length === 0))
                }
                className="post-item-comment-send-btn"
                title="Gửi"
              >
                {isSubmittingComment ? (
                  <div className="post-item-comment-spinner" />
                ) : (
                  <i className="bi bi-send-fill"></i>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Lightbox for images */}
        {lightboxImage && (
          <div
            onClick={closeLightbox}
            className="post-item-lightbox"
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="post-item-lightbox-close"
            >
              ×
            </button>

            {/* Previous button */}
            {imageAttachments.length > 1 && lightboxIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="post-item-lightbox-nav post-item-lightbox-prev"
              >
                ‹
              </button>
            )}

            {/* Next button */}
            {imageAttachments.length > 1 && lightboxIndex < imageAttachments.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="post-item-lightbox-nav post-item-lightbox-next"
              >
                ›
              </button>
            )}

            {/* Image counter */}
            {imageAttachments.length > 1 && (
              <div className="post-item-lightbox-counter">
                {lightboxIndex + 1} / {imageAttachments.length}
              </div>
            )}

            {/* Image */}
            <img
              src={lightboxImage}
              alt="lightbox"
              onClick={(e) => e.stopPropagation()}
              className="post-item-lightbox-image"
            />
          </div>
        )}

        {/* Likes Modal */}
        {showLikesModal && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setShowLikesModal(false)}
              className="post-item-likes-modal-backdrop"
            >
              {/* Modal */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="post-item-likes-modal"
              >
                {/* Header */}
                <div className="post-item-likes-modal-header">
                  <h3 className="post-item-likes-modal-title">
                    Người đã thích
                  </h3>
                  <button
                    onClick={() => setShowLikesModal(false)}
                    className="post-item-likes-modal-close"
                  >
                    ✕
                  </button>
                </div>

                {/* Likes List */}
                <div className="post-item-likes-modal-list">
                  {post.likes && post.likes.length > 0 ? (
                    post.likes.map((like, index) => (
                      <Link to={`/user/${like.userId?.username}`} key={like._id || index} className="post-item-likes-modal-item">
                        <img
                          src={like.userId?.avatarUrl || "https://ui-avatars.com/api/?background=random&name=user"}
                          alt="Avatar"
                          className="post-item-likes-modal-avatar"
                        />
                        <div className="post-item-likes-modal-user-info">
                          <div className="post-item-likes-modal-user-name">
                            {like.userId?.displayName || like.userId?.username || "Người dùng"}
                          </div>
                          {like.userId?.faculty && (
                            <div className="post-item-likes-modal-user-meta">
                              {like.userId.faculty}
                              {like.userId.class && ` - ${like.userId.class}`}
                            </div>
                          )}
                        </div>
                        <span className="post-item-likes-modal-icon">👍</span>
                      </Link>
                    ))
                  ) : (
                    <div className="post-item-likes-modal-empty">
                      Chưa có ai thích bài viết này
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default PostItem;
