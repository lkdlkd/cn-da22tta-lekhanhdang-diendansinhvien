import React, { useContext } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { deleteComment } from "@/Utils/api";
import { useOutletContext } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext";
import { Link } from "react-router-dom";
import '../assets/css/CommentItem.css';

const CommentItem = ({
  comment,
  postId,
  depth = 0,
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
  currentUserId,
  likedComments,
  handleLikeComment,
  onCommentDeleted,
  isSubmittingReply
}) => {
  // Ensure replyTexts and replyAttachments are always objects, even if null
  const safeReplyTexts = replyTexts ?? {};
  const safeReplyAttachments = replyAttachments ?? {};
  const safeReplyTo = replyTo ?? {};

  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showLikesModal, setShowLikesModal] = React.useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(comment.content || '');
  const [editAttachments, setEditAttachments] = React.useState([]);
  const [attachmentsToRemove, setAttachmentsToRemove] = React.useState([]);
  
  // State for reply pagination
  const INITIAL_REPLIES_COUNT = 3;
  const LOAD_MORE_COUNT = 5;
  const [visibleRepliesCount, setVisibleRepliesCount] = React.useState(INITIAL_REPLIES_COUNT);
  
  const { user } = useOutletContext();
  const { auth } = useContext(AuthContext);
  const token = auth.token;
  // Check if current user is comment author
  const isAuthor = currentUserId && comment.authorId &&
    (String(currentUserId) === String(comment.authorId._id || comment.authorId));

  // Check if current user liked this comment
  const isLiked = likedComments && likedComments.has(comment._id);

  // Handle edit comment
  const handleEditClick = () => {
    setIsEditing(true);
    setEditContent(comment.content || '');
    setEditAttachments([]);
    setAttachmentsToRemove([]);
    setShowOptionsMenu(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content || '');
    setEditAttachments([]);
    setAttachmentsToRemove([]);
  };

  const handleEditAttachmentChange = (files) => {
    const newAttachments = Array.from(files).map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      name: file.name
    }));
    setEditAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeEditAttachment = (index) => {
    setEditAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (attachmentId) => {
    setAttachmentsToRemove(prev => [...prev, attachmentId]);
  };

  const handleSubmitEdit = async () => {
    try {
      const { updateComment } = await import("../Utils/api");

      const formData = new FormData();
      formData.append('content', editContent);

      // Thêm attachments cần xóa
      attachmentsToRemove.forEach(id => {
        formData.append('removeAttachments[]', id);
      });

      // Thêm file mới
      editAttachments.forEach(item => {
        formData.append('attachments', item.file);
      });

      const response = await updateComment(token, comment._id, formData);

      if (response.success) {
        toast.success('Đã cập nhật bình luận');
        setIsEditing(false);
        setEditAttachments([]);
        setAttachmentsToRemove([]);
      } else {
        throw new Error('Không thể cập nhật bình luận');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Có lỗi xảy ra khi cập nhật bình luận');
    }
  };

  // Handle delete comment
  const handleDeleteComment = async () => {
    const result = await Swal.fire({
      title: 'Xóa bình luận?',
      text: "Bạn sẽ không thể hoàn tác hành động này!",
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

    if (result.isConfirmed) {
      try {
        const { deleteComment } = await import("../Utils/api");

        const response = await deleteComment(token, comment._id);

        if (!response.success) {
          throw new Error('Không thể xóa bình luận');
        }

        toast.success('Đã xóa bình luận');
        setShowOptionsMenu(false);

        // Notify parent to refresh
        if (onCommentDeleted) {
          onCommentDeleted(comment._id);
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
        toast.error('Có lỗi xảy ra khi xóa bình luận');
      }
    }
  };

  // Không giới hạn độ sâu, cho phép reply vô hạn
  const canShowReplies = true;
  const isReply = depth > 0;

  // Thụt vào 40px cho mỗi cấp reply, giống Facebook
  const getMarginLeft = () => {
    if (depth === 0) return "0";
    if (depth === 1) return "60px";
    if (depth === 2) return "45px";
    return "0"; // Cấp 4 trở đi không thụt thêm
  };

  // Kiểm tra xem comment có dài không (>10 dòng)
  const isLongComment = comment.content && comment.content.split('\n').length > 10;
  const hasMoreThan300Chars = comment.content && comment.content.length > 300;
  const shouldTruncate = (isLongComment || hasMoreThan300Chars) && !isExpanded;

  // Giới hạn số lượng replies hiển thị
  const hasReplies = comment.replies && comment.replies.length > 0;
  const totalReplies = hasReplies ? comment.replies.length : 0;
  const visibleReplies = comment.replies?.slice(0, visibleRepliesCount) || [];
  const remainingRepliesCount = totalReplies - visibleRepliesCount;

  return (
    <>
      <div className={`comment-item depth-${Math.min(depth, 3)}`}>
        <div className="comment-content-wrapper">
          <Link to={`/user/${comment.authorId?.username}`}>
            <img
              src={comment.authorId?.avatarUrl || "https://ui-avatars.com/api/?background=random&name=user"}
              alt="Avatar"
              className="comment-avatar"
            />
          </Link>
          <div className="comment-body">
            {/* Comment Bubble */}
            <div className="comment-bubble-wrapper">
              <div className={`comment-bubble ${isEditing ? 'editing' : ''}`}>
                <div className={`comment-author-name ${!comment.content ? 'empty' : ''}`}>
                  <Link to={`/user/${comment.authorId?.username}`}>
                    {comment.authorId?.displayName || comment.authorId?.username || "Ẩn danh"}
                  </Link>
                </div>

                {/* Edit Mode */}
                {isEditing ? (
                  <div className="comment-edit-container">
                    <div className="comment-edit-input-wrapper">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="comment-edit-textarea"
                        placeholder="Chỉnh sửa bình luận..."
                        rows={3}
                        onInput={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                      />

                      {/* Existing attachments */}
                      {comment.attachments && comment.attachments.length > 0 && (
                        <div className="comment-edit-attachments-existing">
                          {comment.attachments
                            .filter(att => !attachmentsToRemove.includes(att._id))
                            .map((att, idx) => (
                              <div key={idx} className="comment-edit-attachment-item">
                                {att.mime && att.mime.startsWith('image') ? (
                                  <img
                                    src={att.storageUrl}
                                    alt="attachment"
                                    className="comment-edit-attachment-preview"
                                  />
                                ) : (
                                  <div className="comment-edit-attachment-file">
                                    <i className="bi bi-file-earmark"></i>
                                    <span className="comment-edit-attachment-name">
                                      {att.filename}
                                    </span>
                                  </div>
                                )}
                                <button
                                  onClick={() => removeExistingAttachment(att._id)}
                                  className="comment-edit-attachment-remove"
                                  title="Xóa"
                                >×</button>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* New attachments preview */}
                      {editAttachments.length > 0 && (
                        <div className="comment-edit-attachments-new">
                          {editAttachments.map((item, idx) => (
                            <div key={idx} className="comment-edit-attachment-item">
                              {item.preview ? (
                                <img
                                  src={item.preview}
                                  alt="preview"
                                  className="comment-edit-attachment-preview"
                                />
                              ) : (
                                <div className="comment-edit-attachment-file">
                                  <i className="bi bi-file-earmark"></i>
                                  <span className="comment-edit-attachment-name">
                                    {item.name}
                                  </span>
                                </div>
                              )}
                              <button
                                onClick={() => removeEditAttachment(idx)}
                                className="comment-edit-attachment-remove"
                                title="Xóa"
                              >×</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Icon toolbar */}
                      <div className="comment-edit-toolbar">
                        <div className="comment-edit-icons">
                          <label className="comment-edit-icon-btn" title="Hình ảnh">
                            <i className="bi bi-image"></i>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => handleEditAttachmentChange(e.target.files)}
                              style={{ display: "none" }}
                            />
                          </label>
                          <label className="comment-edit-icon-btn" title="Đính kèm file">
                            <i className="bi bi-paperclip"></i>
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.zip,.rar"
                              onChange={(e) => handleEditAttachmentChange(e.target.files)}
                              style={{ display: "none" }}
                            />
                          </label>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="comment-edit-actions">
                          <button
                            onClick={handleCancelEdit}
                            className="comment-edit-cancel-btn"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={handleSubmitEdit}
                            className="comment-edit-save-btn"
                            disabled={!editContent.trim() && editAttachments.length === 0 && attachmentsToRemove.length === 0}
                          >
                            Lưu
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
              ) : (
                // Normal view mode
                comment.content && (
                  <div className="comment-text">
                    {comment.parentAuthorName && (
                      <span className="comment-parent-mention">
                        {comment.parentAuthorName}
                      </span>
                    )}
                    <span className={`comment-text-content ${shouldTruncate ? 'truncated' : ''}`}>
                      {comment.content}
                    </span>
                    {(isLongComment || hasMoreThan300Chars) && (
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="comment-expand-btn"
                      >
                        {isExpanded ? "Ẩn bớt" : "Xem thêm"}
                      </button>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Options Menu Button */}
            {(isAuthor || user) && (
              <div className="comment-options-wrapper">
                <button
                  onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                  className="comment-options-btn"
                >
                  ⋯
                </button>

                {showOptionsMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      onClick={() => setShowOptionsMenu(false)}
                      className="comment-options-backdrop"
                    />

                    {/* Dropdown Menu */}
                    <div className="comment-options-dropdown">
                      {isAuthor ? (
                        <>
                          <button
                            onClick={handleEditClick}
                            className="comment-option-item"
                          >
                            ✏️ Chỉnh sửa
                          </button>
                          <button
                            onClick={handleDeleteComment}
                            className="comment-option-item delete"
                          >
                            🗑️ Xóa bình luận
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={async () => {
                              setShowOptionsMenu(false);
                              const { value: reason } = await Swal.fire({
                                title: 'Báo cáo bình luận',
                                html: `
                                  <p class="text-start mb-3">Bạn muốn báo cáo bình luận này?</p>
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

                                  const result = await createReport(token, 'comment', comment._id, reasonText);

                                  if (result.success) {
                                    toast.success("Đã gửi báo cáo. Cảm ơn bạn đã giúp giữ cộng đồng an toàn!");
                                  } else {
                                    toast.error(result.error || "Không thể gửi báo cáo");
                                  }
                                } catch (error) {
                                  console.error("Error reporting comment:", error);
                                  toast.error("Có lỗi xảy ra khi gửi báo cáo");
                                }
                              }
                            }}
                            className="comment-option-item"
                          >
                            <span>⚠️</span>
                            <span>Báo cáo bình luận</span>
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Comment Attachments */}
          {comment.attachments && comment.attachments.length > 0 && (
            <div className={`comment-attachments-display ${comment.attachments.length === 1 ? 'single' : 'multiple'}`}>
              {comment.attachments.map((file, fidx) => (
                (file.mime && file.mime.startsWith("image")) ? (
                  <img
                    key={fidx}
                    src={file.storageUrl || file}
                    alt="attachment"
                    className="comment-attachment-image-display"
                    onClick={() => window.open(file.storageUrl || file, '_blank')}
                  />
                ) : (
                  <Link
                    key={fidx}
                    to={file.storageUrl || file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="comment-attachment-link"
                  >
                    <span className="comment-attachment-link-icon">📎</span>
                    <div className="comment-attachment-link-content">
                      <div className="comment-attachment-link-name">
                        {file.filename || "Tài liệu"}
                      </div>
                      {file.size && (
                        <div className="comment-attachment-link-size">
                          {formatFileSize(file.size)}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="comment-actions">
            <span className="comment-time">{formatTime(comment.createdAt)}</span>
            <button
              onClick={() => handleLikeComment && handleLikeComment(comment._id)}
              className={`comment-action-btn ${isLiked ? 'liked' : ''}`}
            >
              {isLiked ? "👍 " : ""}Thích
            </button>
            <button
              className="comment-action-btn"
              onClick={() => setReplyTo(prev => ({ ...(prev || {}), [comment._id]: !(prev && prev[comment._id]) }))}
            >
              Trả lời
            </button>
            {(comment.likes?.length > 0 || comment.likesCount > 0) && (
              <div
                onClick={() => setShowLikesModal(true)}
                className="comment-likes-counter"
              >
                <span className="comment-like-icon-badge">👍</span>
                <span className="comment-likes-count">
                  {comment.likes?.length || comment.likesCount || 0}
                </span>
              </div>
            )}
          </div>

          {/* Reply Input */}
          {safeReplyTo[comment._id] && (
            <div className="comment-reply-container">
              <div className="comment-reply-form">
                <img
                  src={user && user.avatarUrl ? user.avatarUrl : "https://ui-avatars.com/api/?background=random&name=user"}
                  alt="Your avatar"
                  className="comment-reply-avatar"
                />
                <div className="comment-reply-input-wrapper">
                  <div className="comment-reply-textarea-container">
                    <textarea
                      value={safeReplyTexts[comment._id] || ''}
                      onChange={e => handleReplyChange(comment._id, e.target.value)}
                      placeholder={`Trả lời ${comment.authorId?.displayName || comment.authorId?.username || ""}...`}
                      className="comment-reply-textarea"
                      rows={1}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (safeReplyTexts[comment._id] && safeReplyTexts[comment._id].trim()) {
                            handleSubmitReply(postId, comment._id);
                          }
                        }
                      }}
                    />
                  </div>

                  {/* Icon toolbar */}
                  <div className="comment-reply-icons">
                    <label className="comment-reply-icon-btn" title="Hình ảnh">
                      <i className="bi bi-image"></i>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={e => handleReplyAttachmentChange(comment._id, e.target.files)}
                        style={{ display: "none" }}
                      />
                    </label>
                    <label className="comment-reply-icon-btn" title="Đính kèm file">
                      <i className="bi bi-paperclip"></i>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.zip,.rar"
                        onChange={e => handleReplyAttachmentChange(comment._id, e.target.files)}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>

                  {/* Attachment Previews */}
                  {safeReplyAttachments[comment._id] && safeReplyAttachments[comment._id].length > 0 && (
                    <div className="comment-reply-previews">
                      {safeReplyAttachments[comment._id].map((file, fidx) => (
                        <div key={fidx} className="comment-reply-preview-item">
                          {file.preview ? (
                            <img
                              src={file.preview}
                              alt="preview"
                              className="comment-reply-preview-image"
                            />
                          ) : (
                            <div className="comment-reply-preview-file">
                              <span className="comment-reply-preview-file-icon">📎</span>
                              <span className="comment-reply-preview-file-name">{file.name}</span>
                            </div>
                          )}
                          <button
                            onClick={() => removeReplyAttachment(comment._id, fidx)}
                            className="comment-reply-preview-remove"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Send Button - Always visible on the right */}
                <button
                  onClick={() => handleSubmitReply(postId, comment._id)}
                  disabled={
                    (isSubmittingReply && isSubmittingReply[comment._id]) ||
                    ((!safeReplyTexts[comment._id] || !safeReplyTexts[comment._id].trim()) &&
                     (!safeReplyAttachments[comment._id] || safeReplyAttachments[comment._id].length === 0))
                  }
                  className="comment-reply-send-btn"
                  title="Gửi"
                >
                  {(isSubmittingReply && isSubmittingReply[comment._id]) ? (
                    <div className="comment-reply-spinner" />
                  ) : (
                    <i className="bi bi-send-fill"></i>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Render replies */}
      {hasReplies && (
        <div className="comment-replies-section">
          {visibleReplies.map((reply, idx) => (
            <div key={idx}>
              <CommentItem
                comment={reply}
                postId={postId}
                depth={depth + 1}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                replyTexts={safeReplyTexts}
                replyAttachments={safeReplyAttachments}
                handleReplyChange={handleReplyChange}
                handleReplyAttachmentChange={handleReplyAttachmentChange}
                removeReplyAttachment={removeReplyAttachment}
                handleSubmitReply={handleSubmitReply}
                formatTime={formatTime}
                formatFileSize={formatFileSize}
                currentUserId={currentUserId}
                likedComments={likedComments}
                handleLikeComment={handleLikeComment}
                onCommentDeleted={onCommentDeleted}
                isSubmittingReply={isSubmittingReply}
              />
            </div>
          ))}

          {/* Show More/Less Replies Buttons */}
          {totalReplies > INITIAL_REPLIES_COUNT && (
            <div className="comment-show-more-replies">
              {visibleRepliesCount < totalReplies ? (
                <button
                  onClick={() => setVisibleRepliesCount(prev => Math.min(prev + LOAD_MORE_COUNT, totalReplies))}
                  className="comment-show-more-btn"
                >
                  <span>↩️</span>
                  Xem thêm {Math.min(LOAD_MORE_COUNT, remainingRepliesCount)} câu trả lời
                </button>
              ) : (
                <button
                  onClick={() => setVisibleRepliesCount(INITIAL_REPLIES_COUNT)}
                  className="comment-show-less-btn"
                >
                  Ẩn bớt câu trả lời
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Likes Modal for Comment */}
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
                {comment.likes && comment.likes.length > 0 ? (
                  comment.likes.map((like, index) => (
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
                      <Link to={`/user/${like.userId?.username}`}>
                        <img
                          src={like.userId?.avatarUrl || "https://ui-avatars.com/api/?background=random&name=user"}
                          alt="Avatar"
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            objectFit: "cover"
                          }}
                        />
                      </Link>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: "600",
                          fontSize: "15px",
                          color: "#050505"
                        }}>
                          <Link to={`/user/${like.userId?.username}`}>
                            {like.userId?.displayName || like.userId?.username || "Người dùng"}
                          </Link>
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
                    Chưa có ai thích bình luận này
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

export default CommentItem;