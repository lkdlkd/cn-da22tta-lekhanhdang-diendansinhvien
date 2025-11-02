
import React, { useEffect, useState } from 'react';
import Header from './Header';
import Menu from './Menu';
import { getProfile, getCategories, getFeaturedPosts, getAllPosts, getActiveUsers, getDocuments } from '../Utils/api';
import { Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { setUserOnline, onUserStatusChanged, offUserStatusChanged } from '../Utils/socket';
// Lấy tài liệu mới nhất từ API thực

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
        let mounted = true;
        const load = async () => {
            try {
                const [userData, categoriesData, usersData] = await Promise.all([
                    getProfile(token),
                    getCategories(),
                    getActiveUsers(5),
                ]);

                if (!mounted) return;
                setUser(userData.user);
                setCategories(categoriesData);
                setActiveUsers(usersData.users || []);

                // Lấy 6 tài liệu mới nhất (cần token)
                try {
                    if (token) {
                        const docsRes = await getDocuments(token, { page: 1, limit: 6 });
                        const latest = Array.isArray(docsRes?.data) ? docsRes.data : [];
                        setDocuments(latest);
                    } else {
                        setDocuments([]);
                    }
                } catch (e) {
                    setDocuments([]);
                }

                setLoading(false);

                // ✅ Emit user online sau khi load xong profile
                if (userData.user) {
                    const userId = userData.user.id || userData.user._id;
                    if (userId) {
                        setUserOnline(userId);
                    }
                }
            } catch (error) {
                if (!mounted) return;
                setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
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
            <Menu categories={categories} user={user} />
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
