import React, { useState, useEffect } from "react";
import * as api from "../Utils/api";
import { toast } from "react-toastify";
import { useOutletContext } from "react-router-dom";
const EditPostModal = ({ post, onClose, onUpdate }) => {
    const [title, setTitle] = useState(post?.title || "");
    const [content, setContent] = useState(post?.content || "");
    const [categoryId, setCategoryId] = useState(post?.categoryId?._id || "");
    // const [categories, setCategories] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState(post?.attachments || []);
    const [newAttachments, setNewAttachments] = useState([]);
    const [attachmentsToRemove, setAttachmentsToRemove] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { categories } = useOutletContext();
    
    // useEffect(() => {
    //     const fetchCategories = async () => {
    //         try {
    //             const result = await api.getCategories();
    //             if (result.success) {
    //                 setCategories(result.categories);
    //             }
    //         } catch (error) {
    //             console.error("Error fetching categories:", error);
    //         }
    //     };
    //     fetchCategories();
    // }, []);

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
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
        }}>
            <div style={{
                backgroundColor: "white",
                borderRadius: "12px",
                width: "100%",
                maxWidth: "700px",
                maxHeight: "90vh",
                overflow: "auto",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
            }}>
                {/* Header */}
                <div style={{
                    padding: "20px",
                    borderBottom: "1px solid #e4e6eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                }}>
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>
                        Chỉnh sửa bài viết
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            fontSize: "24px",
                            cursor: "pointer",
                            color: "#65676b",
                            padding: "0",
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f2f3f5"}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                        ×
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
                    {/* Title */}
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "8px",
                            fontWeight: "600",
                            color: "#050505"
                        }}>
                            Tiêu đề <span style={{ color: "red" }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Nhập tiêu đề bài viết..."
                            style={{
                                width: "100%",
                                padding: "12px",
                                border: "1px solid #ccd0d5",
                                borderRadius: "8px",
                                fontSize: "15px",
                                outline: "none"
                            }}
                            onFocus={(e) => e.target.style.borderColor = "#1877f2"}
                            onBlur={(e) => e.target.style.borderColor = "#ccd0d5"}
                        />
                    </div>

                    {/* Category */}
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "8px",
                            fontWeight: "600",
                            color: "#050505"
                        }}>
                            Chuyên mục
                        </label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "12px",
                                border: "1px solid #ccd0d5",
                                borderRadius: "8px",
                                fontSize: "15px",
                                outline: "none",
                                cursor: "pointer"
                            }}
                        >
                            <option value="">-- Chọn chuyên mục --</option>
                            {categories.map(cat => (
                                <option key={cat._id} value={cat._id}>
                                    {cat.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Content */}
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "8px",
                            fontWeight: "600",
                            color: "#050505"
                        }}>
                            Nội dung <span style={{ color: "red" }}>*</span>
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Bạn đang nghĩ gì?"
                            rows={6}
                            style={{
                                width: "100%",
                                padding: "12px",
                                border: "1px solid #ccd0d5",
                                borderRadius: "8px",
                                fontSize: "15px",
                                outline: "none",
                                resize: "vertical",
                                fontFamily: "inherit"
                            }}
                            onFocus={(e) => e.target.style.borderColor = "#1877f2"}
                            onBlur={(e) => e.target.style.borderColor = "#ccd0d5"}
                        />
                    </div>

                    {/* Existing Attachments */}
                    {existingAttachments.length > 0 && (
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{
                                display: "block",
                                marginBottom: "8px",
                                fontWeight: "600",
                                color: "#050505"
                            }}>
                                File đính kèm hiện tại
                            </label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {existingAttachments.map(att => (
                                    <div key={att._id} style={{
                                        position: "relative",
                                        borderRadius: "8px",
                                        overflow: "hidden",
                                        border: "1px solid #e4e6eb"
                                    }}>
                                        {att.mime?.startsWith('image/') ? (
                                            <img
                                                src={att.storageUrl}
                                                alt={att.filename}
                                                style={{
                                                    width: "100px",
                                                    height: "100px",
                                                    objectFit: "cover"
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: "100px",
                                                height: "100px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                backgroundColor: "#f0f2f5",
                                                fontSize: "12px",
                                                textAlign: "center",
                                                padding: "8px"
                                            }}>
                                                📄<br />{att.filename?.substring(0, 10)}...
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeExistingAttachment(att._id)}
                                            style={{
                                                position: "absolute",
                                                top: "4px",
                                                right: "4px",
                                                background: "rgba(0,0,0,0.6)",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "50%",
                                                width: "24px",
                                                height: "24px",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center"
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* New Attachments */}
                    {newAttachments.length > 0 && (
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{
                                display: "block",
                                marginBottom: "8px",
                                fontWeight: "600",
                                color: "#050505"
                            }}>
                                File mới sẽ thêm
                            </label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {newAttachments.map((att, index) => (
                                    <div key={index} style={{
                                        position: "relative",
                                        borderRadius: "8px",
                                        overflow: "hidden",
                                        border: "1px solid #e4e6eb"
                                    }}>
                                        {att.preview ? (
                                            <img
                                                src={att.preview}
                                                alt={att.name}
                                                style={{
                                                    width: "100px",
                                                    height: "100px",
                                                    objectFit: "cover"
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: "100px",
                                                height: "100px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                backgroundColor: "#f0f2f5",
                                                fontSize: "12px",
                                                textAlign: "center",
                                                padding: "8px"
                                            }}>
                                                📄<br />{att.name?.substring(0, 10)}...
                                                <br />{formatFileSize(att.size)}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeNewAttachment(index)}
                                            style={{
                                                position: "absolute",
                                                top: "4px",
                                                right: "4px",
                                                background: "rgba(0,0,0,0.6)",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "50%",
                                                width: "24px",
                                                height: "24px",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center"
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add Attachments Button */}
                    <div style={{ marginBottom: "20px" }}>
                        <label
                            htmlFor="edit-post-attachments"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "10px 16px",
                                backgroundColor: "#f0f2f5",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontWeight: "500",
                                color: "#050505"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#e4e6eb"}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f0f2f5"}
                        >
                            📎 Thêm file đính kèm
                        </label>
                        <input
                            type="file"
                            id="edit-post-attachments"
                            multiple
                            onChange={handleNewAttachmentChange}
                            style={{ display: "none" }}
                        />
                    </div>

                    {/* Buttons */}
                    <div style={{
                        display: "flex",
                        gap: "12px",
                        justifyContent: "flex-end"
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            style={{
                                padding: "10px 24px",
                                backgroundColor: "#e4e6eb",
                                color: "#050505",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "15px",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                            onMouseOver={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = "#d8dadf")}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#e4e6eb"}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                padding: "10px 24px",
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
            </div>
        </div>
    );
};

export default EditPostModal;
