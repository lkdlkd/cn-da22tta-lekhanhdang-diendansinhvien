import React from "react";

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
  formatFileSize
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showAllReplies, setShowAllReplies] = React.useState(false);
  
  // Không giới hạn độ sâu, cho phép reply vô hạn
  const canShowReplies = true;
  const isReply = depth > 0;
  
  // Cấp 1: 0px
  // Cấp 2: 48px (tổng 48px)
  // Cấp 3: 48px (tổng 96px)
  // Cấp 4+: 0px (giữ nguyên ở 96px, không thụt thêm)
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
    marginBottom: isReply ? "6px" : "12px",
    marginLeft: getMarginLeft(),
    position: "relative"
  }}>
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginLeft: isReply ? "-12px" : "0" }}>
      <img
        src={comment.authorId?.avatarUrl || "/default-avatar.png"}
        alt="Avatar"
        style={{
          width: isReply ? "28px" : "36px",
          height: isReply ? "28px" : "36px",
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Comment Bubble */}
        <div style={{
          backgroundColor: "#f0f2f5",
          borderRadius: "18px",
          padding: "8px 12px",
          display: "inline-block",
          maxWidth: "100%"
        }}>
          <div style={{
            fontWeight: "600",
            fontSize: "13px",
            color: "#050505",
            marginBottom: comment.content ? "2px" : "0"
          }}>
            {comment.authorId?.displayName || comment.authorId?.username || "Ẩn danh"}
          </div>
          {comment.content && (
            <div style={{
              fontSize: "15px",
              color: "#050505",
              lineHeight: "1.3333",
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
                    marginTop: "4px"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"}
                  onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}
                >
                  {isExpanded ? "Ẩn bớt" : "Xem thêm"}
                </button>
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
              file.mime && file.mime.startsWith("image") ? (
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
                <a
                  key={fidx}
                  href={file.storageUrl || file}
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
                </a>
              )
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          fontSize: "12px",
          color: "#65676b",
          marginTop: "4px",
          marginLeft: "12px",
          display: "flex",
          gap: "12px",
          alignItems: "center"
        }}>
          <span style={{ fontWeight: "400" }}>{formatTime(comment.createdAt)}</span>
          <button
            style={{
              background: "none",
              border: "none",
              color: "#65676b",
              cursor: "pointer",
              padding: 0,
              fontWeight: "600",
              fontSize: "12px"
            }}
            onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"}
            onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}
          >
            Thích
          </button>
          <button
            style={{
              background: "none",
              border: "none",
              color: "#65676b",
              cursor: "pointer",
              padding: 0,
              fontWeight: "600",
              fontSize: "12px"
            }}
            onClick={() => setReplyTo(prev => ({ ...prev, [comment._id]: !prev[comment._id] }))}
            onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"}
            onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}
          >
            Trả lời
          </button>
          {comment.likesCount > 0 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginLeft: "auto"
            }}>
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
              <span style={{ fontSize: "12px", color: "#65676b" }}>{comment.likesCount}</span>
            </div>
          )}
        </div>

        {/* Reply Input */}
        {replyTo[comment._id] && (
          <div style={{
            marginTop: "8px",
            marginLeft: "12px"
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
                  width: "28px",
                  height: "28px",
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
      <div style={{ marginTop: "6px", position: "relative" }}>
        {/* Vertical line connecting all replies - only for level 0 */}
        {depth === 0 && totalReplies > 0 && (
          <div style={{
            position: "absolute",
            left: "18px",
            top: "0",
            height: "100%",
            width: "2px",
            backgroundColor: "#CED0D4"
          }} />
        )}
        
        {/* Vertical line for level 1 replies */}
        {depth === 1 && totalReplies > 0 && (
          <div style={{
            position: "absolute",
            left: "-42px",
            top: "0",
            height: "100%",
            width: "2px",
            backgroundColor: "#CED0D4"
          }} />
        )}
        
        {/* Vertical line for level 2+ replies */}
        {depth >= 2 && totalReplies > 0 && (
          <div style={{
            position: "absolute",
            left: "-30px",
            top: "-80px",
            height: "100%",
            width: "2px",
            backgroundColor: "#CED0D4"
          }} />
        )}
        
        {/* Nút "Xem thêm câu trả lời" */}
        {!showAllReplies && hiddenRepliesCount > 0 && (
          <div style={{ 
            marginBottom: "8px",
            marginLeft: "30px",
            position: "relative"
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
          <div key={idx} style={{ position: "relative" }}>
            {/* Horizontal connecting line for level 0 */}
            {depth === 0 && (
              <div style={{
                position: "absolute",
                left: "18px",
                top: "18px",
                width: "42px",
                height: "2px",
                backgroundColor: "#CED0D4"
              }} />
            )}
            {/* Horizontal connecting line for level 1 */}
            {depth === 1 && (
              <div style={{
                position: "absolute",
                left: "-42px",
                top: "18px",
                width: "42px",
                height: "2px",
                backgroundColor: "#CED0D4"
              }} />
            )}
            {/* Horizontal connecting line for level 2+ */}
            {depth >= 2 && (
              <div style={{
                position: "absolute",
                left: "-30px",
                top: "18px",
                width: "30px",
                height: "2px",
                backgroundColor: "#CED0D4"
              }} />
            )}
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
            />
          </div>
        ))}
        
        {/* Nút "Ẩn bớt" */}
        {showAllReplies && totalReplies > INITIAL_REPLIES_COUNT && (
          <div style={{ 
            marginTop: "8px",
            marginLeft: "30px",
            position: "relative"
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
  </div>
);
};

export default CommentItem;