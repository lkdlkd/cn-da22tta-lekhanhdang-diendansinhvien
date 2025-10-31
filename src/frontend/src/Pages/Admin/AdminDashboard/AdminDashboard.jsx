import React, { useEffect, useState } from "react";
import { getAllUsers, getAllPosts, getCategories, deleteUser } from "../../../Utils/api";
import CategoryDashboard from "./CategoryDashboard";
import { Link } from "react-router-dom";
export default function AdminDashboard() {
    const [stats, setStats] = useState({
        usersCount: 0,
        postsCount: 0,
        categoriesCount: 0,
        reportsCount: 12
    });
    const [users, setUsers] = useState([]);
    const [posts, setPosts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('dashboard');
    const token = localStorage.getItem('token');

    useEffect(() => {
        Promise.all([
            getAllUsers(token),
            getAllPosts(),
            getCategories()
        ]).then(([usersData, postsData, categoriesData]) => {
            setUsers(usersData.users);
            setPosts(postsData);
            setCategories(categoriesData);
            setStats({
                usersCount: usersData.users.length,
                postsCount: postsData.posts.length,
                categoriesCount: categoriesData.categories.length,
                reportsCount: 12
            });
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [token]);

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Xác nhận xóa user này?')) {
            await deleteUser(token, userId);
            setUsers(users.filter(u => u._id !== userId));
            setStats(prev => ({ ...prev, usersCount: prev.usersCount - 1 }));
        }
    };

    return (
        <div className="admin-dashboard-wrapper" style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
            {/* Sidebar */}
            <aside className="admin-sidebar" style={{ width: 280, background: "#fff", boxShadow: "2px 0 4px rgba(0,0,0,0.07)", minHeight: "100vh" }}>
                <div className="sidebar-header p-4 border-bottom">
                    <h5 className="mb-0 text-primary">
                        <i className="bi bi-shield-check me-2"></i>
                        Quản trị viên
                    </h5>
                    <small className="text-muted">Bảng điều khiển</small>
                </div>
                <nav className="sidebar-nav mt-3">
                    <ul className="nav flex-column" style={{ listStyle: "none", padding: 0 }}>
                        <li className="nav-item" style={{ marginBottom: "0.25rem" }}>
                            <button className={`nav-link ${tab === 'dashboard' ? 'active' : ''}`} style={{ color: tab === 'dashboard' ? '#fff' : '#6b7280', background: tab === 'dashboard' ? '#4f46e5' : '', padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", textDecoration: "none", transition: "all 0.2s", border: 'none', width: '100%' }} onClick={() => setTab('dashboard')}>
                                <i className="bi bi-speedometer2" style={{ width: "20px", marginRight: "0.75rem" }}></i> Tổng quan
                            </button>
                        </li>
                        <li className="nav-item" style={{ marginBottom: "0.25rem" }}>
                            <button className={`nav-link ${tab === 'categories' ? 'active' : ''}`} style={{ color: tab === 'categories' ? '#fff' : '#6b7280', background: tab === 'categories' ? '#4f46e5' : '', padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", textDecoration: "none", transition: "all 0.2s", border: 'none', width: '100%' }} onClick={() => setTab('categories')}>
                                <i className="bi bi-folder" style={{ width: "20px", marginRight: "0.75rem" }}></i> Quản lý chuyên mục
                            </button>
                        </li>
                        {/* ...other nav items... */}
                    </ul>
                </nav>
                <div className="p-3 border-top">
                    <Link to="/" className="btn btn-outline-primary w-100">
                        <i className="bi bi-arrow-left me-2"></i>Về trang chính
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main" style={{ flex: 1, marginLeft: 280 }}>
                {/* Top Navigation */}
                <div className="admin-navbar d-flex justify-content-between align-items-center p-4 border-bottom bg-white">
                    <div className="d-flex align-items-center">
                        <h4 className="mb-0">Bảng điều khiển quản trị</h4>
                    </div>
                    <div className="d-flex align-items-center">
                        {/* Notifications */}
                        <button className="btn btn-link position-relative p-2">
                            <i className="bi bi-bell fs-5"></i>
                            <span className="notification-badge" style={{ position: "absolute", top: 2, right: 2, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
                        </button>
                        {/* Admin Profile */}
                        <div className="ms-3 d-flex align-items-center">
                            <img src="https://via.placeholder.com/32" alt="avatar" className="rounded-circle me-2" />
                            <span className="fw-semibold">Admin</span>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-4">
                    {/* Stats Cards */}
                    <div className="row mb-4">
                        <div className="col-md-3 mb-3">
                                <div className="stats-card d-flex align-items-center" style={{ background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e5e7eb", transition: "transform 0.2s" }}>
                                    <div className="stats-icon primary d-flex align-items-center justify-content-center me-3" style={{ background: "#4f46e5", width: "48px", height: "48px", borderRadius: "12px", fontSize: "1.5rem", color: "white" }}>
                                        <i className="bi bi-people"></i>
                                    </div>
                                <div>
                                    <div className="fw-bold fs-5">{loading ? "..." : stats.usersCount}</div>
                                    <div className="text-muted">Người dùng</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3 mb-3">
                            <div className="stats-card d-flex align-items-center" style={{ background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e5e7eb", transition: "transform 0.2s" }}>
                                <div className="stats-icon success d-flex align-items-center justify-content-center me-3" style={{ background: "#10b981", width: "48px", height: "48px", borderRadius: "12px", fontSize: "1.5rem", color: "white" }}>
                                    <i className="bi bi-file-earmark-text"></i>
                                </div>
                                <div>
                                    <div className="fw-bold fs-5">{loading ? "..." : stats.postsCount}</div>
                                    <div className="text-muted">Bài viết</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3 mb-3">
                            <div className="stats-card d-flex align-items-center" style={{ background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e5e7eb", transition: "transform 0.2s" }}>
                                <div className="stats-icon warning d-flex align-items-center justify-content-center me-3" style={{ background: "#f59e0b", width: "48px", height: "48px", borderRadius: "12px", fontSize: "1.5rem", color: "white" }}>
                                    <i className="bi bi-folder"></i>
                                </div>
                                <div>
                                    <div className="fw-bold fs-5">{loading ? "..." : stats.categoriesCount}</div>
                                    <div className="text-muted">Chuyên mục</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3 mb-3">
                            <div className="stats-card d-flex align-items-center" style={{ background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e5e7eb", transition: "transform 0.2s" }}>
                                <div className="stats-icon danger d-flex align-items-center justify-content-center me-3" style={{ background: "#ef4444", width: "48px", height: "48px", borderRadius: "12px", fontSize: "1.5rem", color: "white" }}>
                                    <i className="bi bi-flag"></i>
                                </div>
                                <div>
                                    <div className="fw-bold fs-5">{stats.reportsCount}</div>
                                    <div className="text-muted">Báo cáo</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Users Table */}
                    <div className="p-4">
                        {tab === 'dashboard' && (
                            <>
                                {/* Stats Cards */}
                                <div className="row mb-4">
                                    {/* ...existing code... */}
                                </div>
                                {/* Recent Users Table */}
                                <div className="card mb-4">
                                    {/* ...existing code... */}
                                </div>
                                {/* Recent Posts Table */}
                                <div className="card mb-4">
                                    {/* ...existing code... */}
                                </div>
                                {/* Welcome message */}
                                <div className="card p-4 mb-4">
                                    <h5 className="mb-2">Chào mừng bạn đến với bảng điều khiển quản trị.</h5>
                                    <p className="mb-0">Ở đây bạn có thể quản lý tất cả các khía cạnh của ứng dụng.</p>
                                </div>
                            </>
                        )}
                        {tab === 'categories' && <CategoryDashboard />}
                    </div>
                </div>
            </main>
        </div>
    );
}