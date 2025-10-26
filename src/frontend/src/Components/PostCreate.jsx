import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Table from "react-bootstrap/Table";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { createPost } from "../Utils/api";

const PostCreate = ({ categories, token, onPostCreated }) => {
    const [showModal, setShowModal] = useState(false);
    const [postForm, setPostForm] = useState({
        title: "",
        content: "",
        categoryId: "",
        tags: "",
        pinned: false,
        locked: false,
        isDraft: false,
        attachments: [],
    });
    const [preview, setPreview] = useState(null);

    const openModal = () => {
        setShowModal(true);
        setPreview(null);
        setPostForm({ title: "", content: "", categoryId: "" });
    };

    const closeModal = () => {
        setShowModal(false);
        setPreview(null);
    };

    const handleFormChange = (e) => {
        const { name, value, files, type, checked } = e.target;
        if (name === "attachments") {
            setPostForm({ ...postForm, attachments: files });
        } else if (type === "checkbox") {
            setPostForm({ ...postForm, [name]: checked });
        } else {
            setPostForm({ ...postForm, [name]: value });
        }
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
        // const result = await Swal.fire({
        //     title: "Xác nhận đăng bài?",
        //     text: "Bạn có chắc muốn đăng bài viết này?",
        //     icon: "question",
        //     showCancelButton: true,
        //     confirmButtonText: "Đăng bài",
        //     cancelButtonText: "Hủy",
        // });
        // if (result.isConfirmed) {
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
            if (postForm.attachments && postForm.attachments.length > 0) {
                for (let i = 0; i < postForm.attachments.length; i++) {
                    formData.append("attachments", postForm.attachments[i]);
                }
            }
            const result = await createPost(token, formData);
            if (!result.success) {
                toast.error(result.error || "Lỗi khi đăng bài");
                return;
            }   
            toast.success("Đăng bài thành công!");
            setShowModal(false);
            if (onPostCreated) onPostCreated();
        } catch (err) {
            toast.error("Lỗi khi đăng bài");
        }

    };

    return (
        <>
            <button className="btn btn-primary" onClick={openModal}>Tạo bài viết mới</button>
            <Modal show={showModal} onHide={closeModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Đăng bài viết mới</Modal.Title>
                </Modal.Header>
                <form onSubmit={handleSubmit} encType="multipart/form-data">
                    <Modal.Body>
                        <div className="mb-3">
                            <label className="form-label">Tiêu đề</label>
                            <input type="text" className="form-control" name="title" value={postForm.title} onChange={handleFormChange} required />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Nội dung</label>
                            <textarea className="form-control" name="content" value={postForm.content} onChange={handleFormChange} rows={4} required />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Chuyên mục</label>
                            <select className="form-select" name="categoryId" value={postForm.categoryId} onChange={handleFormChange} required>
                                <option value="">-- Chọn chuyên mục --</option>
                                {categories && categories.map(cat => (
                                    <option key={cat.slug} value={cat._id || cat.slug}>{cat.title}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="mb-3">
                            <label className="form-label">Thẻ (tags, cách nhau dấu phẩy)</label>
                            <input type="text" className="form-control" name="tags" value={postForm.tags} onChange={handleFormChange} placeholder="ví dụ: học tập, đời sống" />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Đính kèm tệp</label>
                            <input type="file" className="form-control" name="attachments" multiple onChange={handleFormChange} />
                        </div>
                        <div className="mb-3 d-flex gap-3">
                            <div className="form-check">
                                <input className="form-check-input" type="checkbox" name="pinned" checked={postForm.pinned} onChange={handleFormChange} id="pinnedCheck" />
                                <label className="form-check-label" htmlFor="pinnedCheck">Ghim bài viết</label>
                            </div>
                            <div className="form-check">
                                <input className="form-check-input" type="checkbox" name="locked" checked={postForm.locked} onChange={handleFormChange} id="lockedCheck" />
                                <label className="form-check-label" htmlFor="lockedCheck">Khoá bình luận</label>
                            </div>
                            <div className="form-check">
                                <input className="form-check-input" type="checkbox" name="isDraft" checked={postForm.isDraft} onChange={handleFormChange} id="draftCheck" />
                                <label className="form-check-label" htmlFor="draftCheck">Lưu dưới dạng nháp</label>
                            </div>
                        </div>
                        <button type="button" className="btn btn-outline-info me-2" onClick={handlePreview}>Xem trước</button>
                        {preview && (
                            <div className="mt-3">
                                <h6>Xem trước bài viết</h6>
                                <Table bordered>
                                    <tbody>
                                        <tr><th>Tiêu đề</th><td>{preview.title}</td></tr>
                                        <tr><th>Nội dung</th><td>{preview.content}</td></tr>
                                        <tr><th>Chuyên mục</th><td>{categories?.find(c => c._id === preview.categoryId || c.slug === preview.categoryId)?.title || preview.categoryId}</td></tr>
                                        <tr><th>Thẻ</th><td>{preview.tags}</td></tr>
                                        <tr><th>Ghim</th><td>{preview.pinned ? "Có" : "Không"}</td></tr>
                                        <tr><th>Khoá bình luận</th><td>{preview.locked ? "Có" : "Không"}</td></tr>
                                        <tr><th>Nháp</th><td>{preview.isDraft ? "Có" : "Không"}</td></tr>
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <button type="submit" className="btn btn-primary">Đăng bài</button>
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Đóng</button>
                    </Modal.Footer>
                </form>
            </Modal>
        </>
    );
};

export default PostCreate;
