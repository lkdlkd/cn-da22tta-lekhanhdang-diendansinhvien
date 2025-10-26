import React from "react";
import CommentItem from "./CommentItem";

const PostItem = ({
  post,
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
  toggleComments
}) => {
  const hasComments = post.comments && post.comments.length > 0;
  const organizedComments = hasComments ? organizeComments(post.comments) : [];

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
              {formatTime(post.createdAt)} · <span style={{ backgroundColor: "#e7f3ff", color: "#1877f2", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", fontWeight: "500" }}>{post.categoryId?.title || "Chung"}</span>
            </div>
          </div>
          <button style={{ background: "none", border: "none", fontSize: "20px", color: "#65676b", cursor: "pointer", padding: "4px 8px" }}>⋯</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 16px 12px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#050505", marginBottom: "8px", lineHeight: "1.4" }}>
          <a href={`/post/${post.slug}`} style={{ color: "#050505", textDecoration: "none" }}>
            {post.title}
          </a>
        </h3>
        <p style={{ fontSize: "15px", color: "#050505", lineHeight: "1.5", marginBottom: "12px" }}>
          {post.excerpt || post.content?.slice(0, 200) + (post.content?.length > 200 ? "..." : "")}
        </p>
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
        <div style={{ display: "grid", gridTemplateColumns: post.attachments.length === 1 ? "1fr" : "repeat(2, 1fr)", gap: "2px" }}>
          {post.attachments.map((file, idx) => (
            file.mime && file.mime.startsWith("image") ? (
              <img
                key={idx}
                src={file.storageUrl || file}
                alt="attachment"
                style={{ width: "100%", height: post.attachments.length === 1 ? "400px" : "200px", objectFit: "cover", cursor: "pointer" }}
              />
            ) : (
              <a key={idx} href={file.storageUrl || file} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", padding: "12px 16px", backgroundColor: "#f0f2f5", borderRadius: "8px", textDecoration: "none" }}>
                <span style={{ fontSize: "24px", marginRight: "8px" }}>📎</span>
                <span style={{ color: "#1877f2", fontWeight: "500" }}>{file.filename || "Tài liệu"}</span>
              </a>
            )
          ))}
        </div>
      )}

      {/* Stats */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #e4e6eb", borderBottom: "1px solid #e4e6eb", display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#65676b" }}>
        <span style={{ cursor: "pointer" }}>{isLiked ? "👍 " : ""}{(post.likesCount || 0) + (isLiked ? 1 : 0)} lượt thích</span>
        <div style={{ display: "flex", gap: "12px" }}>
          <span style={{ cursor: "pointer" }}>{post.commentsCount || 0} bình luận</span>
          <span style={{ cursor: "pointer" }}>{post.views || 0} lượt xem</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: "4px 8px", display: "flex", justifyContent: "space-around" }}>
        <button
          onClick={() => handleLike(post._id)}
          style={{ flex: 1, background: "none", border: "none", padding: "8px", borderRadius: "4px", cursor: "pointer", fontSize: "15px", fontWeight: "600", color: isLiked ? "#1877f2" : "#65676b", transition: "background-color 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = "#f2f3f5"}
          onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
        >
          {isLiked ? "👍" : "👍🏻"} Thích
        </button>
        <button
          onClick={() => toggleComments(post._id)}
          style={{ flex: 1, background: "none", border: "none", padding: "8px", borderRadius: "4px", cursor: "pointer", fontSize: "15px", fontWeight: "600", color: isCommentsExpanded ? "#1877f2" : "#65676b", transition: "background-color 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = "#f2f3f5"}
          onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
        >
          💬 Bình luận
        </button>
        <button style={{ flex: 1, background: "none", border: "none", padding: "8px", borderRadius: "4px", cursor: "pointer", fontSize: "15px", fontWeight: "600", color: "#65676b", transition: "background-color 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
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

          {/* Comment Input */}
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <img src="/default-avatar.png" alt="Your avatar" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />
            <div style={{ flex: 1 }}>
              {/* Attachment Previews */}
              {commentAttachments[post._id] && commentAttachments[post._id].length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "8px", marginBottom: "8px" }}>
                  {commentAttachments[post._id].map((item, idx) => (
                    <div key={idx} style={{ position: "relative", backgroundColor: "#f0f2f5", borderRadius: "8px", overflow: "hidden" }}>
                      {item.preview ? (
                        <img src={item.preview} alt="preview" style={{ width: "100%", height: "100px", objectFit: "cover" }} />
                      ) : (
                        <div style={{ height: "100px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px" }}>
                          <span style={{ fontSize: "24px", marginBottom: "4px" }}>📎</span>
                          <span style={{ fontSize: "10px", color: "#65676b", textAlign: "center", wordBreak: "break-word", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{item.name}</span>
                          <span style={{ fontSize: "9px", color: "#8a8d91", marginTop: "2px" }}>{formatFileSize(item.size)}</span>
                        </div>
                      )}
                      <button
                        onClick={() => removeAttachment(post._id, idx)}
                        style={{ position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.6)", color: "white", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ position: "relative" }}>
                <textarea
                  value={commentTexts[post._id] || ''}
                  onChange={e => handleCommentChange(post._id, e.target.value)}
                  placeholder="Viết bình luận..."
                  style={{ width: "100%", backgroundColor: "#f0f2f5", border: "none", borderRadius: "18px", padding: "8px 40px 8px 12px", fontSize: "14px", resize: "none", minHeight: "36px", outline: "none", fontFamily: "inherit" }}
                  rows={1}
                  onInput={e => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                />
                <label style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: "20px", color: "#65676b", transition: "color 0.2s" }}
                  onMouseOver={e => e.currentTarget.style.color = "#1877f2"}
                  onMouseOut={e => e.currentTarget.style.color = "#65676b"}
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
              {(commentTexts[post._id] && commentTexts[post._id].trim()) || (commentAttachments[post._id] && commentAttachments[post._id].length > 0) ? (
                <button
                  onClick={() => handleSubmitComment(post._id)}
                  style={{ marginTop: "8px", backgroundColor: "#1877f2", color: "white", border: "none", borderRadius: "6px", padding: "6px 16px", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "background-color 0.2s" }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = "#166fe5"}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = "#1877f2"}
                >Gửi</button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostItem;
