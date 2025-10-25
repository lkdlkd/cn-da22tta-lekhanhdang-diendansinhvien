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
                        <i className="bi bi-mortarboard-fill me-2"></i> Diễn đàn Sinh Viên TVU
                    </Link>
                </div>

                <SimpleBar style={{ maxHeight: '90dvh' }} className="navbar-content mb-3">
                    <ul className="pc-navbar">

                        <li className="pc-item">
                            <Link to="/" className="pc-link" onClick={handleNavigation}>
                                <span className="pc-mtext">Trang chủ</span>
                            </Link>
                        </li>

                        <li className="pc-item">
                            <Link to="/forum" className="pc-link" onClick={handleNavigation}>
                                <span className="pc-mtext">Diễn đàn</span>
                            </Link>
                        </li>

                        {/* DANH MỤC */}
                        <li className="pc-item pc-hasmenu">
                            <a onClick={() => toggleMenu("categories")} className="pc-link d-flex justify-content-between" style={{ cursor: "pointer" }}>
                                <span className="pc-mtext">Danh mục bài viết</span>
                                {activeMenu === "categories" ? <SlArrowDown /> : <SlArrowRight />}
                            </a>

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
                                    <Link to="/login" className="pc-link" onClick={handleNavigation}><span className="pc-mtext">Đăng nhập</span></Link>
                                </li>
                                <li className="pc-item">
                                    <Link to="/register" className="pc-link" onClick={handleNavigation}><span className="pc-mtext">Đăng ký</span></Link>
                                </li>
                            </>
                        )}

                        {/* Nếu ĐÃ đăng nhập */}
                        {user && (
                            <>
                                <li className="pc-item"><Link to="/notifications" className="pc-link" onClick={handleNavigation}>Thông báo</Link></li>
                                <li className="pc-item"><Link to="/messages" className="pc-link" onClick={handleNavigation}>Tin nhắn</Link></li>
                                <li className="pc-item"><Link to="/profile" className="pc-link" onClick={handleNavigation}>Hồ sơ cá nhân</Link></li>

                                {/* ADMIN MENU */}
                                {user.role === "admin" && (
                                    <li className="pc-item pc-hasmenu">
                                        <a onClick={() => toggleMenu("admin")} className="pc-link d-flex justify-content-between" style={{ cursor: "pointer" }}>
                                            <span className="pc-mtext text-danger">Quản trị</span>
                                            {activeMenu === "admin" ? <SlArrowDown /> : <SlArrowRight />}
                                        </a>
                                        {activeMenu === "admin" && (
                                            <ul className="pc-submenu">
                                                <li className="pc-item"><Link to="/admin/users" className="pc-link" onClick={handleNavigation}>Quản lý thành viên</Link></li>
                                                <li className="pc-item"><Link to="/admin/posts" className="pc-link" onClick={handleNavigation}>Quản lý bài viết</Link></li>
                                                <li className="pc-item"><Link to="/admin/categories" className="pc-link" onClick={handleNavigation}>Quản lý danh mục</Link></li>
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
                                }><Link to="/login" className="pc-link" onClick={handleNavigation}>Đăng xuất</Link></li>
                            </>
                        )}
                    </ul>
                </SimpleBar>
            </div>
        </nav>
    );
}

export default Menu;
