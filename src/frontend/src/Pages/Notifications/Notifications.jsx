import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../Context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../../Components/Layout';
import { getMyNotifications, markAsRead, markAllAsRead, deleteNotification } from '../../Utils/api';
import LoadingPost from '@/Components/LoadingPost';

function Notifications() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth.token) {
      navigate('/login');
      return;
    }
    loadNotifications();
  }, [auth.token, page]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const limit = 20;
      const skip = (page - 1) * limit;
      const response = await getMyNotifications(auth.token, limit, skip);
      
      if (response.success) {
        if (page === 1) {
          setNotifications(response.notifications);
        } else {
          setNotifications(prev => [...prev, ...response.notifications]);
        }
        setUnreadCount(response.unreadCount);
        setHasMore(response.notifications.length === limit);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await markAsRead(auth.token, notificationId);
      if (response.success) {
        setNotifications(prev =>
          prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await markAllAsRead(auth.token);
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    if (!window.confirm('Bạn có chắc muốn xóa thông báo này?')) return;
    
    try {
      const response = await deleteNotification(auth.token, notificationId);
      if (response.success) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification._id);
    }

    // Navigate based on notification type
    if (notification.type === 'comment' || notification.type === 'like') {
      if (notification.data?.postSlug) {
        navigate(`/post/${notification.data.postSlug}`);
      }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return { icon: 'ph-fill ph-heart', color: '#ff4757', bg: 'rgba(255, 71, 87, 0.1)' };
      case 'comment':
        return { icon: 'ph-fill ph-chat-circle-text', color: '#0d6efd', bg: 'rgba(13, 110, 253, 0.1)' };
      case 'mention':
        return { icon: 'ph-fill ph-at', color: '#5f27cd', bg: 'rgba(95, 39, 205, 0.1)' };
      case 'system':
        return { icon: 'ph-fill ph-bell-ringing', color: '#00d2d3', bg: 'rgba(0, 210, 211, 0.1)' };
      default:
        return { icon: 'ph-fill ph-bell', color: '#6c757d', bg: 'rgba(108, 117, 125, 0.1)' };
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

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  return (
      <div className="">
        <div className="">
          {/* Page Header - Enhanced */}
          <div className="page-header mb-4">
            <div className="page-block">
              <div className="row align-items-center">
                <div className="col-md-12">
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <div>
                      <h2 className="mb-1 fw-bold">
                        <i className="ph-duotone ph-bell me-2" style={{ color: '#4680ff' }}></i>
                        Thông báo của bạn
                      </h2>
                      <p className="text-muted mb-0">
                        <i className="ph ph-check-circle me-1"></i>
                        Theo dõi tất cả hoạt động và cập nhật mới nhất
                      </p>
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                      {unreadCount > 0 && (
                        <div className="badge bg-danger px-3 py-2 d-flex align-items-center gap-2" style={{ fontSize: '14px' }}>
                          <i className="ph-fill ph-bell-ringing"></i>
                          <span>{unreadCount} thông báo mới</span>
                        </div>
                      )}
                      <button
                        className="btn btn-success shadow-sm"
                        onClick={handleMarkAllAsRead}
                        disabled={unreadCount === 0}
                        style={{ minWidth: '200px' }}
                      >
                        <i className="ph-bold ph-check-circle me-2"></i>
                        Đánh dấu tất cả đã đọc
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Content */}
          <div className="row">
            <div className="col-12">
              <div className="card shadow-sm border-0">
                <div className="card-header bg-white border-bottom">
                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-light'} shadow-sm`}
                      onClick={() => setFilter('all')}
                      style={{ borderRadius: '10px', minWidth: '140px' }}
                    >
                      <i className="ph-duotone ph-list-bullets me-2"></i>
                      Tất cả <span className="badge bg-white text-primary ms-1">{notifications.length}</span>
                    </button>
                    <button
                      className={`btn ${filter === 'unread' ? 'btn-primary' : 'btn-light'} shadow-sm`}
                      onClick={() => setFilter('unread')}
                      style={{ borderRadius: '10px', minWidth: '140px' }}
                    >
                      <i className="ph-fill ph-circle me-2"></i>
                      Chưa đọc <span className={`badge ${filter === 'unread' ? 'bg-white text-primary' : 'bg-danger text-white'} ms-1`}>{unreadCount}</span>
                    </button>
                    <button
                      className={`btn ${filter === 'read' ? 'btn-primary' : 'btn-light'} shadow-sm`}
                      onClick={() => setFilter('read')}
                      style={{ borderRadius: '10px', minWidth: '140px' }}
                    >
                      <i className="ph-fill ph-check-circle me-2"></i>
                      Đã đọc <span className="badge bg-white text-primary ms-1">{notifications.length - unreadCount}</span>
                    </button>
                  </div>
                </div>

                <div className="card-body p-0">
                  {loading && page === 1 ? (
                    <LoadingPost count={3} />
                  ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="mb-4">
                        <i className="ph-duotone ph-bell-slash text-muted" style={{ fontSize: '80px', opacity: 0.3 }}></i>
                      </div>
                      <h5 className="text-muted mb-2">
                        {filter === 'all' ? 'Chưa có thông báo nào' : 
                         filter === 'unread' ? 'Không có thông báo chưa đọc' : 
                         'Không có thông báo đã đọc'}
                      </h5>
                      <p className="text-muted mb-0">
                        {filter === 'all' 
                          ? 'Các thông báo mới sẽ xuất hiện tại đây' 
                          : 'Thử chuyển sang tab khác để xem thông báo'}
                      </p>
                    </div>
                  ) : (
                    <div className="list-group list-group-flush">
                      {filteredNotifications.map((notification) => {
                        const iconData = getNotificationIcon(notification.type);
                        return (
                          <div
                            key={notification._id}
                            className={`list-group-item list-group-item-action border-0 ${!notification.read ? 'bg-light bg-opacity-50' : ''}`}
                            style={{ 
                              cursor: 'pointer', 
                              transition: 'all 0.3s ease',
                              borderLeft: !notification.read ? '4px solid #4680ff' : '4px solid transparent',
                              padding: '20px 24px'
                            }}
                          >
                            <div className="d-flex gap-3 align-items-start">
                              {/* Avatar với icon badge - Enhanced */}
                              <div className="flex-shrink-0 position-relative">
                                <img
                                  src={notification.data?.senderAvatar || `https://ui-avatars.com/api/?name=${notification.data?.senderName || 'User'}&background=random`}
                                  alt={notification.data?.senderName}
                                  className="rounded-circle"
                                  style={{ 
                                    width: '56px', 
                                    height: '56px',
                                    objectFit: 'cover',
                                    border: '3px solid white',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                  }}
                                />
                                <div
                                  className="position-absolute bottom-0 end-0 rounded-circle d-flex align-items-center justify-content-center"
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    backgroundColor: iconData.color,
                                    border: '3px solid white',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                  }}
                                >
                                  <i className={iconData.icon} style={{ fontSize: '11px', color: 'white' }}></i>
                                </div>
                              </div>

                              {/* Content - Enhanced */}
                              <div 
                                className="flex-grow-1"
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <div className="flex-grow-1">
                                    <div className="mb-1">
                                      <strong style={{ fontSize: '15px', color: '#2c3e50' }}>
                                        {notification.data?.senderName || 'User'}
                                      </strong>
                                      <span className="text-muted ms-2" style={{ fontSize: '14px' }}>
                                        {notification.type === 'like' && 'đã thích bài viết của bạn'}
                                        {notification.type === 'comment' && 'đã bình luận về bài viết của bạn'}
                                        {notification.type === 'mention' && 'đã nhắc đến bạn'}
                                        {notification.type === 'system' && notification.data?.message}
                                      </span>
                                    </div>
                                  </div>
                                  {!notification.read && (
                                    <span
                                      className="badge rounded-pill bg-primary"
                                      style={{
                                        fontSize: '10px',
                                        padding: '4px 8px',
                                        boxShadow: '0 2px 8px rgba(70, 128, 255, 0.3)'
                                      }}
                                    >
                                      MỚI
                                    </span>
                                  )}
                                </div>

                                {notification.data?.postTitle && (
                                  <div className="mb-2 p-2 rounded" style={{ backgroundColor: 'rgba(70, 128, 255, 0.05)' }}>
                                    <div className="d-flex align-items-center gap-2">
                                      <i className="ph-duotone ph-article text-primary" style={{ fontSize: '16px' }}></i>
                                      <span className="text-truncate fw-medium" style={{ fontSize: '14px', color: '#495057' }}>
                                        {notification.data.postTitle}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {notification.data?.commentContent && (
                                  <div
                                    className="text-muted fst-italic p-3 rounded mb-2"
                                    style={{
                                      fontSize: '13px',
                                      backgroundColor: 'rgba(0,0,0,0.03)',
                                      border: '1px solid rgba(0,0,0,0.05)',
                                      lineHeight: '1.5'
                                    }}
                                  >
                                    <i className="ph ph-quotes me-1"></i>
                                    {notification.data.commentContent}
                                  </div>
                                )}

                                <div className="d-flex justify-content-between align-items-center mt-3">
                                  <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: '13px' }}>
                                    <i className="ph-duotone ph-clock"></i>
                                    <span>{getTimeAgo(notification.createdAt)}</span>
                                  </div>
                                  
                                  <div className="d-flex gap-2">
                                    {!notification.read && (
                                      <button
                                        className="btn btn-sm btn-light rounded-pill px-3"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMarkAsRead(notification._id);
                                        }}
                                        title="Đánh dấu đã đọc"
                                        style={{ fontSize: '13px' }}
                                      >
                                        <i className="ph-bold ph-check me-1"></i>
                                        Đánh dấu đã đọc
                                      </button>
                                    )}
                                    <button
                                      className="btn btn-sm btn-light text-danger rounded-circle"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(notification._id);
                                      }}
                                      title="Xóa"
                                      style={{ width: '32px', height: '32px', padding: 0 }}
                                    >
                                      <i className="ph-bold ph-trash"></i>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Load More Button - Enhanced */}
                  {hasMore && filteredNotifications.length > 0 && (
                    <div className="text-center p-4 border-top bg-light">
                      <button
                        className="btn btn-outline-primary rounded-pill px-5 shadow-sm"
                        onClick={() => setPage(prev => prev + 1)}
                        disabled={loading}
                        style={{ minWidth: '200px' }}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Đang tải thêm...
                          </>
                        ) : (
                          <>
                            <i className="ph-bold ph-arrow-down me-2"></i>
                            Xem thêm thông báo
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

export default Notifications;
