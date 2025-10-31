import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Modal from "react-bootstrap/Modal";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import { toast } from "react-toastify";
import { 
    getAllCategoriesWithStats, 
    createCategory, 
    updateCategory, 
    deleteCategory,
    deleteMultipleCategories,
    searchCategories
} from "../../../Utils/api";

export default function CategoryDashboard() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ title: "", slug: "", description: "" });
    const [showFormModal, setShowFormModal] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState("");
    const token = localStorage.getItem("token");

    // Fetch categories with stats
    const fetchCategories = async () => {
        setLoading(true);
        try {
            const data = await getAllCategoriesWithStats(token);
            setCategories(data.data || []);
        } catch (err) {
            toast.error("Lỗi khi tải danh sách danh mục");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCategories();
        // eslint-disable-next-line
    }, []);
    
    // Search categories
    const handleSearch = async () => {
        if (!searchKeyword) {
            fetchCategories();
            return;
        }
        
        setLoading(true);
        try {
            const data = await searchCategories(token, searchKeyword);
            setCategories(data.data || []);
        } catch (err) {
            toast.error("Lỗi khi tìm kiếm danh mục");
        }
        setLoading(false);
    };
    
    // Select all categories
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedCategories(categories.map(c => c._id));
        } else {
            setSelectedCategories([]);
        }
    };
    
    // Select single category
    const handleSelectCategory = (categoryId) => {
        if (selectedCategories.includes(categoryId)) {
            setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
        } else {
            setSelectedCategories([...selectedCategories, categoryId]);
        }
    };

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
        const category = categories.find(c => c._id === id);
        
        if (category && category.postCount > 0) {
            toast.warning(`Không thể xóa! Có ${category.postCount} bài viết đang sử dụng danh mục này.`);
            return;
        }
        
        const result = await Swal.fire({
            title: 'Bạn có chắc muốn xóa danh mục này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy',
            customClass: { container: 'swal-on-modal' }
        });
        
        if (result.isConfirmed) {
            try {
                await deleteCategory(token, id);
                setCategories(categories.filter(c => c._id !== id));
                if (editing === id) handleCancel();
                toast.success('Đã xóa danh mục!');
            } catch (err) {
                toast.error('Xóa thất bại! ' + (err?.message || 'Có lỗi xảy ra.'));
            }
        }
    };
    
    // Bulk delete categories
    const handleBulkDelete = async () => {
        if (selectedCategories.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một danh mục");
            return;
        }
        
        // Check if any selected category has posts
        const categoriesWithPosts = categories.filter(c => 
            selectedCategories.includes(c._id) && c.postCount > 0
        );
        
        if (categoriesWithPosts.length > 0) {
            const totalPosts = categoriesWithPosts.reduce((sum, c) => sum + c.postCount, 0);
            toast.warning(`Không thể xóa! Có ${totalPosts} bài viết đang sử dụng các danh mục đã chọn.`);
            return;
        }
        
        const result = await Swal.fire({
            title: "Xác nhận",
            text: `Xóa ${selectedCategories.length} danh mục đã chọn?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Xóa",
            cancelButtonText: "Hủy",
            customClass: { container: 'swal-on-modal' }
        });
        
        if (result.isConfirmed) {
            try {
                await deleteMultipleCategories(token, selectedCategories);
                toast.success("Xóa danh mục thành công!");
                setSelectedCategories([]);
                fetchCategories();
            } catch (err) {
                toast.error(`Lỗi: ${err.message}`);
            }
        }
    };

    const handleSubmit = async e => {
        e.preventDefault();
        try {
            if (editing) {
                const result = await updateCategory(token, editing, form);
                toast.success('Đã cập nhật danh mục!');
                fetchCategories();
            } else {
                const result = await createCategory(token, form);
                toast.success('Đã thêm danh mục!');
                fetchCategories();
            }
            handleCancel();
        } catch (err) {
            toast.error('Thao tác thất bại! ' + (err?.message || 'Có lỗi xảy ra.'));
        }
    };

    return (
        <div className="container-fluid p-4">
            <h2 className="mb-4">Quản lý danh mục</h2>
            
            {/* Search and Actions */}
            <div className="row mb-4">
                <div className="col-md-6">
                    <div className="input-group">
                        <Form.Control
                            type="text"
                            placeholder="Tìm kiếm danh mục..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button className="btn btn-primary" onClick={handleSearch}>
                            Tìm kiếm
                        </button>
                        {searchKeyword && (
                            <button className="btn btn-secondary" onClick={() => {
                                setSearchKeyword("");
                                fetchCategories();
                            }}>
                                Xóa lọc
                            </button>
                        )}
                    </div>
                </div>
                <div className="col-md-6 text-end">
                    <button className="btn btn-success" onClick={() => { 
                        setEditing(null); 
                        setForm({ title: "", slug: "", description: "" }); 
                        setShowFormModal(true); 
                    }}>
                        Thêm danh mục
                    </button>
                </div>
            </div>
            
            {/* Bulk actions */}
            {selectedCategories.length > 0 && (
                <div className="alert alert-info d-flex justify-content-between align-items-center">
                    <span>Đã chọn {selectedCategories.length} danh mục</span>
                    <div>
                        <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                            Xóa tất cả
                        </button>
                    </div>
                </div>
            )}
            
            {/* Table */}
            <div className="card">
                <div className="card-body">
                    <Table bordered responsive striped hover>
                        <thead>
                            <tr>
                                <th>
                                    <Form.Check 
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={selectedCategories.length === categories.length && categories.length > 0}
                                    />
                                </th>
                                <th>STT</th>
                                <th>Tiêu đề</th>
                                <th>Slug</th>
                                <th>Mô tả</th>
                                <th>Số bài viết</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center">
                                    <div className="spinner-border" role="status">
                                        <span className="visually-hidden">Đang tải...</span>
                                    </div>
                                </td></tr>
                            ) : categories.length === 0 ? (
                                <tr><td colSpan={7} className="text-center">Không có danh mục nào</td></tr>
                            ) : categories.map((cat, idx) => (
                                <tr key={cat._id}>
                                    <td>
                                        <Form.Check 
                                            type="checkbox"
                                            checked={selectedCategories.includes(cat._id)}
                                            onChange={() => handleSelectCategory(cat._id)}
                                        />
                                    </td>
                                    <td>{idx + 1}</td>
                                    <td>{cat.title}</td>
                                    <td>{cat.slug}</td>
                                    <td>{cat.description}</td>
                                    <td>
                                        <span className="badge bg-primary">{cat.postCount || 0}</span>
                                    </td>
                                    <td>
                                        <button className="btn btn-sm btn-warning me-2" onClick={() => handleEdit(cat)}>Sửa</button>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cat._id)}>Xóa</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            </div>
            {/* Modal form thêm/sửa chuyên mục */}
            <Modal show={showFormModal} onHide={handleCancel} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{editing ? "Cập nhật danh mục" : "Thêm danh mục"}</Modal.Title>
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
                            <textarea name="description" value={form.description} onChange={handleChange} className="form-control" placeholder="Mô tả" rows="3" />
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <button type="submit" className="btn btn-primary">{editing ? "Cập nhật" : "Thêm"}</button>
                        <button type="button" className="btn btn-secondary" onClick={handleCancel}>Hủy</button>
                    </Modal.Footer>
                </form>
            </Modal>
        </div>
    );
}
