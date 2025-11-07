import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../Context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  getAllNotificationsAdmin,
  getNotificationsStats,
  deleteMultipleNotifications,
  deleteUserNotifications,
  sendBulkNotifications
} from '../../../Utils/api';
import LoadingPost from '@/Components/LoadingPost';

function NotificationsAdmin() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // list, stats, bulk

  // Filters
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    username: '', // Thay userId thành username để dễ tìm kiếm hơn
    type: '', // Mặc định chỉ hiển thị notifications type "like"
    read: '',
    sortBy: 'createdAt',
    order: 'desc'
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Bulk send state
  const [bulkForm, setBulkForm] = useState({
    userIds: '',
    type: 'system',
    message: '',
    data: {}
  });

  // Selected notifications for bulk actions
  const [selectedNotifications, setSelectedNotifications] = useState([]);

  useEffect(() => {
    // if (!auth.token || !auth.user?.isAdmin) {
    //   navigate('/');
    //   return;
    // }
    if (activeTab === 'list') {
      loadNotifications();
    } else if (activeTab === 'stats') {
      loadStats();
    }
  }, [auth.token, auth.user, filters, activeTab]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await getAllNotificationsAdmin(auth.token, filters);

      if (data.success) {
        setNotifications(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getNotificationsStats(auth.token);

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedNotifications.length === 0) {
      toast.error('Vui lòng chọn ít nhất một thông báo');
      return;
    }

    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedNotifications.length} thông báo?`)) return;

    try {
      const data = await deleteMultipleNotifications(auth.token, selectedNotifications);

      if (data.success) {
        toast.success(data.message);
        setSelectedNotifications([]);
        loadNotifications();
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Có lỗi xảy ra khi xóa thông báo');
    }
  };

  const handleDeleteUserNotifications = async (userId) => {
    if (!window.confirm('Bạn có chắc muốn xóa tất cả thông báo của user này?')) return;

    try {
      const data = await deleteUserNotifications(auth.token, userId);

      if (data.success) {
        toast.success(data.message);
        loadNotifications();
      }
    } catch (error) {
      console.error('Error deleting user notifications:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleBulkSend = async (e) => {
    e.preventDefault();

    // Nếu type = system, gửi cho tất cả users (userIds = 'all')
    // Nếu type khác, cần nhập userIds
    const isSendToAll = bulkForm.type === 'system';
    const userIdsArray = isSendToAll
      ? ['all']
      : bulkForm.userIds.split(',').map(id => id.trim()).filter(id => id);

    if (!isSendToAll && userIdsArray.length === 0) {
      toast.error('Vui lòng nhập ít nhất một User ID');
      return;
    }

    if (!bulkForm.message.trim()) {
      toast.error('Vui lòng nhập nội dung thông báo');
      return;
    }

    try {
      const data = await sendBulkNotifications(
        auth.token,
        userIdsArray,
        bulkForm.type,
        bulkForm.message,
        bulkForm.data
      );

      if (data.success) {
        toast.success(data.message);
        setBulkForm({ userIds: '', type: 'system', message: '', data: {} });
      } else {
        toast.error('Có lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  const toggleSelectNotification = (notificationId) => {
    setSelectedNotifications(prev => {
      if (prev.includes(notificationId)) {
        return prev.filter(id => id !== notificationId);
      } else {
        return [...prev, notificationId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n._id));
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' năm trước';

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' tháng trước';

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' ngày trước';

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' giờ trước';

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' phút trước';

    return Math.floor(seconds) + ' giây trước';
  };

  return (
    <div className="">
      <div className="">
        {/* Page Header - Enhanced */}
        <div className="page-header mb-4">
          <div className="page-block">
            <div className="row align-items-center">
              <div className="col-md-12">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h2 className="mb-1 fw-bold">
                      <i className="ph-duotone ph-shield-check me-2" style={{ color: '#4680ff' }}></i>
                      Quản lý Thông báo
                    </h2>
                    <p className="text-muted mb-0">
                      <i className="ph ph-info me-1"></i>
                      Quản lý và theo dõi tất cả thông báo trong hệ thống
                    </p>
                  </div>
                  <div className="badge bg-light-primary text-primary px-3 py-2" style={{ fontSize: '14px' }}>
                    <i className="ph ph-database me-1"></i>
                    Tổng: {pagination.total || 0} thông báo
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Enhanced with modern design */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body p-3">
                <ul className="nav nav-pills nav-fill" role="tablist" style={{ gap: '10px' }}>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'list' ? 'active' : ''}`}
                      onClick={() => setActiveTab('list')}
                      style={{
                        borderRadius: '10px',
                        fontWeight: '500',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <i className="ph-duotone ph-list-bullets me-2"></i>
                      Danh sách thông báo
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`}
                      onClick={() => setActiveTab('stats')}
                      style={{
                        borderRadius: '10px',
                        fontWeight: '500',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <i className="ph-duotone ph-chart-bar me-2"></i>
                      Thống kê & Báo cáo
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'bulk' ? 'active' : ''}`}
                      onClick={() => setActiveTab('bulk')}
                      style={{
                        borderRadius: '10px',
                        fontWeight: '500',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <i className="ph-duotone ph-paper-plane-tilt me-2"></i>
                      Gửi thông báo
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'list' && (
          <div className="row">
            <div className="col-12">
              <div className="card shadow-sm border-0">
                <div className="card-header bg-white border-bottom">
                  <div className="row g-3 align-items-center">
                    <div className="col-md-3">
                      <div className="input-group">
                        <span className="input-group-text bg-light border-0">
                          <i className="ph-duotone ph-magnifying-glass text-primary"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control border-0 bg-light"
                          placeholder="Tìm kiếm theo username..."
                          value={filters.username}
                          onChange={(e) => setFilters({ ...filters, username: e.target.value, page: 1 })}
                          style={{ fontSize: '14px' }}
                        />
                      </div>
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-select border-0 bg-light"
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
                        style={{ fontSize: '14px' }}
                      >
                        <option value="">🔔 Tất cả loại</option>
                        <option value="like">❤️ Like</option>
                        <option value="comment">💬 Comment</option>
                        <option value="mention">@ Mention</option>
                        <option value="system">⚙️ System</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-select border-0 bg-light"
                        value={filters.read}
                        onChange={(e) => setFilters({ ...filters, read: e.target.value, page: 1 })}
                        style={{ fontSize: '14px' }}
                      >
                        <option value="">Tất cả trạng thái</option>
                        <option value="true">✓ Đã đọc</option>
                        <option value="false">● Chưa đọc</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-select border-0 bg-light"
                        value={filters.sortBy}
                        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                        style={{ fontSize: '14px' }}
                      >
                        <option value="createdAt">📅 Ngày tạo</option>
                        <option value="type">📂 Loại</option>
                        <option value="read">📊 Trạng thái</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <div className="d-flex gap-2">
                        <div className="btn-group flex-grow-1" role="group">
                          <button
                            className={`btn ${filters.order === 'desc' ? 'btn-primary' : 'btn-light'}`}
                            onClick={() => setFilters({ ...filters, order: 'desc' })}
                            style={{ fontSize: '14px' }}
                          >
                            <i className="ph-bold ph-sort-descending"></i>
                          </button>
                          <button
                            className={`btn ${filters.order === 'asc' ? 'btn-primary' : 'btn-light'}`}
                            onClick={() => setFilters({ ...filters, order: 'asc' })}
                            style={{ fontSize: '14px' }}
                          >
                            <i className="ph-bold ph-sort-ascending"></i>
                          </button>
                        </div>
                        {selectedNotifications.length > 0 && (
                          <button
                            className="btn btn-danger"
                            onClick={handleDeleteMultiple}
                            style={{ fontSize: '14px', whiteSpace: 'nowrap' }}
                          >
                            <i className="ph-bold ph-trash me-1"></i>
                            Xóa ({selectedNotifications.length})
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-body p-0">
                  {loading ? (
                    <LoadingPost count={4} />
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="mb-4">
                        <i className="ph-duotone ph-bell-slash text-muted" style={{ fontSize: '80px', opacity: 0.3 }}></i>
                      </div>
                      <h5 className="text-muted mb-2">Không tìm thấy thông báo</h5>
                      <p className="text-muted mb-0">Thử thay đổi bộ lọc để xem kết quả khác</p>
                    </div>
                  ) : (
                    <div className="table-responsive p-1">
                      <table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}>
                        <thead className="bg-light">
                          <tr>
                            <th style={{ width: '50px' }} className="text-center">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedNotifications.length === notifications.length && notifications.length > 0}
                                onChange={toggleSelectAll}
                              />
                            </th>
                            <th style={{ minWidth: '200px' }}>
                              <i className="ph ph-user me-1"></i>User
                            </th>
                            <th style={{ width: '120px' }} className="text-center">
                              <i className="ph ph-tag me-1"></i>Loại
                            </th>
                            <th style={{ minWidth: '250px' }}>
                              <i className="ph ph-chat-text me-1"></i>Nội dung
                            </th>
                            <th style={{ width: '120px' }} className="text-center">
                              <i className="ph ph-check-circle me-1"></i>Trạng thái
                            </th>
                            <th style={{ width: '140px' }}>
                              <i className="ph ph-clock me-1"></i>Thời gian
                            </th>
                            <th style={{ width: '80px' }} className="text-center">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notifications.map((notification) => (
                            <tr key={notification._id} style={{ transition: 'all 0.2s ease' }}>
                              <td className="text-center">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={selectedNotifications.includes(notification._id)}
                                  onChange={() => toggleSelectNotification(notification._id)}
                                />
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <div className="position-relative">
                                    <img
                                      src={notification.userId?.avatarUrl || `https://ui-avatars.com/api/?name=${notification.userId?.username}&background=random`}
                                      alt={notification.userId?.username}
                                      className="rounded-circle"
                                      style={{
                                        width: '40px',
                                        height: '40px',
                                        objectFit: 'cover',
                                        border: '2px solid #f0f0f0'
                                      }}
                                    />
                                    {!notification.read && (
                                      <span
                                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                                        style={{ fontSize: '8px', padding: '3px 5px' }}
                                      >
                                        Mới
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                    <div className="fw-semibold text-truncate">
                                      {notification.userId?.displayName || notification.userId?.username}
                                    </div>
                                    <small className="text-muted text-truncate d-block">
                                      {notification.userId?.email}
                                    </small>
                                  </div>
                                </div>
                              </td>
                              <td className="text-center">
                                <span className={`badge d-inline-flex align-items-center gap-1 ${notification.type === 'like' ? 'bg-danger' :
                                    notification.type === 'comment' ? 'bg-primary' :
                                      notification.type === 'mention' ? 'bg-purple' :
                                        'bg-info'
                                  }`} style={{ fontSize: '12px', padding: '6px 12px' }}>
                                  {notification.type === 'like' && '❤️'}
                                  {notification.type === 'comment' && '💬'}
                                  {notification.type === 'mention' && '@'}
                                  {notification.type === 'system' && '⚙️'}
                                  {notification.type}
                                </span>
                              </td>
                              <td>
                                <div
                                  className="text-truncate"
                                  style={{ maxWidth: '300px' }}
                                  title={notification.data?.message || notification.data?.postTitle}
                                >
                                  {notification.data?.message || notification.data?.postTitle || (
                                    <span className="text-muted fst-italic">Không có nội dung</span>
                                  )}
                                </div>
                              </td>
                              <td className="text-center">
                                {notification.read ? (
                                  <span className="badge bg-light-success text-success d-inline-flex align-items-center gap-1" style={{ fontSize: '12px' }}>
                                    <i className="ph-fill ph-check-circle"></i>
                                    Đã đọc
                                  </span>
                                ) : (
                                  <span className="badge bg-light-warning text-warning d-inline-flex align-items-center gap-1" style={{ fontSize: '12px' }}>
                                    <i className="ph-fill ph-circle"></i>
                                    Chưa đọc
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-1 text-muted">
                                  <i className="ph ph-clock" style={{ fontSize: '16px' }}></i>
                                  <small>{getTimeAgo(notification.createdAt)}</small>
                                </div>
                              </td>
                              <td className="text-center">
                                <div className="dropdown">
                                  <button
                                    className="btn btn-sm btn-light rounded-circle"
                                    type="button"
                                    data-bs-toggle="dropdown"
                                    style={{ width: '32px', height: '32px', padding: 0 }}
                                  >
                                    <i className="ph-bold ph-dots-three-outline-vertical"></i>
                                  </button>
                                  <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0" style={{ minWidth: '200px' }}>
                                    <li>
                                      <button
                                        className="dropdown-item text-danger d-flex align-items-center gap-2"
                                        onClick={() => handleDeleteUserNotifications(notification.userId._id)}
                                      >
                                        <i className="ph-bold ph-trash"></i>
                                        Xóa tất cả của user
                                      </button>
                                    </li>
                                  </ul>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination - Enhanced */}
                  {pagination.pages > 1 && (
                    <div className="card-footer bg-white border-top">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="text-muted" style={{ fontSize: '14px' }}>
                          Hiển thị <strong>{((pagination.page - 1) * pagination.limit) + 1}</strong> - <strong>{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> trong tổng số <strong>{pagination.total}</strong> thông báo
                        </div>
                        <nav>
                          <ul className="pagination pagination-sm mb-0">
                            <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                              <button
                                className="page-link rounded-start"
                                onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                              >
                                <i className="ph-bold ph-caret-left"></i>
                              </button>
                            </li>
                            {[...Array(Math.min(pagination.pages, 5))].map((_, i) => {
                              let pageNum;
                              if (pagination.pages <= 5) {
                                pageNum = i + 1;
                              } else if (pagination.page <= 3) {
                                pageNum = i + 1;
                              } else if (pagination.page >= pagination.pages - 2) {
                                pageNum = pagination.pages - 4 + i;
                              } else {
                                pageNum = pagination.page - 2 + i;
                              }
                              return (
                                <li key={pageNum} className={`page-item ${pagination.page === pageNum ? 'active' : ''}`}>
                                  <button
                                    className="page-link"
                                    onClick={() => setFilters({ ...filters, page: pageNum })}
                                  >
                                    {pageNum}
                                  </button>
                                </li>
                              );
                            })}
                            <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                              <button
                                className="page-link rounded-end"
                                onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                              >
                                <i className="ph-bold ph-caret-right"></i>
                              </button>
                            </li>
                          </ul>
                        </nav>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="row">
            {loading ? (
              <LoadingPost count={4} />
            ) : !stats ? (
              <div className="col-12">
                <div className="card shadow-sm border-0">
                  <div className="card-body text-center py-5">
                    <div className="mb-4">
                      <i className="ph-duotone ph-chart-bar-horizontal text-muted" style={{ fontSize: '80px', opacity: 0.3 }}></i>
                    </div>
                    <h5 className="text-muted mb-2">Không có dữ liệu thống kê</h5>
                    <p className="text-muted mb-0">Dữ liệu sẽ xuất hiện khi có thông báo trong hệ thống</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Stats Cards - Enhanced with gradient */}
                <div className="col-xl-3 col-md-6">
                  <div className="card shadow-sm border-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <div className="card-body text-white p-4">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div className="rounded-circle bg-white bg-opacity-25 p-3">
                          <i className="ph-duotone ph-bell" style={{ fontSize: '32px' }}></i>
                        </div>
                        <div className="badge bg-white bg-opacity-25 px-3 py-2">Tổng quan</div>
                      </div>
                      <h2 className="mb-1 fw-bold">{stats.totalNotifications.toLocaleString()}</h2>
                      <p className="mb-0 opacity-75">Tổng thông báo</p>
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-md-6">
                  <div className="card shadow-sm border-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                    <div className="card-body text-white p-4">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div className="rounded-circle bg-white bg-opacity-25 p-3">
                          <i className="ph-duotone ph-bell-ringing" style={{ fontSize: '32px' }}></i>
                        </div>
                        <div className="badge bg-white bg-opacity-25 px-3 py-2">Chưa đọc</div>
                      </div>
                      <h2 className="mb-1 fw-bold">{stats.unreadNotifications.toLocaleString()}</h2>
                      <p className="mb-0 opacity-75">Thông báo mới</p>
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-md-6">
                  <div className="card shadow-sm border-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                    <div className="card-body text-white p-4">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div className="rounded-circle bg-white bg-opacity-25 p-3">
                          <i className="ph-duotone ph-check-circle" style={{ fontSize: '32px' }}></i>
                        </div>
                        <div className="badge bg-white bg-opacity-25 px-3 py-2">Đã đọc</div>
                      </div>
                      <h2 className="mb-1 fw-bold">{stats.readNotifications.toLocaleString()}</h2>
                      <p className="mb-0 opacity-75">Thông báo đã xem</p>
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-md-6">
                  <div className="card shadow-sm border-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
                    <div className="card-body text-white p-4">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div className="rounded-circle bg-white bg-opacity-25 p-3">
                          <i className="ph-duotone ph-clock-clockwise" style={{ fontSize: '32px' }}></i>
                        </div>
                        <div className="badge bg-white bg-opacity-25 px-3 py-2">Gần đây</div>
                      </div>
                      <h2 className="mb-1 fw-bold">{stats.recentNotifications.toLocaleString()}</h2>
                      <p className="mb-0 opacity-75">7 ngày qua</p>
                    </div>
                  </div>
                </div>

                {/* Charts - Enhanced */}
                <div className="col-lg-6">
                  <div className="card shadow-sm border-0">
                    <div className="card-header bg-white border-bottom">
                      <div className="d-flex align-items-center justify-content-between">
                        <h5 className="mb-0 fw-bold">
                          <i className="ph-duotone ph-chart-pie text-primary me-2"></i>
                          Phân loại thông báo
                        </h5>
                        <span className="badge bg-light-primary text-primary">
                          {stats.notificationsByType?.length || 0} loại
                        </span>
                      </div>
                    </div>
                    <div className="card-body">
                      {stats.notificationsByType && stats.notificationsByType.length > 0 ? (
                        <div className="list-group list-group-flush">
                          {stats.notificationsByType.map((item, index) => {
                            const total = stats.totalNotifications;
                            const percentage = ((item.count / total) * 100).toFixed(1);
                            const colors = ['#667eea', '#f093fb', '#4facfe', '#fa709a'];
                            const icons = { like: '❤️', comment: '💬', mention: '@', system: '⚙️' };
                            return (
                              <div key={item._id} className="list-group-item border-0 px-0 py-3">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                  <div className="d-flex align-items-center gap-2">
                                    <span style={{ fontSize: '20px' }}>{icons[item._id] || '🔔'}</span>
                                    <span className="fw-semibold text-capitalize">{item._id}</span>
                                  </div>
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="text-muted">{percentage}%</span>
                                    <span className="badge rounded-pill px-3" style={{ backgroundColor: colors[index % colors.length] }}>
                                      {item.count.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="progress" style={{ height: '8px', borderRadius: '10px' }}>
                                  <div
                                    className="progress-bar"
                                    role="progressbar"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: colors[index % colors.length],
                                      borderRadius: '10px'
                                    }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <i className="ph-duotone ph-database text-muted mb-3" style={{ fontSize: '48px', opacity: 0.3 }}></i>
                          <p className="text-muted mb-0">Chưa có dữ liệu phân loại</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="card shadow-sm border-0">
                    <div className="card-header bg-white border-bottom">
                      <div className="d-flex align-items-center justify-content-between">
                        <h5 className="mb-0 fw-bold">
                          <i className="ph-duotone ph-users-three text-primary me-2"></i>
                          Top người dùng hoạt động
                        </h5>
                        <span className="badge bg-light-primary text-primary">
                          Top 10
                        </span>
                      </div>
                    </div>
                    <div className="card-body" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                      {stats.topUsersByNotifications && stats.topUsersByNotifications.length > 0 ? (
                        <div className="list-group list-group-flush">
                          {stats.topUsersByNotifications.map((user, index) => {
                            const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                            const rankColor = index < 3 ? rankColors[index] : '#6c757d';
                            return (
                              <div key={user.userId} className="list-group-item border-0 px-0 py-3">
                                <div className="d-flex align-items-center gap-3">
                                  <div
                                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      backgroundColor: rankColor,
                                      fontSize: '14px'
                                    }}
                                  >
                                    {index + 1}
                                  </div>
                                  <div className="position-relative">
                                    <img
                                      src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                                      alt={user.username}
                                      className="rounded-circle"
                                      style={{
                                        width: '48px',
                                        height: '48px',
                                        objectFit: 'cover',
                                        border: '3px solid #f0f0f0'
                                      }}
                                    />
                                    {index === 0 && (
                                      <span
                                        className="position-absolute bottom-0 end-0 translate-middle badge rounded-pill"
                                        style={{ backgroundColor: '#FFD700', padding: '4px' }}
                                      >
                                        👑
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                    <div className="fw-semibold text-truncate">{user.displayName || user.username}</div>
                                    <small className="text-muted text-truncate d-block">@{user.username}</small>
                                  </div>
                                  <div className="text-end">
                                    <div className="badge bg-light-primary text-primary px-3 py-2">
                                      <i className="ph-fill ph-bell me-1"></i>
                                      {user.notificationsCount}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <i className="ph-duotone ph-user-list text-muted mb-3" style={{ fontSize: '48px', opacity: 0.3 }}></i>
                          <p className="text-muted mb-0">Chưa có dữ liệu người dùng</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'bulk' && (
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card shadow-sm border-0">
                <div className="card-header bg-gradient text-white border-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-circle bg-white bg-opacity-25 p-3">
                      <i className="ph-duotone ph-paper-plane-tilt" style={{ fontSize: '32px' }}></i>
                    </div>
                    <div>
                      <h4 className="mb-1 fw-bold">Gửi thông báo hàng loạt</h4>
                      <p className="mb-0 opacity-75">Gửi thông báo đến nhiều người dùng cùng lúc</p>
                    </div>
                  </div>
                </div>
                <div className="card-body p-4">
                  <form onSubmit={handleBulkSend}>
                    {/* Type Selection - Enhanced */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold mb-3">
                        <i className="ph-duotone ph-tag me-2 text-primary"></i>
                        Loại thông báo
                      </label>
                      <div className="row g-3">
                        {[
                          { value: 'system', label: 'System', icon: '⚙️', desc: 'Gửi tất cả users', color: '#4facfe' },
                          { value: 'like', label: 'Like', icon: '❤️', desc: 'Chọn users cụ thể', color: '#f093fb' },
                          { value: 'comment', label: 'Comment', icon: '💬', desc: 'Chọn users cụ thể', color: '#667eea' },
                          { value: 'mention', label: 'Mention', icon: '@', desc: 'Chọn users cụ thể', color: '#fa709a' }
                        ].map((type) => (
                          <div key={type.value} className="col-6">
                            <input
                              type="radio"
                              className="btn-check"
                              name="notificationType"
                              id={`type-${type.value}`}
                              value={type.value}
                              checked={bulkForm.type === type.value}
                              onChange={(e) => setBulkForm({ ...bulkForm, type: e.target.value })}
                            />
                            <label
                              className={`btn btn-outline-primary w-100 p-3 text-start ${bulkForm.type === type.value ? 'active' : ''}`}
                              htmlFor={`type-${type.value}`}
                              style={{
                                border: bulkForm.type === type.value ? `2px solid ${type.color}` : '2px solid #e0e0e0',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              <div className="d-flex align-items-center gap-3">
                                <span style={{ fontSize: '28px' }}>{type.icon}</span>
                                <div>
                                  <div className="fw-bold">{type.label}</div>
                                  <small className="text-muted">{type.desc}</small>
                                </div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* User IDs Input - Conditional */}
                    {bulkForm.type !== 'system' && (
                      <div className="mb-4">
                        <label className="form-label fw-semibold">
                          <i className="ph-duotone ph-users-three me-2 text-primary"></i>
                          User IDs (phân cách bằng dấu phẩy)
                        </label>
                        <textarea
                          className="form-control border-2"
                          rows="4"
                          placeholder="673c7d5e123456789abcdef0, 673c7d5e123456789abcdef1, 673c7d5e123456789abcdef2..."
                          value={bulkForm.userIds}
                          onChange={(e) => setBulkForm({ ...bulkForm, userIds: e.target.value })}
                          required
                          style={{
                            fontSize: '14px',
                            resize: 'vertical',
                            fontFamily: 'Monaco, monospace'
                          }}
                        />
                        <div className="form-text d-flex align-items-center gap-2 mt-2">
                          <i className="ph ph-info"></i>
                          Nhập danh sách User IDs, mỗi ID cách nhau bằng dấu phẩy
                        </div>
                      </div>
                    )}

                    {/* System Alert */}
                    {bulkForm.type === 'system' && (
                      <div className="alert alert-info d-flex align-items-start gap-3 mb-4 border-0 shadow-sm" style={{ backgroundColor: '#e3f2fd' }}>
                        <div className="rounded-circle bg-info bg-opacity-25 p-2">
                          <i className="ph-fill ph-broadcast text-info" style={{ fontSize: '24px' }}></i>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1 fw-bold text-info">
                            <i className="ph-fill ph-megaphone me-1"></i>
                            Gửi cho tất cả người dùng
                          </h6>
                          <p className="mb-0 text-muted" style={{ fontSize: '14px' }}>
                            Thông báo hệ thống sẽ được gửi đến <strong>tất cả người dùng</strong> trong hệ thống.
                            Vui lòng kiểm tra kỹ nội dung trước khi gửi.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Message Content */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        <i className="ph-duotone ph-chat-text me-2 text-primary"></i>
                        Nội dung thông báo
                        <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control border-2"
                        rows="6"
                        placeholder="Nhập nội dung thông báo của bạn tại đây...&#10;&#10;Ví dụ: Hệ thống sẽ bảo trì từ 2h-4h sáng ngày mai. Vui lòng lưu công việc trước khi đăng xuất."
                        value={bulkForm.message}
                        onChange={(e) => setBulkForm({ ...bulkForm, message: e.target.value })}
                        required
                        style={{
                          fontSize: '14px',
                          resize: 'vertical',
                          lineHeight: '1.6'
                        }}
                      />
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <div className="form-text d-flex align-items-center gap-2">
                          <i className="ph ph-pencil-simple"></i>
                          Viết nội dung rõ ràng, dễ hiểu
                        </div>
                        <span className={`badge ${bulkForm.message.length > 0 ? 'bg-primary' : 'bg-secondary'}`}>
                          {bulkForm.message.length} ký tự
                        </span>
                      </div>
                    </div>

                    {/* Warning for non-system types */}
                    {bulkForm.type !== 'system' && (
                      <div className="alert alert-warning d-flex align-items-start gap-3 mb-4 border-0 shadow-sm" style={{ backgroundColor: '#fff3cd' }}>
                        <div className="rounded-circle bg-warning bg-opacity-25 p-2">
                          <i className="ph-fill ph-warning text-warning" style={{ fontSize: '24px' }}></i>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1 fw-bold text-warning">
                            <i className="ph-fill ph-shield-warning me-1"></i>
                            Lưu ý quan trọng
                          </h6>
                          <p className="mb-0 text-muted" style={{ fontSize: '14px' }}>
                            Thông báo sẽ được gửi đến các user IDs đã liệt kê.
                            Hãy kiểm tra kỹ danh sách trước khi gửi vì <strong>không thể hoàn tác</strong>.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="d-flex justify-content-end gap-3 pt-3 border-top">
                      <button
                        type="button"
                        className="btn btn-light px-4 py-2"
                        onClick={() => setBulkForm({ userIds: '', type: 'system', message: '', data: {} })}
                        style={{ minWidth: '120px' }}
                      >
                        <i className="ph-bold ph-x me-2"></i>
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary px-4 py-2 shadow-sm"
                        style={{ minWidth: '180px' }}
                      >
                        <i className="ph-bold ph-paper-plane-tilt me-2"></i>
                        {bulkForm.type === 'system' ? 'Gửi cho tất cả' : 'Gửi thông báo'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Help Card */}
              <div className="card shadow-sm border-0 mt-4" style={{ backgroundColor: '#f8f9fa' }}>
                <div className="card-body p-4">
                  <h6 className="fw-bold mb-3">
                    <i className="ph-duotone ph-question text-primary me-2"></i>
                    Hướng dẫn sử dụng
                  </h6>
                  <ul className="list-unstyled mb-0" style={{ fontSize: '14px' }}>
                    <li className="mb-2 d-flex gap-2">
                      <i className="ph-fill ph-check-circle text-success mt-1"></i>
                      <span><strong>System:</strong> Gửi thông báo quan trọng đến tất cả người dùng (bảo trì, cập nhật...)</span>
                    </li>
                    <li className="mb-2 d-flex gap-2">
                      <i className="ph-fill ph-check-circle text-success mt-1"></i>
                      <span><strong>Like/Comment/Mention:</strong> Gửi thông báo tương tác đến nhóm người dùng cụ thể</span>
                    </li>
                    <li className="mb-2 d-flex gap-2">
                      <i className="ph-fill ph-check-circle text-success mt-1"></i>
                      <span>User IDs có thể lấy từ danh sách người dùng hoặc database</span>
                    </li>
                    <li className="d-flex gap-2">
                      <i className="ph-fill ph-check-circle text-success mt-1"></i>
                      <span>Thông báo sẽ hiển thị ngay lập tức cho người dùng online</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsAdmin;
