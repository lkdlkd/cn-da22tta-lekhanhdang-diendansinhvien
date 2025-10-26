
import React, { useEffect, useState } from 'react';
import Header from './Header';
import Menu from './Menu';
import { getProfile, getCategories, getFeaturedPosts,getAllPosts } from '../Utils/api';
import { Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
// Fake API lấy thông tin user




// Fake API lấy thành viên tích cực
function fetchActiveUsers() {
    return Promise.resolve([
        { name: 'Nguyễn Văn Nam', avatar: 'https://via.placeholder.com/40', posts: 25 },
        { name: 'Trần Thị Mai', avatar: 'https://via.placeholder.com/40', posts: 18 },
        { name: 'Lê Quốc Bảo', avatar: 'https://via.placeholder.com/40', posts: 15 },
    ]);
}

// Fake API lấy tài liệu mới
function fetchDocuments() {
    return Promise.resolve([
        { title: 'Đề cương ôn tập KTPM', url: '#' },
        { title: 'Slide bài giảng Marketing', url: '#' },
        { title: 'Tài liệu học tiếng Anh', url: '#' },
    ]);
}

export default function Layout({ children }) {
    const [user, setUser] = useState(null);
    const [categories, setCategories] = useState([]);
    const [featuredPosts, setFeaturedPosts] = useState([]);
    const [activeUsers, setActiveUsers] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [allPosts, setAllPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");

    useEffect(() => {
        Promise.all([
            getProfile(token),
            getCategories(),
            getFeaturedPosts(),
            fetchActiveUsers(),
            fetchDocuments()
        ]).then(([userData, categoriesData, postsData, usersData, docsData]) => {
            setUser(userData.user);
            setCategories(categoriesData);
            setFeaturedPosts(postsData);
            setActiveUsers(usersData);
            setDocuments(docsData);
            setLoading(false);
        });
    }, []);

    return (
        <>
            <Header user={user} />
            <Menu categories={categories} user={user}  />
            <div className="pc-container">
                <div className="pc-content">
                    {/* Truyền dữ liệu qua Outlet */}
                    <Outlet context={{ user, categories, featuredPosts, activeUsers, documents }} />
                </div>
            </div>
            <footer className="pc-footer">
                <div className="footer-wrapper container-fluid">
                    <div className="row">
                        <div className="col-sm-6 my-1">
                            <strong>
                                <p className="m-0 text-muted">
                                    Copyright © {new Date().getFullYear()}. <a target="_blank"> - Diễn đàn Sinh Viên TVU</a> 
                                </p>
                            </strong>
                        </div>
                    </div>
                </div>
            </footer>
            <ToastContainer style={{ maxWidth: '70%', marginLeft: 'auto', marginRight: '0px' }} />
            {/* <Navbar user={user} loading={loading} />
            
            <Footer /> */}
        </>
    );
}
