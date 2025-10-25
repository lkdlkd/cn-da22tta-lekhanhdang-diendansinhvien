import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Modal from "react-bootstrap/Modal";
import Table from "react-bootstrap/Table";
import { toast } from "react-toastify";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../../../Utils/api";

export default function CategoryDashboard() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ title: "", slug: "", description: "" });
    const [showFormModal, setShowFormModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const token = localStorage.getItem("token");

    useEffect(() => {
        getCategories().then(data => {
            setCategories(data);
            setLoading(false);
        });
    }, []);

    const handleChange = e => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleEdit = cat => {
        setEditing(cat._id);
        setForm({ title: cat.title, slug: cat.slug, description: cat.description || "" });
        setShowFormModal(true);
    };

    const handleCancel = () => {
        setEditing(null);
        setForm({ title: "", slug: "", description: "" });
        setShowFormModal(false);
    };

    const handleDelete = async id => {
        const result = await Swal.fire({
            title: 'Bạn có chắc muốn xóa chuyên mục này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy',
        });
        if (result.isConfirmed) {
            setDeleteId(id);
            setShowDeleteModal(true);
        }
    };

    const confirmDelete = async () => {
        try {
            await deleteCategory(token, deleteId);
            setCategories(categories.filter(c => c._id !== deleteId));
            if (editing === deleteId) handleCancel();
            setShowDeleteModal(false);
            setDeleteId(null);
            toast.success('Đã xóa chuyên mục!');
        } catch (err) {
            toast.error('Xóa thất bại! ' + (err?.message || 'Có lỗi xảy ra.'));
        }
    };

    const handleSubmit = async e => {
        e.preventDefault();
        try {
            if (editing) {
                const updated = await updateCategory(token, editing, form);
                setCategories(categories.map(c => c._id === editing ? updated : c));
                toast.success('Đã cập nhật chuyên mục!');
            } else {
                const created = await createCategory(token, form);
                setCategories([...categories, created]);
                toast.success('Đã thêm chuyên mục!');
            }
            handleCancel();
        } catch (err) {
            toast.error('Thao tác thất bại! ' + (err?.message || 'Có lỗi xảy ra.'));
        }
    };

    return (
        <div className="container mt-4">
            <h4>Quản lý chuyên mục</h4>
            <button className="btn btn-success mb-3" onClick={() => { setEditing(null); setForm({ title: "", slug: "", description: "" }); setShowFormModal(true); }}>Thêm chuyên mục</button>
            <Table bordered responsive>
                <thead>
                    <tr>
                        <th>Tiêu đề</th>
                        <th>Slug</th>
                        <th>Mô tả</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={4}>Đang tải...</td></tr>
                    ) : categories.map(cat => (
                        <tr key={cat._id}>
                            <td>{cat.title}</td>
                            <td>{cat.slug}</td>
                            <td>{cat.description}</td>
                            <td>
                                <button className="btn btn-sm btn-warning me-2" onClick={() => handleEdit(cat)}>Sửa</button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cat._id)}>Xóa</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            {/* Modal form thêm/sửa chuyên mục */}
            <Modal show={showFormModal} onHide={handleCancel} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{editing ? "Cập nhật chuyên mục" : "Thêm chuyên mục"}</Modal.Title>
                </Modal.Header>
                <form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <div className="mb-3">
                            <label className="form-label">Tiêu đề</label>
                            <input name="title" value={form.title} onChange={handleChange} className="form-control" placeholder="Tiêu đề" required />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Slug</label>
                            <input name="slug" value={form.slug} onChange={handleChange} className="form-control" placeholder="Slug" required />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Mô tả</label>
                            <input name="description" value={form.description} onChange={handleChange} className="form-control" placeholder="Mô tả" />
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <button type="submit" className="btn btn-primary">{editing ? "Cập nhật" : "Thêm"}</button>
                        <button type="button" className="btn btn-secondary" onClick={handleCancel}>Hủy</button>
                    </Modal.Footer>
                </form>
            </Modal>
            {/* Modal xác nhận xóa chuyên mục */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Xác nhận xóa</Modal.Title>
                </Modal.Header>
                <Modal.Body>Bạn có chắc muốn xóa chuyên mục này?</Modal.Body>
                <Modal.Footer>
                    <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Hủy</button>
                    <button className="btn btn-danger" onClick={confirmDelete}>Xóa</button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
