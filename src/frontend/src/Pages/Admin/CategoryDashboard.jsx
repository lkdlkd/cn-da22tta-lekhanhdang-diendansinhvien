import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Modal from "react-bootstrap/Modal";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Pagination from "react-bootstrap/Pagination";
import { toast } from "react-toastify";
import {
    getCategoriesStats,
    createCategory,
    updateCategory,
    deleteCategory,
    deleteMultipleCategories,
    searchCategories
} from "../../Utils/api";
import LoadingPost from "@/Components/LoadingPost";

export default function CategoryDashboard() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ title: "", slug: "", description: "" });
    const [showFormModal, setShowFormModal] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [stats, setStats] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
    const token = localStorage.getItem("token");

    // Fetch categories with stats
    const fetchCategories = async () => {
        setLoading(true);
        try {
            // Luôn dùng searchCategories để có phân trang; khi không có keyword vẫn trả về đầy đủ theo page/limit
            const result = await searchCategories(token, searchKeyword || "", pagination.page, pagination.limit);
            setCategories(result.data || []);
            if (result.pagination) setPagination(result.pagination);
        } catch (err) {
            toast.error("Lỗi khi tải danh sách danh mục");
        }
        setLoading(false);
    };

    const fetchStats = async () => {
        try {
            const data = await getCategoriesStats(token);
            setStats(data.stats);
        } catch (err) {
            console.error("Lỗi khi tải thống kê danh mục");
        }
    };

    useEffect(() => {
        fetchCategories();
        fetchStats();
        // eslint-disable-next-line
    }, []);

    // Search categories
    const handleSearch = async () => {
        // Áp dụng tìm kiếm theo submit; reset về trang 1
        setSelectedCategories([]);
        setPagination(prev => ({ ...prev, page: 1 }));
        // Gọi fetchCategories sau khi setState, hoặc đơn giản gọi luôn vì fetchCategories đọc từ state hiện tại
        // Nhưng để chắc chắn, gọi sau một microtick
        setTimeout(fetchCategories, 0);
    };

    const goToPage = (page) => {
        if (page < 1 || page > pagination.pages) return;
        setSelectedCategories([]);
        setPagination(prev => ({ ...prev, page }));
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
        <div className="">
            <h2 className="mb-2">Quản lý danh mục</h2>
            {stats && (
                <div className="row mb-2">
                    <div className="col-md-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <h6 className="mb-1">Tổng danh mục</h6>
                                <h3>{stats.totalCategories || 0}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <h6 className="mb-1">Danh mục có bài viết</h6>
                                <h3 className="text-success">{stats.categoriesWithPosts || 0}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <h6 className="mb-1">Danh mục trống</h6>
                                <h3 className="text-warning">{stats.emptyCategories || 0}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <h6 className="mb-1">Tổng bài viết</h6>
                                <h3 className="text-primary">{stats.totalPosts || 0}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search and Actions */}
            <div className="row mb-2">
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
                    {/* Summary and page size */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <small className="text-muted">
                            Hiển thị {categories.length} / {pagination.total} danh mục
                        </small>
                        <div className="d-flex align-items-center">
                            <span className="me-2">Mỗi trang:</span>
                            <Form.Select
                                size="sm"
                                style={{ width: 100 }}
                                value={pagination.limit}
                                onChange={(e) => {
                                    const newLimit = Number(e.target.value) || 20;
                                    setSelectedCategories([]);
                                    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
                                }}
                            >
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </Form.Select>
                        </div>
                    </div>
                    {stats?.topCategories?.length > 0 && (
                        <div className="mb-3">
                            <h6 className="mb-2">Top danh mục theo số bài viết</h6>
                            <div className="d-flex flex-wrap" style={{ gap: '8px' }}>
                                {stats.topCategories.map(tc => (
                                    <span key={tc.categoryId} className="badge bg-light text-dark border">
                                        {tc.title} <span className="text-muted">({tc.postCount})</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
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
                                <th>Thao tác</th>
                                <th>Tiêu đề</th>
                                <th>Đường dẫn</th>
                                <th>Mô tả</th>
                                <th>Số bài viết</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="text-center">
                                    <LoadingPost count={5} />
                                </td></tr>
                            ) : categories.length === 0 ? (
                                <tr><td colSpan={8} className="text-center">Không có danh mục nào</td></tr>
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
                                    <td>
                                        <div className="dropdown">
                                            <button
                                                className="btn btn-primary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            >
                                                Thao tác <i className="bi bi-chevron-down ms-1"></i>
                                            </button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <button
                                                        className="dropdown-item"
                                                        onClick={() => handleEdit(cat)}
                                                    >
                                                        <i className="bi bi-pencil me-2 text-warning"></i>
                                                        Sửa
                                                    </button>
                                                </li>
                                                <li><hr className="dropdown-divider" /></li>
                                                <li>
                                                    <button
                                                        className="dropdown-item text-danger"
                                                        onClick={() => handleDelete(cat._id)}
                                                    >
                                                        <i className="bi bi-trash me-2"></i>
                                                        Xóa
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                    </td>
                                    <td>{cat.title}</td>
                                    <td>{cat.slug}</td>
                                    <td>{cat.description}</td>
                                    <td>
                                        <span className="badge bg-primary">{cat.postCount || 0}</span>
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="d-flex justify-content-center mt-3">
                    <Pagination>
                        <Pagination.First onClick={() => goToPage(1)} disabled={pagination.page === 1} />
                        <Pagination.Prev onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page === 1} />
                        {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                            <Pagination.Item key={p} active={p === pagination.page} onClick={() => goToPage(p)}>
                                {p}
                            </Pagination.Item>
                        ))}
                        <Pagination.Next onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page === pagination.pages} />
                        <Pagination.Last onClick={() => goToPage(pagination.pages)} disabled={pagination.page === pagination.pages} />
                    </Pagination>
                </div>
            )}
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
                            <label className="form-label">Đường dẫn</label>
                            <input name="slug" value={form.slug} onChange={handleChange} className="form-control" placeholder="Đường dẫn" required />
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
