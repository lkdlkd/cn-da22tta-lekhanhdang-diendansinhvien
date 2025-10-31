import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Table from "react-bootstrap/Table";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { createPost } from "../Utils/api";
const PostCreate = ({ user, categories, token, onPostCreated }) => {
    const [showModal, setShowModal] = useState(false);
    const [postForm, setPostForm] = useState({
        title: "",
        content: "",
        categoryId: "",
        tags: "",
        pinned: false,
        locked: false,
        isDraft: false,
    });
    const [attachments, setAttachments] = useState([]);
    const [preview, setPreview] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedEmoji, setSelectedEmoji] = useState("");

    // Danh sách emoji phổ biến
    const emojis = [
        "😊", "😂", "❤️", "😍", "😭", "🤔", "👍", "🎉", "🔥", "✨",
        "💯", "😎", "🥰", "😢", "😱", "🤗", "💪", "🙏", "👏", "🎈",
        "🌟", "💖", "😴", "🤩", "😜", "🥳", "🤝", "💕", "🌈", "⭐"
    ];

    const openModal = () => {
        setShowModal(true);
        setPreview(null);
        setPostForm({
            title: "",
            content: "",
            categoryId: "",
            tags: "",
            pinned: false,
            locked: false,
            isDraft: false
        });
        setAttachments([]);
        setShowEmojiPicker(false);
        setSelectedEmoji("");
    };

    const closeModal = () => {
        setShowModal(false);
        setPreview(null);
        // Clean up previews
        attachments.forEach(att => {
            if (att.preview) URL.revokeObjectURL(att.preview);
        });
        setAttachments([]);
        setShowEmojiPicker(false);
        setSelectedEmoji("");
    };

    const handleEmojiSelect = (emoji) => {
        setSelectedEmoji(emoji);
        setShowEmojiPicker(false);
        // Thêm emoji vào content
        setPostForm(prev => ({
            ...prev,
            content: prev.content + " " + emoji
        }));
    };

    const handleFormChange = (e) => {
        const { name, value, files, type, checked } = e.target;
        if (name === "attachments") {
            handleAttachmentChange(files);
        } else if (type === "checkbox") {
            setPostForm({ ...postForm, [name]: checked });
        } else {
            setPostForm({ ...postForm, [name]: value });
        }
    };

    const handleAttachmentChange = (files) => {
        if (!files || files.length === 0) return;
        const fileArray = Array.from(files);
        const previews = fileArray.map(file => ({
            file,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            name: file.name,
            type: file.type,
            size: file.size
        }));
        setAttachments(prev => [...prev, ...previews]);
    };

    const removeAttachment = (index) => {
        setAttachments(prev => {
            const current = [...prev];
            if (current[index]?.preview) {
                URL.revokeObjectURL(current[index].preview);
            }
            return current.filter((_, idx) => idx !== index);
        });
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handlePreview = () => {
        setPreview({ ...postForm });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!postForm.title || !postForm.content || !postForm.categoryId) {
            toast.error("Vui lòng điền đầy đủ thông tin bài viết!");
            return;
        }
        try {
            // Prepare FormData for file upload
            const formData = new FormData();
            formData.append("title", postForm.title);
            formData.append("content", postForm.content);
            formData.append("categoryId", postForm.categoryId);
            formData.append("pinned", postForm.pinned);
            formData.append("locked", postForm.locked);
            formData.append("isDraft", postForm.isDraft);
            if (postForm.tags) {
                postForm.tags.split(",").map(tag => tag.trim()).forEach(tag => formData.append("tags", tag));
            }
            if (attachments && attachments.length > 0) {
                attachments.forEach(att => {
                    formData.append("attachments", att.file);
                });
            }
            const result = await createPost(token, formData);
            if (!result.success) {
                toast.error(result.error || "Lỗi khi đăng bài");
                return;
            }
            toast.success("Đăng bài thành công!");

            // Clean up previews
            attachments.forEach(att => {
                if (att.preview) URL.revokeObjectURL(att.preview);
            });
            setAttachments([]);
            setShowModal(false);
            if (onPostCreated) onPostCreated();
        } catch (err) {
            toast.error("Lỗi khi đăng bài");
        }
    };
    return (
        <>
            {/* Facebook-style Create Post Button */}
            <div
                onClick={openModal}
                style={{
                    backgroundColor: "white",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    marginBottom: "16px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                }}
            >
                <img
                    src={user && user.avatarUrl ? user.avatarUrl : "https://ui-avatars.com/api/?background=random&name=user"}
                    alt="Avatar"
                    style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        objectFit: "cover"
                    }}
                />
                <div
                    style={{
                        flex: 1,
                        backgroundColor: "#f0f2f5",
                        borderRadius: "50px",
                        padding: "10px 16px",
                        color: "#65676b",
                        fontSize: "15px"
                    }}
                >
                    {
                        user && user.displayName || "Bạn"
                    } ơi, bạn đang nghĩ gì thế?
                </div>
            </div>

            <Modal show={showModal} onHide={closeModal} centered size="lg">
                <form onSubmit={handleSubmit} encType="multipart/form-data">
                    {/* Facebook-style Header */}
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
                                Tạo bài viết
                            </h5>
                            <button
                                type="button"
                                onClick={closeModal}
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

                        {/* User Info */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            paddingBottom: "16px"
                        }}>
                            <img
                                src={user && user.avatarUrl ? user.avatarUrl : "https://ui-avatars.com/api/?background=random&name=user"}
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
                                    {
                                        user && user.displayName || "Bạn"
                                    }
                                </div>
                                <select
                                    name="categoryId"
                                    value={postForm.categoryId}
                                    onChange={handleFormChange}
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
                        {/* Title Input */}
                        <div className="mb-3">
                            <input
                                type="text"
                                name="title"
                                value={postForm.title}
                                onChange={handleFormChange}
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

                        {/* Content Textarea */}
                        <div className="mb-3">
                            <textarea
                                name="content"
                                value={postForm.content}
                                onChange={handleFormChange}
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
                                name="tags"
                                value={postForm.tags}
                                onChange={handleFormChange}
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

                        {/* Hidden File Input */}
                        <input
                            ref={fileInputRef => window.fileInputRef = fileInputRef}
                            type="file"
                            name="attachments"
                            multiple
                            accept="image/*,video/*,.pdf,.doc,.docx"
                            onChange={handleFormChange}
                            style={{ display: "none" }}
                        />

                        {/* Attachment Previews - Facebook Style */}
                        {attachments && attachments.length > 0 && (
                            <div style={{
                                border: "1px solid #e4e6eb",
                                borderRadius: "8px",
                                padding: "12px",
                                backgroundColor: "#f7f8fa",
                                marginBottom: "12px"
                            }}>
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: attachments.length === 1
                                        ? "1fr"
                                        : attachments.length === 2
                                            ? "repeat(2, 1fr)"
                                            : "repeat(3, 1fr)",
                                    gap: "4px"
                                }}>
                                    {attachments.map((item, idx) => (
                                        <div key={idx} style={{
                                            position: "relative",
                                            backgroundColor: "#fff",
                                            borderRadius: "8px",
                                            overflow: "hidden",
                                            aspectRatio: attachments.length === 1 ? "16/9" : "1/1"
                                        }}>
                                            {item.preview ? (
                                                <img
                                                    src={item.preview}
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
                                                        {item.name}
                                                    </span>
                                                    <span style={{
                                                        fontSize: "12px",
                                                        color: "#65676b"
                                                    }}>
                                                        {formatFileSize(item.size)}
                                                    </span>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(idx)}
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
                                    onClick={() => window.fileInputRef?.click()}
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
                                        fontSize: "24px",
                                        transition: "background-color 0.2s"
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f0f2f5"}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                    title="Ảnh/Video"
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
                                        fontSize: "24px",
                                        transition: "background-color 0.2s",
                                        position: "relative"
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f0f2f5"}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                    title="Cảm xúc/Hoạt động"
                                >
                                    {selectedEmoji || "😊"}
                                </button>
                            </div>
                        </div>

                        {/* Emoji Picker */}
                        {showEmojiPicker && (
                            <div style={{
                                border: "1px solid #e4e6eb",
                                borderRadius: "8px",
                                padding: "12px",
                                backgroundColor: "white",
                                marginBottom: "12px",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                            }}>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "8px"
                                }}>
                                    <span style={{
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        color: "#050505"
                                    }}>
                                        Chọn biểu tượng cảm xúc
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowEmojiPicker(false)}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            fontSize: "20px",
                                            color: "#65676b",
                                            padding: "0 4px"
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                                <div style={{
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
                                                background: selectedEmoji === emoji ? "#e7f3ff" : "transparent",
                                                border: "none",
                                                borderRadius: "6px",
                                                padding: "8px",
                                                fontSize: "24px",
                                                cursor: "pointer",
                                                transition: "background-color 0.2s"
                                            }}
                                            onMouseOver={(e) => {
                                                if (selectedEmoji !== emoji) {
                                                    e.currentTarget.style.backgroundColor = "#f0f2f5";
                                                }
                                            }}
                                            onMouseOut={(e) => {
                                                if (selectedEmoji !== emoji) {
                                                    e.currentTarget.style.backgroundColor = "transparent";
                                                }
                                            }}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Options - Collapsible */}
                        {/* <details style={{ marginBottom: "12px" }}>
                            <summary style={{
                                cursor: "pointer",
                                padding: "8px 0",
                                fontSize: "14px",
                                fontWeight: "600",
                                color: "#65676b",
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                            }}>
                                <span>⚙️</span>
                                Tùy chọn nâng cao
                            </summary>
                            <div style={{
                                padding: "12px",
                                backgroundColor: "#f7f8fa",
                                borderRadius: "8px",
                                marginTop: "8px"
                            }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <label style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        cursor: "pointer",
                                        fontSize: "15px"
                                    }}>
                                        <input
                                            type="checkbox"
                                            name="pinned"
                                            checked={postForm.pinned}
                                            onChange={handleFormChange}
                                            style={{
                                                width: "18px",
                                                height: "18px",
                                                cursor: "pointer"
                                            }}
                                        />
                                        <span>📌 Ghim bài viết</span>
                                    </label>
                                    <label style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        cursor: "pointer",
                                        fontSize: "15px"
                                    }}>
                                        <input
                                            type="checkbox"
                                            name="locked"
                                            checked={postForm.locked}
                                            onChange={handleFormChange}
                                            style={{
                                                width: "18px",
                                                height: "18px",
                                                cursor: "pointer"
                                            }}
                                        />
                                        <span>🔒 Khóa bình luận</span>
                                    </label>
                                    <label style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        cursor: "pointer",
                                        fontSize: "15px"
                                    }}>
                                        <input
                                            type="checkbox"
                                            name="isDraft"
                                            checked={postForm.isDraft}
                                            onChange={handleFormChange}
                                            style={{
                                                width: "18px",
                                                height: "18px",
                                                cursor: "pointer"
                                            }}
                                        />
                                        <span>📝 Lưu dưới dạng nháp</span>
                                    </label>
                                </div>
                            </div>
                        </details> */}
                    </Modal.Body>

                    {/* Facebook-style Footer */}
                    <div style={{
                        padding: "16px",
                        borderTop: "1px solid #e4e6eb"
                    }}>
                        <button
                            type="submit"
                            style={{
                                width: "100%",
                                backgroundColor: "#1877f2",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                padding: "12px",
                                fontSize: "15px",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "background-color 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#166fe5"}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#1877f2"}
                        >
                            Đăng
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default PostCreate;
