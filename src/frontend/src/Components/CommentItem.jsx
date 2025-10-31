import React from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { deleteComment } from "@/Utils/api";
import { Link } from "react-router-dom";
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
  onCommentDeleted
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showAllReplies, setShowAllReplies] = React.useState(false);
  const [showLikesModal, setShowLikesModal] = React.useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(comment.content || '');
  const [editAttachments, setEditAttachments] = React.useState([]);
  const [attachmentsToRemove, setAttachmentsToRemove] = React.useState([]);
  
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
      const token = localStorage.getItem('token');
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
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
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
  const INITIAL_REPLIES_COUNT = 3;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const totalReplies = hasReplies ? comment.replies.length : 0;
  const visibleReplies = showAllReplies 
    ? comment.replies 
    : comment.replies?.slice(0, INITIAL_REPLIES_COUNT) || [];
  const hiddenRepliesCount = totalReplies - INITIAL_REPLIES_COUNT;
  
  return (
  <div style={{
    marginBottom: "8px",
    marginLeft: getMarginLeft(),
    position: "relative"
  }}>
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
      <img
        src={comment.authorId?.avatarUrl || "/default-avatar.png"}
        alt="Avatar"
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0
        }}
      />
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        {/* Comment Bubble */}
        <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
          <div style={{
            backgroundColor: "#f0f2f5",
            borderRadius: "18px",
            padding: "10px 14px",
            display: "inline-block",
            maxWidth: "100%",
            transition: "background-color 0.2s ease",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
          }}>
            <div style={{
              fontWeight: "600",
              fontSize: "13px",
              color: "#050505",
              marginBottom: comment.content ? "4px" : "0"
            }}>
              {comment.authorId?.displayName || comment.authorId?.username || "Ẩn danh"}
            </div>
          
          {/* Edit Mode */}
          {isEditing ? (
            <div style={{ padding: "8px 0" }}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "8px",
                  fontSize: "15px",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  resize: "vertical",
                  fontFamily: "inherit",
                  outline: "none"
                }}
                onFocus={(e) => e.target.style.borderColor = "#1877f2"}
                onBlur={(e) => e.target.style.borderColor = "#ccc"}
              />
              
              {/* Existing attachments */}
              {comment.attachments && comment.attachments.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#65676b" }}>
                    File đính kèm hiện tại:
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {comment.attachments
                      .filter(att => !attachmentsToRemove.includes(att._id))
                      .map((att, idx) => (
                        <div key={idx} style={{
                          position: "relative",
                          backgroundColor: "#f0f2f5",
                          borderRadius: "8px",
                          padding: "4px",
                          maxWidth: "100px"
                        }}>
                          {att.mime && att.mime.startsWith('image') ? (
                            <img
                              src={att.storageUrl}
                              alt="attachment"
                              style={{
                                width: "90px",
                                height: "90px",
                                objectFit: "cover",
                                borderRadius: "6px"
                              }}
                            />
                          ) : (
                            <div style={{
                              width: "90px",
                              height: "90px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              <span style={{ fontSize: "24px" }}>📎</span>
                              <span style={{
                                fontSize: "10px",
                                color: "#65676b",
                                textAlign: "center",
                                marginTop: "4px"
                              }}>
                                {att.filename}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => removeExistingAttachment(att._id)}
                            style={{
                              position: "absolute",
                              top: "2px",
                              right: "2px",
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              backgroundColor: "rgba(0,0,0,0.7)",
                              color: "white",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >×</button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
              {/* New attachments preview */}
              {editAttachments.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#65676b" }}>
                    File mới:
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {editAttachments.map((item, idx) => (
                      <div key={idx} style={{
                        position: "relative",
                        backgroundColor: "#f0f2f5",
                        borderRadius: "8px",
                        padding: "4px",
                        maxWidth: "100px"
                      }}>
                        {item.preview ? (
                          <img
                            src={item.preview}
                            alt="preview"
                            style={{
                              width: "90px",
                              height: "90px",
                              objectFit: "cover",
                              borderRadius: "6px"
                            }}
                          />
                        ) : (
                          <div style={{
                            width: "90px",
                            height: "90px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center"
                          }}>
                            <span style={{ fontSize: "24px" }}>📎</span>
                            <span style={{
                              fontSize: "10px",
                              color: "#65676b",
                              textAlign: "center",
                              marginTop: "4px"
                            }}>
                              {item.name}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => removeEditAttachment(idx)}
                          style={{
                            position: "absolute",
                            top: "2px",
                            right: "2px",
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(0,0,0,0.7)",
                            color: "white",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Add attachment button */}
              <label style={{
                display: "inline-block",
                marginTop: "8px",
                padding: "6px 12px",
                backgroundColor: "#f0f2f5",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "500",
                color: "#65676b",
                transition: "background-color 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e4e6eb"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f0f2f5"}
              >
                📎 Thêm file
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip,.rar"
                  onChange={(e) => handleEditAttachmentChange(e.target.files)}
                  style={{ display: "none" }}
                />
              </label>
              
              {/* Action buttons */}
              <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                <button
                  onClick={handleSubmitEdit}
                  style={{
                    padding: "6px 16px",
                    backgroundColor: "#1877f2",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#166fe5"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#1877f2"}
                >
                  Lưu
                </button>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    padding: "6px 16px",
                    backgroundColor: "#e4e6eb",
                    color: "#050505",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#d8dadf"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#e4e6eb"}
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            // Normal view mode
            comment.content && (
            <div style={{
              fontSize: "15px",
              color: "#050505",
              lineHeight: "1.4",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              position: "relative"
            }}>
              {comment.parentAuthorName && (
                <span style={{
                  fontWeight: 600,
                  color: "#385898",
                  marginRight: "4px",
                  cursor: "pointer"
                }}>
                  {comment.parentAuthorName}
                </span>
              )}
              <span style={{
                display: shouldTruncate ? "-webkit-box" : "block",
                WebkitLineClamp: shouldTruncate ? "10" : "unset",
                WebkitBoxOrient: shouldTruncate ? "vertical" : "unset",
                overflow: shouldTruncate ? "hidden" : "visible"
              }}>
                {comment.content}
              </span>
              {(isLongComment || hasMoreThan300Chars) && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#65676b",
                    cursor: "pointer",
                    padding: "4px 0 0 0",
                    fontWeight: "600",
                    fontSize: "13px",
                    display: "block",
                    marginTop: "4px",
                    transition: "color 0.2s ease"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.textDecoration = "underline";
                    e.currentTarget.style.color = "#1877f2";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.textDecoration = "none";
                    e.currentTarget.style.color = "#65676b";
                  }}
                >
                  {isExpanded ? "Ẩn bớt" : "Xem thêm"}
                </button>
              )}
            </div>
            )
          )}
        </div>
        
        {/* Options Menu Button - Only show for author */}
        {isAuthor && (
          <div style={{ 
            position: "absolute", 
            top: "8px", 
            right: "-24px",
            zIndex: 10
          }}>
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "50%",
                color: "#65676b",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f0f2f5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              •••
            </button>
            
            {showOptionsMenu && (
              <>
                {/* Backdrop */}
                <div
                  onClick={() => setShowOptionsMenu(false)}
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 998
                  }}
                />
                
                {/* Dropdown Menu */}
                <div style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "4px",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  minWidth: "150px",
                  zIndex: 999,
                  overflow: "hidden"
                }}>
                  <button
                    onClick={handleEditClick}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: "14px",
                      color: "#050505",
                      fontWeight: "500",
                      transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f0f2f5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    ✏️ Chỉnh sửa
                  </button>
                  <button
                    onClick={handleDeleteComment}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: "14px",
                      color: "#d33",
                      fontWeight: "500",
                      transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f0f2f5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    🗑️ Xóa bình luận
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

        {/* Comment Attachments */}
        {comment.attachments && comment.attachments.length > 0 && (
          <div style={{
            marginTop: "4px",
            display: "grid",
            gridTemplateColumns: comment.attachments.length === 1 ? "1fr" : "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "4px",
            marginLeft: "12px",
            maxWidth: "360px"
          }}>
            {comment.attachments.map((file, fidx) => (
              (file.mime && file.mime.startsWith("image")) ? (
                <img
                  key={fidx}
                  src={file.storageUrl || file}
                  alt="attachment"
                  style={{
                    width: "100%",
                    maxHeight: "200px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                  onClick={() => window.open(file.storageUrl || file, '_blank')}
                />
              ) : (
                <Link
                  key={fidx}
                  to={file.storageUrl || file}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    backgroundColor: "#f0f2f5",
                    border: "1px solid #dddfe2",
                    borderRadius: "8px",
                    textDecoration: "none",
                    gap: "6px"
                  }}
                >
                  <span style={{ fontSize: "18px" }}>📎</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: "#385898",
                      fontSize: "12px",
                      fontWeight: "500",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {file.filename || "Tài liệu"}
                    </div>
                    {file.size && (
                      <div style={{ color: "#65676b", fontSize: "10px" }}>
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
        <div style={{
          fontSize: "12px",
          color: "#65676b",
          marginTop: "6px",
          marginLeft: "12px",
          display: "flex",
          gap: "14px",
          alignItems: "center"
        }}>
          <span style={{ fontWeight: "400", color: "#8a8d91" }}>{formatTime(comment.createdAt)}</span>
          <button
            onClick={() => handleLikeComment && handleLikeComment(comment._id)}
            style={{
              background: "none",
              border: "none",
              color: isLiked ? "#1877f2" : "#65676b",
              cursor: "pointer",
              padding: 0,
              fontWeight: "600",
              fontSize: "12px",
              transition: "color 0.2s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.textDecoration = "underline";
              if (!isLiked) e.currentTarget.style.color = "#1877f2";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.textDecoration = "none";
              if (!isLiked) e.currentTarget.style.color = "#65676b";
            }}
          >
            {isLiked ? "👍 " : ""}Thích
          </button>
          <button
            style={{
              background: "none",
              border: "none",
              color: "#65676b",
              cursor: "pointer",
              padding: 0,
              fontWeight: "600",
              fontSize: "12px",
              transition: "color 0.2s ease"
            }}
            onClick={() => setReplyTo(prev => ({ ...prev, [comment._id]: !prev[comment._id] }))}
            onMouseOver={(e) => {
              e.currentTarget.style.textDecoration = "underline";
              e.currentTarget.style.color = "#1877f2";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.textDecoration = "none";
              e.currentTarget.style.color = "#65676b";
            }}
          >
            Trả lời
          </button>
          {(comment.likes?.length > 0 || comment.likesCount > 0) && (
            <div 
              onClick={() => setShowLikesModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                marginLeft: "auto",
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: "10px",
                transition: "background-color 0.2s ease"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#f0f2f5";
                const span = e.currentTarget.querySelector('span:last-child');
                if (span) span.style.textDecoration = "underline";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                const span = e.currentTarget.querySelector('span:last-child');
                if (span) span.style.textDecoration = "none";
              }}
            >
              <span style={{
                background: "linear-gradient(135deg, #1877f2 0%, #0c63d4 100%)",
                color: "white",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)"
              }}>👍</span>
              <span style={{ fontSize: "12px", color: "#65676b", fontWeight: "500" }}>
                {comment.likes?.length || comment.likesCount || 0}
              </span>
            </div>
          )}
        </div>

        {/* Reply Input */}
        {replyTo[comment._id] && (
          <div style={{
            marginTop: "8px"
          }}>
            <div style={{
              display: "flex",
              gap: "8px",
              alignItems: "flex-start"
            }}>
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
                    value={replyTexts[comment._id] || ''}
                    onChange={e => handleReplyChange(comment._id, e.target.value)}
                    placeholder={`Trả lời ${comment.authorId?.displayName || comment.authorId?.username || ""}...`}
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
                      fontFamily: "inherit"
                    }}
                    rows={1}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                  />
                  <label style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    cursor: "pointer",
                    fontSize: "18px",
                    color: "#65676b"
                  }}>
                    📎
                    <input
                      type="file"
                      multiple
                      onChange={e => handleReplyAttachmentChange(comment._id, e.target.files)}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                {/* Attachment Previews */}
                {replyAttachments[comment._id] && replyAttachments[comment._id].length > 0 && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                    gap: "6px",
                    marginTop: "8px"
                  }}>
                    {replyAttachments[comment._id].map((file, fidx) => (
                      <div key={fidx} style={{
                        position: "relative",
                        backgroundColor: "#f0f2f5",
                        borderRadius: "8px",
                        overflow: "hidden"
                      }}>
                        {file.preview ? (
                          <img
                            src={file.preview}
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
                            }}>{file.name}</span>
                          </div>
                        )}
                        <button
                          onClick={() => removeReplyAttachment(comment._id, fidx)}
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
                            lineHeight: 1
                          }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Send Button */}
                {((replyTexts[comment._id] && replyTexts[comment._id].trim()) ||
                  (replyAttachments[comment._id] && replyAttachments[comment._id].length > 0)) && (
                    <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                      <button
                        onClick={() => handleSubmitReply(postId, comment._id)}
                        style={{
                          background: "#1877f2",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 14px",
                          fontSize: "13px",
                          fontWeight: "600",
                          cursor: "pointer"
                        }}
                      >
                        Gửi
                      </button>
                      <button
                        onClick={() => setReplyTo(prev => ({ ...prev, [comment._id]: false }))}
                        style={{
                          background: "#e4e6eb",
                          color: "#050505",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 14px",
                          fontSize: "13px",
                          fontWeight: "600",
                          cursor: "pointer"
                        }}
                      >
                        Hủy
                      </button>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Render replies */}
    {hasReplies && (
      <div style={{ marginTop: "4px", position: "relative" }}>
        {/* Nút "Xem thêm câu trả lời" */}
        {!showAllReplies && hiddenRepliesCount > 0 && (
          <div style={{ 
            marginBottom: "8px",
            marginLeft: "40px"
          }}>
            <button
              onClick={() => setShowAllReplies(true)}
              style={{
                background: "none",
                border: "none",
                color: "#65676b",
                cursor: "pointer",
                padding: "4px 0",
                fontWeight: "600",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
              onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"}
              onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}
            >
              <span>↩️</span>
              Xem thêm {hiddenRepliesCount} câu trả lời
            </button>
          </div>
        )}
        
        {visibleReplies.map((reply, idx) => (
          <div key={idx}>
            <CommentItem
              comment={reply}
              postId={postId}
              depth={depth + 1}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              replyTexts={replyTexts}
              replyAttachments={replyAttachments}
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
            />
          </div>
        ))}
        
        {/* Nút "Ẩn bớt" */}
        {showAllReplies && totalReplies > INITIAL_REPLIES_COUNT && (
          <div style={{ 
            marginTop: "4px",
            marginLeft: "40px"
          }}>
            <button
              onClick={() => setShowAllReplies(false)}
              style={{
                background: "none",
                border: "none",
                color: "#65676b",
                cursor: "pointer",
                padding: "4px 0",
                fontWeight: "600",
                fontSize: "13px"
              }}
              onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"}
              onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}
            >
              Ẩn bớt câu trả lời
            </button>
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
                  Chưa có ai thích bình luận này
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

export default CommentItem;