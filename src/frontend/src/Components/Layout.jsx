
import React, { useEffect, useState } from 'react';
import Header from './Header';
import Menu from './Menu';
import { getProfile, getCategories, getFeaturedPosts, getAllPosts, getActiveUsers } from '../Utils/api';
import { Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { setUserOnline, onUserStatusChanged, offUserStatusChanged } from '../Utils/socket';
// Fake API lấy thông tin user




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
    // const [featuredPosts, setFeaturedPosts] = useState([]);
    const [activeUsers, setActiveUsers] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [allPosts, setAllPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");

    useEffect(() => {
        Promise.all([
            getProfile(token),
            getCategories(),
            // getFeaturedPosts(),
            getActiveUsers(5),
            fetchDocuments()
        ]).then(([userData, categoriesData, postsData, usersData, docsData]) => {
            setUser(userData.user);
            setCategories(categoriesData);
            // setFeaturedPosts(postsData);
            setActiveUsers(usersData.users || []);
            setDocuments(docsData);
            setLoading(false);
            
            // ✅ Emit user online sau khi load xong profile
            if (userData.user) {
                const userId = userData.user.id || userData.user._id;
                if (userId) {
                    setUserOnline(userId);
                } else {
                    
                }
            }
        }).catch(error => {
            setLoading(false);
        });
    }, []);

    // ✅ Listen cho user status changes để update UI realtime
    useEffect(() => {
        const handleUserStatusChanged = ({ userId, isOnline, lastSeen }) => {
            
            // Cập nhật activeUsers list
            setActiveUsers(prevUsers => {
                const updated = prevUsers.map(u => 
                    u._id === userId 
                        ? { ...u, isOnline, lastSeen }
                        : u
                );
                return updated;
            });
        };

        onUserStatusChanged(handleUserStatusChanged);

        return () => {
            offUserStatusChanged(handleUserStatusChanged);
        };
    }, []);

    return (
        <>
            <Header user={user} />
            <Menu categories={categories} user={user}  />
            <div className="pc-container">
                <div className="pc-content">
                    {/* Truyền dữ liệu qua Outlet */}
                    <Outlet context={{ user, categories, activeUsers, documents }} />
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
