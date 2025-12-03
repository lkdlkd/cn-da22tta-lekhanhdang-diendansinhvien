import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../Context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Table } from 'react-bootstrap';
import Swal from 'sweetalert2';
import {
  getAllNotificationsAdmin,
  getNotificationsStats,
  deleteMultipleNotifications,
  deleteUserNotifications,
  sendBulkNotifications,
  getAllUsersAdmin
} from '../../../Utils/api';
import LoadingPost from '@/Components/LoadingPost';

function NotificationsAdmin() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    username: '',
    type: '',
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
    sendTo: 'all', // all, username, select
    usernames: '',
    selectedUsers: [],
    type: 'system',
    message: '',
  });

  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadData();
  }, [filters]);

  useEffect(() => {
    if (showSendModal && bulkForm.sendTo === 'select') {
      loadUsers();
    }
  }, [showSendModal, bulkForm.sendTo]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [notifData, statsData] = await Promise.all([
        getAllNotificationsAdmin(auth.token, filters),
        getNotificationsStats(auth.token)
      ]);

      if (notifData.success) {
        setNotifications(notifData.data);
        setPagination(notifData.pagination);
      }

      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await getAllUsersAdmin(auth.token, { limit: 1000 });
      if (data.data) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedNotifications.length === 0) {
      toast.error('Vui lòng chọn ít nhất một thông báo');
      return;
    }

    const result = await Swal.fire({
      title: 'Xác nhận xóa',
      text: `Bạn có chắc muốn xóa ${selectedNotifications.length} thông báo?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    });

    if (!result.isConfirmed) return;

    try {
      const data = await deleteMultipleNotifications(auth.token, selectedNotifications);

      if (data.success) {
        toast.success(data.message);
        setSelectedNotifications([]);
        loadData();
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Có lỗi xảy ra khi xóa thông báo');
    }
  };

  const handleDeleteUserNotifications = async (userId) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa',
      text: 'Bạn có chắc muốn xóa tất cả thông báo của user này?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    });

    if (!result.isConfirmed) return;

    try {
      const data = await deleteUserNotifications(auth.token, userId);

      if (data.success) {
        toast.success(data.message);
        loadData();
      }
    } catch (error) {
      console.error('Error deleting user notifications:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleBulkSend = async (e) => {
    e.preventDefault();

    let userIdsArray = [];

    if (bulkForm.sendTo === 'all') {
      userIdsArray = ['all'];
    } else if (bulkForm.sendTo === 'username') {
      const usernames = bulkForm.usernames.split(',').map(u => u.trim()).filter(u => u);
      if (usernames.length === 0) {
        toast.error('Vui lòng nhập ít nhất một username');
        return;
      }

      // Load users and filter by username
      await loadUsers();
      const matchedUsers = users.filter(u => usernames.includes(u.username));
      if (matchedUsers.length === 0) {
        toast.error('Không tìm thấy user nào với username đã nhập');
        return;
      }
      userIdsArray = matchedUsers.map(u => u._id);
    } else if (bulkForm.sendTo === 'select') {
      if (bulkForm.selectedUsers.length === 0) {
        toast.error('Vui lòng chọn ít nhất một user');
        return;
      }
      userIdsArray = bulkForm.selectedUsers;
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
        {}
      );

      if (data.success) {
        toast.success(data.message);
        setBulkForm({ sendTo: 'all', usernames: '', selectedUsers: [], type: 'system', message: '' });
        setShowSendModal(false);
        loadData();
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

  const toggleUserSelection = (userId) => {
    setBulkForm(prev => ({
      ...prev,
      selectedUsers: prev.selectedUsers.includes(userId)
        ? prev.selectedUsers.filter(id => id !== userId)
        : [...prev.selectedUsers, userId]
    }));
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

  const getTypeBadgeColor = (type) => {
    const colors = {
      system: 'primary',
      like: 'danger',
      comment: 'success',
      mention: 'warning'
    };
    return colors[type] || 'secondary';
  };

  return (
    <div className="container-fluid">
      {/* Page Header */}
      <div className="page-header mb-4">
        <div className="card border">
          <div className="card-body">
            <div className="row align-items-center">
              <div className="col-md-8">
                <h2 className="mb-1 fw-bold">
                  <i className="bi bi-bell-fill me-2 text-primary"></i>
                  Quản lý Thông báo
                </h2>
                <p className="text-muted mb-0">
                  <i className="bi bi-info-circle me-1"></i>
                  Quản lý và theo dõi tất cả thông báo trong hệ thống
                </p>
              </div>
              <div className="col-md-4 text-end">
                <button
                  className="btn btn-primary"
                  onClick={() => setShowSendModal(true)}
                >
                  <i className="bi bi-send-fill me-2"></i>
                  Gửi thông báo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingPost />
      ) : (
        <>
          {/* Statistics Cards */}
          {stats && (
            <div className="row mb-4">
              <div className="col-xl-3 col-md-6 mb-3">
                <div className="card border h-100">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <p className="mb-1 text-muted">Tổng thông báo</p>
                        <h3 className="mb-0 fw-bold text-primary">{stats.totalNotifications || 0}</h3>
                      </div>
                      <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
                        <i className="bi bi-bell-fill text-primary" style={{ fontSize: '24px' }}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-xl-3 col-md-6 mb-3">
                <div className="card border h-100">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <p className="mb-1 text-muted">Chưa đọc</p>
                        <h3 className="mb-0 fw-bold text-danger">{stats.unreadNotifications || 0}</h3>
                      </div>
                      <div className="bg-danger bg-opacity-10 p-3 rounded-circle">
                        <i className="bi bi-envelope-fill text-danger" style={{ fontSize: '24px' }}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-xl-3 col-md-6 mb-3">
                <div className="card border h-100">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <p className="mb-1 text-muted">Đã đọc</p>
                        <h3 className="mb-0 fw-bold text-success">{stats.readNotifications || 0}</h3>
                      </div>
                      <div className="bg-success bg-opacity-10 p-3 rounded-circle">
                        <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '24px' }}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-xl-3 col-md-6 mb-3">
                <div className="card border h-100">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <p className="mb-1 text-muted">Gần đây (7 ngày)</p>
                        <h3 className="mb-0 fw-bold text-info">{stats.recentNotifications || 0}</h3>
                      </div>
                      <div className="bg-info bg-opacity-10 p-3 rounded-circle">
                        <i className="bi bi-clock-fill text-info" style={{ fontSize: '24px' }}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="row">
            <div className="col-12">
              <div className="card border">
                <div className="card-header bg-white border-bottom">
                  <div className="row g-3 align-items-center">
                    <div className="col-md-3">
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-search text-primary"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Tìm kiếm theo username..."
                          value={filters.username}
                          onChange={(e) => setFilters({ ...filters, username: e.target.value, page: 1 })}
                        />
                      </div>
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-select"
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
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
                        className="form-select"
                        value={filters.read}
                        onChange={(e) => setFilters({ ...filters, read: e.target.value, page: 1 })}
                      >
                        <option value="">Tất cả trạng thái</option>
                        <option value="true">✓ Đã đọc</option>
                        <option value="false">● Chưa đọc</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-select"
                        value={filters.sortBy}
                        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
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
                            className={`btn ${filters.order === 'desc' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setFilters({ ...filters, order: 'desc' })}
                            title="Sắp xếp giảm dần"
                          >
                            <i className="bi bi-sort-down"></i>
                          </button>
                          <button
                            className={`btn ${filters.order === 'asc' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setFilters({ ...filters, order: 'asc' })}
                            title="Sắp xếp tăng dần"
                          >
                            <i className="bi bi-sort-up"></i>
                          </button>
                        </div>
                        {selectedNotifications.length > 0 && (
                          <button
                            className="btn btn-danger"
                            onClick={handleDeleteMultiple}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            <i className="bi bi-trash-fill me-1"></i>
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
                        <i className="bi bi-bell-slash text-muted" style={{ fontSize: '80px', opacity: 0.3 }}></i>
                      </div>
                      <h5 className="text-muted mb-2">Không tìm thấy thông báo</h5>
                      <p className="text-muted mb-0">Thử thay đổi bộ lọc để xem kết quả khác</p>
                    </div>
                  ) : (
                    <div className="table-responsive p-1">
                      <Table hover responsive bordered className="align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: '50px' }} className="text-center">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedNotifications.length === notifications.length && notifications.length > 0}
                                onChange={toggleSelectAll}
                              />
                            </th>
                            <th>STT</th>
                            <th style={{ width: '80px' }} className="text-center">Thao tác</th>
                            <th style={{ minWidth: '200px' }}>
                              <i className="bi bi-person-fill me-1"></i>Người dùng
                            </th>
                            <th style={{ width: '120px' }} className="text-center">
                              <i className="bi bi-tag-fill me-1"></i>Loại
                            </th>
                            <th style={{ minWidth: '250px' }}>
                              <i className="bi bi-chat-dots-fill me-1"></i>Nội dung
                            </th>
                            <th style={{ width: '120px' }} className="text-center">
                              <i className="bi bi-check-circle-fill me-1"></i>Trạng thái
                            </th>
                            <th style={{ width: '140px' }}>
                              <i className="bi bi-clock-fill me-1"></i>Thời gian
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {notifications.map((notification, idx) => (
                            <tr key={notification._id} style={{ transition: 'all 0.2s ease' }}>
                              <td className="text-center">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={selectedNotifications.includes(notification._id)}
                                  onChange={() => toggleSelectNotification(notification._id)}
                                />
                              </td>
                              <td>{idx + 1}</td>
                              <td className="text-center">
                                <div className="dropdown">
                                  <button
                                    className="btn btn-primary dropdown-toggle"
                                    type="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                  >
                                    Thao tác <i className="bi bi-chevron-down ms-1"></i>
                                  </button>
                                  <ul className="dropdown-menu dropdown-menu-end">
                                    <li>
                                      <button
                                        className="dropdown-item text-danger d-flex align-items-center gap-2"
                                        onClick={() => handleDeleteUserNotifications(notification.userId._id)}
                                      >
                                        <i className="bi bi-trash-fill"></i>
                                        Xóa tất cả của user
                                      </button>
                                    </li>
                                  </ul>
                                </div>
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
                                  <span className="badge bg-success d-inline-flex align-items-center gap-1" style={{ fontSize: '12px' }}>
                                    <i className="bi bi-check-circle-fill"></i>
                                    Đã đọc
                                  </span>
                                ) : (
                                  <span className="badge bg-warning d-inline-flex align-items-center gap-1" style={{ fontSize: '12px' }}>
                                    <i className="bi bi-circle-fill"></i>
                                    Chưa đọc
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-1 text-muted">
                                  <i className="bi bi-clock" style={{ fontSize: '16px' }}></i>
                                  <small>{getTimeAgo(notification.createdAt)}</small>
                                </div>
                              </td>

                            </tr>
                          ))}
                        </tbody>
                      </Table>
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
                                disabled={pagination.page === 1}
                              >
                                <i className="bi bi-chevron-left"></i>
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
                                disabled={pagination.page === pagination.pages}
                              >
                                <i className="bi bi-chevron-right"></i>
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
        </>
      )}

      {/* Send Notification Modal */}
      {showSendModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-send-fill me-2"></i>
                  Gửi thông báo
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowSendModal(false)}
                ></button>
              </div>
              <form onSubmit={handleBulkSend}>
                <div className="modal-body p-4">
                  {/* Send To Radio Buttons */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-people-fill me-2 text-primary"></i>
                      Gửi tới
                    </label>
                    <div className="d-flex flex-column gap-3">
                      <div className="form-check p-3 border rounded">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="sendTo"
                          id="sendToAll"
                          value="all"
                          checked={bulkForm.sendTo === 'all'}
                          onChange={(e) => setBulkForm({ ...bulkForm, sendTo: e.target.value })}
                        />
                        <label className="form-check-label ms-2 w-100" htmlFor="sendToAll">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-broadcast text-primary" style={{ fontSize: '20px' }}></i>
                            <div>
                              <div className="fw-semibold">Tất cả người dùng</div>
                              <small className="text-muted">Gửi thông báo đến toàn bộ người dùng</small>
                            </div>
                          </div>
                        </label>
                      </div>

                      <div className="form-check p-3 border rounded">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="sendTo"
                          id="sendToUsername"
                          value="username"
                          checked={bulkForm.sendTo === 'username'}
                          onChange={(e) => setBulkForm({ ...bulkForm, sendTo: e.target.value })}
                        />
                        <label className="form-check-label ms-2 w-100" htmlFor="sendToUsername">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-person-fill text-warning" style={{ fontSize: '20px' }}></i>
                            <div>
                              <div className="fw-semibold">Theo username</div>
                              <small className="text-muted">Nhập danh sách username cách nhau bởi dấu phẩy</small>
                            </div>
                          </div>
                        </label>
                      </div>

                      <div className="form-check p-3 border rounded">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="sendTo"
                          id="sendToSelect"
                          value="select"
                          checked={bulkForm.sendTo === 'select'}
                          onChange={(e) => setBulkForm({ ...bulkForm, sendTo: e.target.value })}
                        />
                        <label className="form-check-label ms-2 w-100" htmlFor="sendToSelect">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-check2-square text-success" style={{ fontSize: '20px' }}></i>
                            <div>
                              <div className="fw-semibold">Chọn người dùng</div>
                              <small className="text-muted">Chọn người dùng cụ thể từ danh sách</small>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Username Input */}
                  {bulkForm.sendTo === 'username' && (
                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        <i className="bi bi-person-lines-fill me-2 text-primary"></i>
                        Danh sách username
                      </label>
                      <textarea
                        className="form-control"
                        rows="4"
                        placeholder="username1, username2, username3..."
                        value={bulkForm.usernames}
                        onChange={(e) => setBulkForm({ ...bulkForm, usernames: e.target.value })}
                      />
                      <small className="text-muted">Nhập các username cách nhau bởi dấu phẩy</small>
                    </div>
                  )}

                  {/* User Selection */}
                  {bulkForm.sendTo === 'select' && (
                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        <i className="bi bi-people-fill me-2 text-primary"></i>
                        Chọn người dùng ({bulkForm.selectedUsers.length} đã chọn)
                      </label>
                      <div className="border rounded p-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {users.length === 0 ? (
                          <div className="text-center text-muted py-3">
                            <i className="bi bi-hourglass-split me-2"></i>
                            Đang tải danh sách người dùng...
                          </div>
                        ) : (
                          users.map(user => (
                            <div key={user._id} className="form-check mb-2 p-2 rounded hover-bg-light">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`user-${user._id}`}
                                checked={bulkForm.selectedUsers.includes(user._id)}
                                onChange={() => toggleUserSelection(user._id)}
                              />
                              <label className="form-check-label ms-2 d-flex align-items-center gap-2 w-100" htmlFor={`user-${user._id}`}>
                                <img
                                  src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}`}
                                  alt={user.username}
                                  className="rounded-circle"
                                  style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                                />
                                <div>
                                  <div className="fw-semibold">{user.displayName || user.username}</div>
                                  <small className="text-muted">@{user.username}</small>
                                </div>
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notification Type */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-tag-fill me-2 text-primary"></i>
                      Loại thông báo
                    </label>
                    <select
                      className="form-select"
                      value={bulkForm.type}
                      onChange={(e) => setBulkForm({ ...bulkForm, type: e.target.value })}
                    >
                      <option value="system">⚙️ System</option>
                      <option value="like">❤️ Like</option>
                      <option value="comment">💬 Comment</option>
                      <option value="mention">@ Mention</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-chat-left-text-fill me-2 text-primary"></i>
                      Nội dung thông báo
                      <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows="5"
                      placeholder="Nhập nội dung thông báo..."
                      value={bulkForm.message}
                      onChange={(e) => setBulkForm({ ...bulkForm, message: e.target.value })}
                      required
                    />
                    <div className="d-flex justify-content-between mt-2">
                      <small className="text-muted">Viết nội dung rõ ràng, dễ hiểu</small>
                      <span className={`badge ${bulkForm.message.length > 0 ? 'bg-primary' : 'bg-secondary'}`}>
                        {bulkForm.message.length} ký tự
                      </span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSendModal(false)}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-send-fill me-2"></i>
                    Gửi thông báo
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationsAdmin;
