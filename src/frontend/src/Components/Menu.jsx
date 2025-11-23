import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import { SlArrowRight, SlArrowDown } from "react-icons/sl";

function Menu({ user, categories }) {
    const navigate = useNavigate();
    const [activeMenu, setActiveMenu] = useState(null);

    const toggleMenu = (menuName) => {
        setActiveMenu(prev => prev === menuName ? null : menuName);
    };

    const closeSidebar = () => {
        const sidebar = document.querySelector(".pc-sidebar");
        if (sidebar?.classList.contains("open")) {
            sidebar.classList.remove("open");
            document.body.classList.remove("pc-sidebar-collapse");
        }
    };

    const handleNavigation = () => closeSidebar();

    return (
        <nav className="pc-sidebar">
            <div className="navbar-wrapper">
                <div className="m-header">
                    <Link to="/" className="b-brand text-primary">
                        <i className="ph-duotone ph-graduation-cap me-2" style={{ fontSize: '24px' }}></i>
                        <span className="fw-bold">Diễn đàn TVU</span>
                    </Link>
                </div>

                <SimpleBar style={{ maxHeight: '90dvh' }} className="navbar-content mb-3">
                    <ul className="pc-navbar">

                        <li className="pc-item">
                            <Link to="/" className="pc-link" onClick={handleNavigation}>
                                <span className="pc-micon"><i className="ph-duotone ph-house"></i></span>
                                <span className="pc-mtext">Trang chủ</span>
                            </Link>
                        </li>

                        <li className="pc-item">
                            <Link to="/forum" className="pc-link" onClick={handleNavigation}>
                                <span className="pc-micon"><i className="ph-duotone ph-chats-circle"></i></span>
                                <span className="pc-mtext">Diễn đàn</span>
                            </Link>
                        </li>

                        <li className="pc-item">
                            <Link to="/documents" className="pc-link" onClick={handleNavigation}>
                                <span className="pc-micon"><i className="ph-duotone ph-folder-open"></i></span>
                                <span className="pc-mtext">Tài liệu</span>
                            </Link>
                        </li>

                        {/* DANH MỤC */}
                        <li className="pc-item pc-hasmenu">
                            <Link onClick={() => toggleMenu("categories")} className="pc-link d-flex justify-content-between align-items-center" style={{ cursor: "pointer" }}>
                                <div className="d-flex align-items-center">
                                    <span className="pc-micon"><i className="ph-duotone ph-folders"></i></span>
                                    <span className="pc-mtext">Danh mục bài viết</span>
                                </div>
                                {activeMenu === "categories" ? <SlArrowDown /> : <SlArrowRight />}
                            </Link>

                            {activeMenu === "categories" && categories?.length > 0 && (
                                <ul className="pc-submenu">
                                    {categories.map(cat => (
                                        <li key={cat._id} className="pc-item">
                                            <Link to={`/category/${cat.slug?.toLowerCase() || cat._id}`} className="pc-link" onClick={handleNavigation}>
                                                {cat.title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>

                        {/* Nếu CHƯA đăng nhập */}
                        {!user && (
                            <>
                                <li className="pc-item">
                                    <Link to="/login" className="pc-link" onClick={handleNavigation}>
                                        <span className="pc-micon"><i className="ph-duotone ph-sign-in"></i></span>
                                        <span className="pc-mtext">Đăng nhập</span>
                                    </Link>
                                </li>
                                <li className="pc-item">
                                    <Link to="/register" className="pc-link" onClick={handleNavigation}>
                                        <span className="pc-micon"><i className="ph-duotone ph-user-plus"></i></span>
                                        <span className="pc-mtext">Đăng ký</span>
                                    </Link>
                                </li>
                            </>
                        )}

                        {/* Nếu ĐÃ đăng nhập */}
                        {user && (
                            <>
                                <li className="pc-item">
                                    <Link to="/notifications" className="pc-link" onClick={handleNavigation}>
                                        <span className="pc-micon"><i className="ph-duotone ph-bell"></i></span>
                                        <span className="pc-mtext">Thông báo</span>
                                    </Link>
                                </li>
                                <li className="pc-item">
                                    <Link to="/messages" className="pc-link" onClick={handleNavigation}>
                                        <span className="pc-micon"><i className="ph-duotone ph-chats"></i></span>
                                        <span className="pc-mtext">Tin nhắn</span>
                                    </Link>
                                </li>
                                <li className="pc-item">
                                    <Link to={`/user/${user.username}`} className="pc-link" onClick={handleNavigation}>
                                        <span className="pc-micon"><i className="ph-duotone ph-user-circle"></i></span>
                                        <span className="pc-mtext">Hồ sơ cá nhân</span>
                                    </Link>
                                </li>
                                <li className="pc-item">
                                    <Link to="/my-reports" className="pc-link" onClick={handleNavigation}>
                                        <span className="pc-micon"><i className="ph-duotone ph-warning-circle"></i></span>
                                        <span className="pc-mtext">Báo cáo của tôi</span>
                                    </Link>
                                </li>
                                {(user?.role === 'mod' || user?.role === 'admin') && (
                                    <li className="pc-item">
                                        <Link to="/mod/dashboard" className="pc-link" onClick={handleNavigation}>
                                            <span className="pc-micon"><i className="ph-duotone ph-shield-check"></i></span>
                                            <span className="pc-mtext">Quản lý duyệt bài</span>
                                        </Link>
                                    </li>
                                )}
                                {/* ADMIN MENU */}
                                {user.role === "admin" && (
                                    <li className="pc-item pc-hasmenu">
                                        <Link onClick={() => toggleMenu("admin")} className="pc-link d-flex justify-content-between align-items-center" style={{ cursor: "pointer" }}>
                                            <div className="d-flex align-items-center">
                                                <span className="pc-micon"><i className="ph-duotone ph-shield-check text-danger"></i></span>
                                                <span className="pc-mtext text-danger fw-bold">Quản trị</span>
                                            </div>
                                            {activeMenu === "admin" ? <SlArrowDown /> : <SlArrowRight />}
                                        </Link>
                                        {activeMenu === "admin" && (
                                            <ul className="pc-submenu">
                                                <li className="pc-item"><Link to="/admin/users" className="pc-link" onClick={handleNavigation}>Quản lý thành viên</Link></li>
                                                <li className="pc-item"><Link to="/admin/posts" className="pc-link" onClick={handleNavigation}>Quản lý bài viết</Link></li>
                                                <li className="pc-item"><Link to="/admin/categories" className="pc-link" onClick={handleNavigation}>Quản lý danh mục</Link></li>
                                                <li className="pc-item"><Link to="/admin/notifications-management" className="pc-link" onClick={handleNavigation}>Quản lý thông báo</Link></li>
                                                <li className="pc-item"><Link to="/admin/comments" className="pc-link" onClick={handleNavigation}>Quản lý bình luận</Link></li>
                                                <li className="pc-item"><Link to="/admin/reports" className="pc-link" onClick={handleNavigation}>Xử lý báo cáo</Link></li>
                                            </ul>
                                        )}
                                    </li>
                                )}

                                <li className="pc-item" onClick={
                                    () => {
                                        localStorage.removeItem("token");
                                        window.location.reload();
                                    }
                                }>
                                    <Link to="/login" className="pc-link" onClick={handleNavigation}>
                                        <span className="pc-micon"><i className="ph-duotone ph-sign-out"></i></span>
                                        <span className="pc-mtext">Đăng xuất</span>
                                    </Link>
                                </li>
                            </>
                        )}
                    </ul>
                </SimpleBar>
            </div>
        </nav>
    );
}

export default Menu;
