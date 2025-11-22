import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../Context/AuthContext';
import { getPendingPosts, approvePost, rejectPost, getModerationStats } from '../../Utils/api';
import { useNavigate } from 'react-router-dom';
import { toast } from "react-toastify";
import LoadingPost from '@/Components/LoadingPost';
import swal from 'sweetalert2';
const ModerationDashboard = () => {
    const { auth } = useContext(AuthContext);
    const navigate = useNavigate();
    const user = auth;
    const token = auth?.token;
    const [pendingPosts, setPendingPosts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);

    // Check quyền MOD/ADMIN
    useEffect(() => {
        if (!user || (user.role !== 'mod' && user.role !== 'admin')) {
            toast.error('Bạn không có quyền truy cập trang này');
            navigate('/');
        }
    }, [user, navigate]);

    // Load danh sách bài viết chờ duyệt
    const loadPendingPosts = async () => {
        try {
            setLoading(true);
            const data = await getPendingPosts(token);
            if (data.success) {
                setPendingPosts(data.data);
            }
        } catch (error) {
            console.error('Error loading pending posts:', error);
            toast.error('Không thể tải danh sách bài viết');
        } finally {
            setLoading(false);
        }
    };

    // Load thống kê
    const loadStats = async () => {
        try {
            const data = await getModerationStats(token);
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            toast.error('Không thể tải thống kê');
        }
    };

    useEffect(() => {
        if (token && user && (user.role === 'mod' || user.role === 'admin')) {
            loadPendingPosts();
            loadStats();
        }
    }, [token, user]);

    // Duyệt bài viết
    const handleApprove = async (postId) => {
        swal.fire({
            title: 'Xác nhận duyệt bài',
            text: 'Bạn có chắc muốn duyệt bài viết này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Duyệt',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const data = await approvePost(token, postId);
                    if (data.success) {
                        toast.success('Đã duyệt bài viết thành công!');
                        loadPendingPosts();
                        loadStats();
                    } else {
                        toast.error(data.error || 'Có lỗi xảy ra');
                    }
                } catch (error) {
                    console.error('Error approving post:', error);
                    toast.error('Không thể duyệt bài viết');
                }
            }
        });
    };

    // Mở modal từ chối
    const openRejectModal = (post) => {
        setSelectedPost(post);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    // Từ chối bài viết
    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast.error('Vui lòng nhập lý do từ chối');
            return;
        }

        try {
            const data = await rejectPost(token, selectedPost._id, rejectionReason);
            if (data.success) {
                toast.success('Đã từ chối bài viết');
                setShowRejectModal(false);
                setSelectedPost(null);
                setRejectionReason('');
                loadPendingPosts();
                loadStats();
            } else {
                toast.error(data.error || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Error rejecting post:', error);
            toast.error('Không thể từ chối bài viết');
        }
    };

    if (loading) {
        return (
            <LoadingPost />
        );
    }

    return (
        <div className="container-fluid py-4">
            {/* Header */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center border-bottom pb-3">
                        <h1 className="h2 mb-0 d-flex align-items-center">
                            <i className="ph-shield-check me-3" style={{ fontSize: '2rem', color: '#8b5cf6' }}></i>
                            Quản lý duyệt bài
                        </h1>
                        <span className="badge rounded-pill px-3 py-2"
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                fontSize: '0.9rem',
                                color: 'white'
                            }}>
                            {user?.role === 'admin' ? 'ADMIN' : 'MOD'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="row g-3 mb-4">
                    <div className="col-md-6 col-lg-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="flex-shrink-0">
                                        <i className="ph-clock" style={{ fontSize: '2.5rem', color: '#f59e0b' }}></i>
                                    </div>
                                    <div className="flex-grow-1 ms-3">
                                        <h3 className="h2 mb-0 fw-bold">{stats.pending}</h3>
                                        <p className="text-muted mb-0 small">Chờ duyệt</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="flex-shrink-0">
                                        <i className="ph-check-circle" style={{ fontSize: '2.5rem', color: '#10b981' }}></i>
                                    </div>
                                    <div className="flex-grow-1 ms-3">
                                        <h3 className="h2 mb-0 fw-bold">{stats.approved}</h3>
                                        <p className="text-muted mb-0 small">Đã duyệt</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="flex-shrink-0">
                                        <i className="ph-x-circle" style={{ fontSize: '2.5rem', color: '#ef4444' }}></i>
                                    </div>
                                    <div className="flex-grow-1 ms-3">
                                        <h3 className="h2 mb-0 fw-bold">{stats.rejected}</h3>
                                        <p className="text-muted mb-0 small">Đã từ chối</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="flex-shrink-0">
                                        <i className="ph-article" style={{ fontSize: '2.5rem', color: '#6366f1' }}></i>
                                    </div>
                                    <div className="flex-grow-1 ms-3">
                                        <h3 className="h2 mb-0 fw-bold">{stats.total}</h3>
                                        <p className="text-muted mb-0 small">Tổng bài viết</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Posts Section */}
            <div className="row">
                <div className="col-12">
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white border-0 py-3">
                            <h2 className="h5 mb-0">
                                Bài viết chờ duyệt ({pendingPosts.length})
                            </h2>
                        </div>
                        <div className="card-body">
                            {pendingPosts.length === 0 ? (
                                <div className="text-center py-5">
                                    <i className="ph-check-circle" style={{ fontSize: '4rem', color: '#10b981' }}></i>
                                    <p className="text-muted mt-3 mb-0">Không có bài viết nào chờ duyệt</p>
                                </div>
                            ) : (
                                <div className="row g-3">
                                    {pendingPosts.map((post) => (
                                        <div key={post._id} className="col-12">
                                            <div className="card border shadow-sm h-100">
                                                <div className="card-body">
                                                    {/* Post Header */}
                                                    <div className="d-flex justify-content-between align-items-start mb-3 pb-3 border-bottom">
                                                        <div className="d-flex align-items-center">
                                                            <img
                                                                src={post.authorId?.avatarUrl || '/default-avatar.png'}
                                                                alt={post.authorId?.displayName}
                                                                className="rounded-circle me-2"
                                                                style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                                                            />
                                                            <div>
                                                                <h5 className="mb-0 fw-semibold">{post.authorId?.displayName || 'Unknown User'}</h5>
                                                                <small className="text-muted">
                                                                    {new Date(post.createdAt).toLocaleString('vi-VN')}
                                                                </small>
                                                            </div>
                                                        </div>
                                                        <span className="badge bg-primary rounded-pill">
                                                            {post.categoryId?.title || 'Không có danh mục'}
                                                        </span>
                                                    </div>

                                                    {/* Post Content */}
                                                    <h4 className="card-title mb-3">{post.title}</h4>
                                                    <div
                                                        className="text-muted mb-3"
                                                        style={{
                                                            maxHeight: '100px',
                                                            overflow: 'hidden',
                                                            lineHeight: '1.6'
                                                        }}
                                                        dangerouslySetInnerHTML={{
                                                            __html: post.content.substring(0, 200) + '...',
                                                        }}
                                                    />

                                                    {/* Post Meta */}
                                                    <div className="d-flex align-items-center gap-3 mb-3 text-muted small">
                                                        <span>
                                                            <i className="ph-eye me-1"></i> {post.views || 0}
                                                        </span>
                                                        <span>
                                                            <i className="ph-heart me-1"></i> {post.likes?.length || 0}
                                                        </span>
                                                        <span>
                                                            <i className="ph-chat me-1"></i> {post.comments?.length || 0}
                                                        </span>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="d-flex gap-2 flex-wrap">
                                                        <button
                                                            className="btn btn-success d-flex align-items-center gap-2"
                                                            onClick={() => handleApprove(post._id)}
                                                        >
                                                            <i className="ph-check"></i>
                                                            Duyệt bài
                                                        </button>
                                                        <button
                                                            className="btn btn-danger d-flex align-items-center gap-2"
                                                            onClick={() => openRejectModal(post)}
                                                        >
                                                            <i className="ph-x"></i>
                                                            Từ chối
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary d-flex align-items-center gap-2"
                                                            onClick={() => navigate(`/post/${post.slug}`)}
                                                        >
                                                            <i className="ph-eye"></i>
                                                            Xem
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal từ chối bài viết */}
            {showRejectModal && selectedPost && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Từ chối bài viết</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowRejectModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <p className="mb-2">
                                        <strong>Bài viết:</strong> {selectedPost.title}
                                    </p>
                                    <p className="text-muted mb-3">
                                        <strong>Tác giả:</strong>{' '}
                                        {selectedPost.authorId?.displayName || 'Unknown'}
                                    </p>
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="rejectionReason" className="form-label">
                                        Lý do từ chối <span className="text-danger">*</span>
                                    </label>
                                    <textarea
                                        id="rejectionReason"
                                        className="form-control"
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Nhập lý do từ chối (bắt buộc)"
                                        rows="4"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowRejectModal(false)}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger d-flex align-items-center gap-2"
                                    onClick={handleReject}
                                >
                                    <i className="ph-x"></i>
                                    Xác nhận từ chối
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModerationDashboard;
