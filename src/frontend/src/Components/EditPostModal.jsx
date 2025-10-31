import React, { useState, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import * as api from "../Utils/api";
import { toast } from "react-toastify";
import { useOutletContext } from "react-router-dom";

const EditPostModal = ({ post, onClose, onUpdate }) => {
    const [title, setTitle] = useState(post?.title || "");
    const [content, setContent] = useState(post?.content || "");
    const [categoryId, setCategoryId] = useState(post?.categoryId?._id || "");
    const [tags, setTags] = useState(post?.tags?.join(", ") || "");
    const [existingAttachments, setExistingAttachments] = useState(post?.attachments || []);
    const [newAttachments, setNewAttachments] = useState([]);
    const [attachmentsToRemove, setAttachmentsToRemove] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedEmoji, setSelectedEmoji] = useState("");

    const { categories, user } = useOutletContext();

    // Danh sách emoji phổ biến
    const emojis = [
        "😊", "😂", "❤️", "😍", "😭", "🤔", "👍", "🎉", "🔥", "✨",
        "💯", "😎", "🥰", "😢", "😱", "🤗", "💪", "🙏", "👏", "🎈",
        "🌟", "💖", "😴", "🤩", "😜", "🥳", "🤝", "💕", "🌈", "⭐"
    ];
    const handleEmojiSelect = (emoji) => {
        setSelectedEmoji(emoji);
        setShowEmojiPicker(false);
        // Thêm emoji vào content
        setContent(prev => prev + " " + emoji);
    };

    const handleNewAttachmentChange = (e) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const fileArray = Array.from(e.target.files);
        const previews = fileArray.map(file => ({
            file,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            name: file.name,
            type: file.type,
            size: file.size
        }));

        setNewAttachments(prev => [...prev, ...previews]);
    };

    const removeNewAttachment = (index) => {
        setNewAttachments(prev => {
            const updated = [...prev];
            if (updated[index]?.preview) {
                URL.revokeObjectURL(updated[index].preview);
            }
            updated.splice(index, 1);
            return updated;
        });
    };

    const removeExistingAttachment = (attachmentId) => {
        setExistingAttachments(prev => prev.filter(att => att._id !== attachmentId));
        setAttachmentsToRemove(prev => [...prev, attachmentId]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim()) {
            toast.error("Vui lòng nhập tiêu đề bài viết");
            return;
        }

        if (!content.trim()) {
            toast.error("Vui lòng nhập nội dung bài viết");
            return;
        }

        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();

            formData.append('title', title);
            formData.append('content', content);
            if (categoryId) {
                formData.append('categoryId', categoryId);
            }

            // Thêm tags
            if (tags.trim()) {
                tags.split(",").map(tag => tag.trim()).filter(tag => tag).forEach(tag => {
                    formData.append('tags', tag);
                });
            }

            // Thêm danh sách attachments cần xóa
            if (attachmentsToRemove.length > 0) {
                attachmentsToRemove.forEach(id => {
                    formData.append('removeAttachments[]', id);
                });
            }

            // Thêm file mới
            newAttachments.forEach(att => {
                formData.append('attachments', att.file);
            });

            const result = await api.updatePost(token, post._id, formData);

            if (result.success) {
                toast.success("Cập nhật bài viết thành công!");

                // Cleanup previews
                newAttachments.forEach(att => {
                    if (att.preview) URL.revokeObjectURL(att.preview);
                });

                if (onUpdate) {
                    onUpdate();
                }
                onClose();
            } else {
                toast.error(result.error || "Lỗi cập nhật bài viết");
            }
        } catch (error) {
            console.error("Error updating post:", error);
            toast.error(error.message || "Lỗi cập nhật bài viết");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <Modal show={true} onHide={onClose} centered size="lg">
            <form onSubmit={handleSubmit} encType="multipart/form-data">
                {/* Header */}
                <div style={{
                    padding: "16px 16px 0 16px",
                    borderBottom: "1px solid #e4e6eb"
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "16px"
                    }}>
                        <h5 style={{
                            margin: 0,
                            fontSize: "20px",
                            fontWeight: "700",
                            color: "#050505"
                        }}>
                            Chỉnh sửa bài viết
                        </h5>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: "#e4e6eb",
                                border: "none",
                                borderRadius: "50%",
                                width: "36px",
                                height: "36px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontSize: "20px",
                                color: "#65676b"
                            }}
                        >
                            ×
                        </button>
                    </div>

                    {/* User info */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        paddingBottom: "16px"
                    }}>
                        <img
                            src={post?.authorId?.avatarUrl || user?.avatarUrl || "https://ui-avatars.com/api/?background=random&name=user"}
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
                                {post?.authorId?.displayName || user?.displayName || "Bạn"}
                            </div>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                required
                                style={{
                                    backgroundColor: "#e7f3ff",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "4px 8px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    color: "#1877f2",
                                    cursor: "pointer",
                                    outline: "none"
                                }}
                            >
                                <option value="">-- Chọn chuyên mục --</option>
                                {categories && categories.map(cat => (
                                    <option key={cat.slug} value={cat._id || cat.slug}>{cat.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <Modal.Body style={{ padding: "16px", maxHeight: "60vh", overflowY: "auto" }}>
                    {/* Title */}
                    <div className="mb-3">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Tiêu đề bài viết..."
                            required
                            style={{
                                width: "100%",
                                border: "none",
                                outline: "none",
                                fontSize: "18px",
                                fontWeight: "600",
                                padding: "8px 0",
                                color: "#050505"
                            }}
                        />
                    </div>

                    {/* Content */}
                    <div className="mb-3">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Bạn đang nghĩ gì?"
                            rows={6}
                            required
                            style={{
                                width: "100%",
                                border: "none",
                                outline: "none",
                                fontSize: "15px",
                                resize: "none",
                                color: "#050505",
                                lineHeight: "1.5"
                            }}
                        />
                    </div>

                    {/* Tags Input */}
                    <div className="mb-3">
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="Thêm thẻ (cách nhau bằng dấu phẩy). Ví dụ: học tập, đời sống"
                            style={{
                                width: "100%",
                                border: "1px solid #e4e6eb",
                                borderRadius: "8px",
                                outline: "none",
                                fontSize: "14px",
                                padding: "10px 12px",
                                color: "#65676b"
                            }}
                        />
                    </div>

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef => window.editFileInputRef = fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        onChange={handleNewAttachmentChange}
                        style={{ display: "none" }}
                    />

                    {/* Existing + New Attachments combined */}
                    {(existingAttachments.length > 0 || newAttachments.length > 0) && (
                        <div style={{
                            border: "1px solid #e4e6eb",
                            borderRadius: "8px",
                            padding: "12px",
                            backgroundColor: "#f7f8fa",
                            marginBottom: "12px"
                        }}>
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: (existingAttachments.length + newAttachments.length) === 1
                                    ? "1fr"
                                    : (existingAttachments.length + newAttachments.length) === 2
                                        ? "repeat(2, 1fr)"
                                        : "repeat(3, 1fr)",
                                gap: "4px"
                            }}>
                                {/* Existing Attachments */}
                                {existingAttachments.map(att => (
                                    <div key={att._id} style={{
                                        position: "relative",
                                        backgroundColor: "#fff",
                                        borderRadius: "8px",
                                        overflow: "hidden",
                                        aspectRatio: (existingAttachments.length + newAttachments.length) === 1 ? "16/9" : "1/1"
                                    }}>
                                        {att.mime?.startsWith('image/') ? (
                                            <img
                                                src={att.storageUrl}
                                                alt={att.filename}
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover"
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: "100%",
                                                height: "100%",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                padding: "16px",
                                                backgroundColor: "#f0f2f5",
                                                minHeight: "150px"
                                            }}>
                                                <span style={{ fontSize: "40px", marginBottom: "8px" }}>📎</span>
                                                <span style={{
                                                    fontSize: "13px",
                                                    color: "#050505",
                                                    textAlign: "center",
                                                    wordBreak: "break-word",
                                                    fontWeight: "500",
                                                    marginBottom: "4px"
                                                }}>
                                                    {att.filename}
                                                </span>
                                                <span style={{
                                                    fontSize: "12px",
                                                    color: "#65676b"
                                                }}>
                                                    {formatFileSize(att.size || 0)}
                                                </span>
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeExistingAttachment(att._id)}
                                            style={{
                                                position: "absolute",
                                                top: "8px",
                                                right: "8px",
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "50%",
                                                backgroundColor: "rgba(255,255,255,0.9)",
                                                color: "#050505",
                                                border: "none",
                                                cursor: "pointer",
                                                fontSize: "20px",
                                                fontWeight: "bold",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                lineHeight: 1,
                                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.backgroundColor = "#e4e6eb";
                                                e.currentTarget.style.transform = "scale(1.05)";
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.9)";
                                                e.currentTarget.style.transform = "scale(1)";
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}

                                {/* New Attachments */}
                                {newAttachments.map((att, index) => (
                                    <div key={`new-${index}`} style={{
                                        position: "relative",
                                        backgroundColor: "#fff",
                                        borderRadius: "8px",
                                        overflow: "hidden",
                                        aspectRatio: (existingAttachments.length + newAttachments.length) === 1 ? "16/9" : "1/1"
                                    }}>
                                        {att.preview ? (
                                            <img
                                                src={att.preview}
                                                alt="preview"
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover"
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: "100%",
                                                height: "100%",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                padding: "16px",
                                                backgroundColor: "#f0f2f5",
                                                minHeight: "150px"
                                            }}>
                                                <span style={{ fontSize: "40px", marginBottom: "8px" }}>📎</span>
                                                <span style={{
                                                    fontSize: "13px",
                                                    color: "#050505",
                                                    textAlign: "center",
                                                    wordBreak: "break-word",
                                                    fontWeight: "500",
                                                    marginBottom: "4px"
                                                }}>
                                                    {att.name}
                                                </span>
                                                <span style={{
                                                    fontSize: "12px",
                                                    color: "#65676b"
                                                }}>
                                                    {formatFileSize(att.size)}
                                                </span>
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeNewAttachment(index)}
                                            style={{
                                                position: "absolute",
                                                top: "8px",
                                                right: "8px",
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "50%",
                                                backgroundColor: "rgba(255,255,255,0.9)",
                                                color: "#050505",
                                                border: "none",
                                                cursor: "pointer",
                                                fontSize: "20px",
                                                fontWeight: "bold",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                lineHeight: 1,
                                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.backgroundColor = "#e4e6eb";
                                                e.currentTarget.style.transform = "scale(1.05)";
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.9)";
                                                e.currentTarget.style.transform = "scale(1)";
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add to Post Section - Facebook Style */}
                    <div style={{
                        border: "1px solid #e4e6eb",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px"
                    }}>
                        <span style={{
                            fontSize: "15px",
                            fontWeight: "600",
                            color: "#050505"
                        }}>
                            Thêm vào bài viết của bạn
                        </span>
                        <div style={{ display: "flex", gap: "4px" }}>
                            <button
                                type="button"
                                onClick={() => window.editFileInputRef?.click()}
                                style={{
                                    background: "none",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "36px",
                                    height: "36px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    fontSize: "20px"
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f0f2f5"}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                                🖼️
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "36px",
                                    height: "36px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    fontSize: "20px"
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f0f2f5"}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                                😊
                            </button>
                        </div>
                    </div>

                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                        <div style={{
                            border: "1px solid #e4e6eb",
                            borderRadius: "8px",
                            padding: "12px",
                            backgroundColor: "#fff",
                            marginBottom: "12px",
                            display: "grid",
                            gridTemplateColumns: "repeat(10, 1fr)",
                            gap: "4px"
                        }}>
                            {emojis.map((emoji, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleEmojiSelect(emoji)}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        fontSize: "24px",
                                        cursor: "pointer",
                                        borderRadius: "4px",
                                        padding: "8px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f0f2f5"}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </Modal.Body>

                {/* Footer with full-width submit button */}
                <div style={{ padding: "16px", borderTop: "1px solid #e4e6eb" }}>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            width: "100%",
                            padding: "10px",
                            backgroundColor: isSubmitting ? "#bcc0c4" : "#1877f2",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "15px",
                            fontWeight: "600",
                            cursor: isSubmitting ? "not-allowed" : "pointer"
                        }}
                        onMouseOver={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = "#166fe5")}
                        onMouseOut={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = "#1877f2")}
                    >
                        {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default EditPostModal;