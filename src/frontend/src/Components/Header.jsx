import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { forwardRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../Utils/api';
const { socket } = require('../Utils/socket');

const ArrowMenuIcon = ({
  width = 24,
  height = 24,
  fill = "#5e72e4",
  className = "",
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 24 24"
    className={className}
    {...props}
  >
    <path
      d="M11.075 4.258c-.79.641-1.282 1.679-1.427 3.367a.75.75 0 1 1-1.495-.13c.165-1.911.753-3.409 1.977-4.402 1.204-.977 2.887-1.353 4.98-1.353h.13c2.31 0 4.121.458 5.337 1.674C21.793 4.629 22.25 6.44 22.25 8.75v6.52c0 2.31-.457 4.121-1.673 5.337S17.55 22.28 15.24 22.28h-.13c-2.078 0-3.75-.37-4.952-1.332-1.223-.978-1.819-2.454-1.994-4.338a.75.75 0 1 1 1.493-.14c.155 1.656.649 2.676 1.438 3.307.811.649 2.074 1.003 4.015 1.003h.13c2.161 0 3.48-.437 4.276-1.234.797-.797 1.234-2.115 1.234-4.276V8.75c0-2.16-.437-3.479-1.234-4.276-.796-.797-2.115-1.234-4.276-1.234h-.13c-1.956 0-3.223.36-4.034 1.018z"
      fill={fill}
    />
    <path
      opacity=".4"
      d="M2.87 12a.75.75 0 0 1 .75-.75H15a.75.75 0 1 1 0 1.5H3.62a.75.75 0 0 1-.75-.75z"
      fill={fill}
    />
    <path
      opacity=".4"
      d="M6.38 8.12a.75.75 0 0 1 0 1.06L3.56 12l2.82 2.82a.75.75 0 1 1-1.06 1.06l-3.35-3.35a.75.75 0 0 1 0-1.06l3.35-3.35a.75.75 0 0 1 1.06 0z"
      fill={fill}
    />
  </svg>
);

const FilterSettingsIcon = ({
  width = 24,
  height = 24,
  fill = "#138d42ff",
  className = "",
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 512 512"
    fill={fill}
    className={className}
    {...props}
  >
    <path d="M490.667 405.333h-56.811C424.619 374.592 396.373 352 362.667 352s-61.931 22.592-71.189 53.333H21.333C9.557 405.333 0 414.891 0 426.667S9.557 448 21.333 448h270.144c9.237 30.741 37.483 53.333 71.189 53.333s61.931-22.592 71.189-53.333h56.811c11.797 0 21.333-9.557 21.333-21.333s-9.535-21.334-21.332-21.334zm-128 53.334c-17.643 0-32-14.357-32-32s14.357-32 32-32 32 14.357 32 32-14.358 32-32 32zM490.667 64h-56.811c-9.259-30.741-37.483-53.333-71.189-53.333S300.736 33.259 291.477 64H21.333C9.557 64 0 73.557 0 85.333s9.557 21.333 21.333 21.333h270.144C300.736 137.408 328.96 160 362.667 160s61.931-22.592 71.189-53.333h56.811c11.797 0 21.333-9.557 21.333-21.333S502.464 64 490.667 64zm-128 53.333c-17.643 0-32-14.357-32-32s14.357-32 32-32 32 14.357 32 32-14.358 32-32 32zM490.667 234.667H220.523c-9.259-30.741-37.483-53.333-71.189-53.333s-61.931 22.592-71.189 53.333H21.333C9.557 234.667 0 244.224 0 256c0 11.776 9.557 21.333 21.333 21.333h56.811c9.259 30.741 37.483 53.333 71.189 53.333s61.931-22.592 71.189-53.333h270.144c11.797 0 21.333-9.557 21.333-21.333.001-11.776-9.535-21.333-21.332-21.333zM149.333 288c-17.643 0-32-14.357-32-32s14.357-32 32-32 32 14.357 32 32-14.357 32-32 32z" />
  </svg>
);


export default function Header({ user }) {
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const navigate = useNavigate();

  // Fetch notifications on mount
  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      setLoadingNotifications(true);
      try {
        const data = await getNotifications(token);
        if (data.success) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();

    // Setup socket listener for new notifications
    const handleNewNotification = ({ userId, notification }) => {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Decode token to get current user ID
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        const currentUserId = decoded._id || decoded.userId || decoded.id;

        // Only update if notification is for current user
        if (String(userId) === String(currentUserId)) {
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show browser notification if permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Thông báo mới', {
              body: notification.data?.message || 'Bạn có thông báo mới',
              icon: '/favicon.ico'
            });
          }
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    };

    socket.on('notification:new', handleNewNotification);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, []);

  const handleActiveMenu = (e) => {
    e.stopPropagation();

    // Lấy sidebar element
    const sidebar = document.querySelector(".pc-sidebar");

    // Toggle class cho sidebar và body
    if (sidebar) {
      sidebar.classList.toggle("open");
      document.body.classList.toggle("pc-sidebar-collapse");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Xử lý đóng user menu
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }

      // Xử lý đóng search dropdown
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setShowSearch(false);
      }

      // Xử lý đóng notification dropdown
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }

      // Tự động đóng sidebar trên mobile khi click bên ngoài
      if (window.innerWidth <= 1024) {
        const sidebar = document.querySelector(".pc-sidebar");
        if (
          sidebar &&
          sidebar.classList.contains("open") &&
          !sidebar.contains(event.target)
        ) {
          sidebar.classList.remove("open");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Mark as read
      if (!notification.read) {
        await markNotificationAsRead(token, notification._id);
        setNotifications(prev =>
          prev.map(n =>
            n._id === notification._id ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Navigate to post if available
      if (notification.data?.postSlug) {
        navigate(`/post/${notification.data.postSlug}`);
        setShowNotifications(false);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await markAllNotificationsAsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now - notificationDate) / 1000);

    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    return notificationDate.toLocaleDateString('vi-VN');
  };

  return (
    <header className="pc-header">
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }

        @keyframes bellRing {
          0%, 100% {
            transform: rotate(0deg);
          }
          10%, 30%, 50%, 70% {
            transform: rotate(-10deg);
          }
          20%, 40%, 60%, 80% {
            transform: rotate(10deg);
          }
          90% {
            transform: rotate(0deg);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .notification-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .notification-scroll::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .notification-scroll::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }

        .notification-scroll::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        .list-group-item:hover {
          background-color: #f8f9fa !important;
          transform: translateX(2px);
        }

        .list-group-item:active {
          transform: scale(0.98);
        }
      `}</style>
      <div className="header-wrapper">
        {/* [Mobile Media Block] */}
        <div className="me-auto pc-mob-drp">
          <ul className="list-unstyled">
            <li
              onClick={handleActiveMenu}
              className="pc-h-item pc-sidebar-collapse"
            >
              <span className="pc-head-link ms-0" id="sidebar-hide">
                <i className="ti ti-menu-2"></i>
              </span>
            </li>
            <li
              onClick={handleActiveMenu}
              className="pc-h-item pc-sidebar-popup"
            >
              <span className="pc-head-link ms-0" id="mobile-collapse">
                <i className="ti ti-menu-2"></i>
              </span>
            </li>

            <li className="dropdown pc-h-item" ref={searchRef}>
              <span
                className="pc-head-link arrow-none m-0 trig-drp-search"
                onClick={() => setShowSearch(!showSearch)}
              >
                <i className="ph-duotone ph-magnifying-glass icon-search"></i>
              </span>
              {showSearch && (
                <div className="dropdown-menu drp-search show">
                  <form className="px-3 py-2">
                    <input
                      type="search"
                      className="form-control border-0 shadow-none"
                      placeholder="Search here. . ."
                    />
                  </form>
                </div>
              )}
            </li>
          </ul>
        </div>

        {/* [User Block] */}
        <div className="ms-auto">
          <ul>
            <li className="dropdown pc-h-item d-none d-md-inline-flex" ref={userMenuRef}>
              <button
                type="button"
                className="pc-head-link dropdown-toggle arrow-none me-0 btn btn-link p-0 border-0"
                data-bs-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                <i className="ph-duotone ph-sun-dim"></i>
              </button>
              <div className="dropdown-menu dropdown-menu-end pc-h-dropdown">
                <button className="dropdown-item" type="button" > <i className="ph-duotone ph-moon"></i> <span>Dark</span></button>
                <button className="dropdown-item" type="button" > <i className="ph-duotone ph-sun-dim"></i> <span>Light</span></button>
                <button className="dropdown-item" type="button" > <i className="ph-duotone ph-cpu"></i> <span>Default</span></button>
              </div>
            </li>
            <li className="dropdown pc-h-item header-user-profile" ref={notificationRef}>
              <button
                type="button"
                className="pc-head-link dropdown-toggle arrow-none me-0 btn btn-link p-0 border-0 position-relative"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-haspopup="true"
                aria-expanded={showNotifications}
                style={{ transition: 'all 0.3s ease' }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none"
                  style={{ 
                    filter: unreadCount > 0 ? 'drop-shadow(0 0 8px rgba(220, 53, 69, 0.5))' : 'none',
                    animation: unreadCount > 0 ? 'bellRing 2s infinite' : 'none'
                  }}
                >
                  <path 
                    d="M12 2C11.4477 2 11 2.44772 11 3V3.17071C8.83481 3.58254 7.23129 5.37852 7.02393 7.57442L6.65896 11.3178C6.56559 12.2831 6.1256 13.186 5.41602 13.8486L3.51472 15.6087C2.64031 16.4186 3.21735 18 4.41472 18H19.5853C20.7827 18 21.3597 16.4186 20.4853 15.6087L18.584 13.8486C17.8744 13.186 17.4344 12.2831 17.341 11.3178L16.9761 7.57442C16.7687 5.37852 15.1652 3.58254 13 3.17071V3C13 2.44772 12.5523 2 12 2Z" 
                    fill="currentColor"
                    opacity="0.2"
                  />
                  <path 
                    d="M12 2C11.4477 2 11 2.44772 11 3V3.17071C8.83481 3.58254 7.23129 5.37852 7.02393 7.57442L6.65896 11.3178C6.56559 12.2831 6.1256 13.186 5.41602 13.8486L3.51472 15.6087C2.64031 16.4186 3.21735 18 4.41472 18H19.5853C20.7827 18 21.3597 16.4186 20.4853 15.6087L18.584 13.8486C17.8744 13.186 17.4344 12.2831 17.341 11.3178L16.9761 7.57442C16.7687 5.37852 15.1652 3.58254 13 3.17071V3C13 2.44772 12.5523 2 12 2Z" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <path 
                    d="M9 18C9 19.1046 10.3431 20 12 20C13.6569 20 15 19.1046 15 18" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  {unreadCount > 0 && (
                    <circle 
                      cx="18" 
                      cy="6" 
                      r="4" 
                      fill="#dc3545"
                      stroke="white"
                      strokeWidth="2"
                    />
                  )}
                </svg>
                {unreadCount > 0 && (
                  <span 
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style={{
                      fontSize: '10px',
                      padding: '3px 6px',
                      minWidth: '18px',
                      animation: 'pulse 2s infinite',
                      boxShadow: '0 0 10px rgba(220, 53, 69, 0.5)'
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div 
                  className="dropdown-menu dropdown-menu-end pc-h-dropdown show"
                  style={{
                    width: '360px',
                    maxWidth: '90vw',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '12px',
                    animation: 'slideDown 0.3s ease'
                  }}
                >
                  <div 
                    className="dropdown-header d-flex align-items-center justify-content-between py-3 px-4"
                    style={{ borderBottom: '1px solid #e9ecef' }}
                  >
                    <h5 className="m-0 fw-bold" style={{ fontSize: '18px' }}>
                      Thông báo
                      {unreadCount > 0 && (
                        <span className="badge bg-primary ms-2" style={{ fontSize: '11px' }}>
                          {unreadCount} mới
                        </span>
                      )}
                    </h5>
                    {unreadCount > 0 && (
                      <button
                        className="btn btn-link btn-sm text-primary text-decoration-none p-0"
                        onClick={handleMarkAllAsRead}
                        style={{ fontSize: '13px', fontWeight: '500' }}
                      >
                        <i className="ph ph-check-circle me-1"></i>
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                  <div className="dropdown-body p-0">
                    <div
                      className="notification-scroll position-relative"
                      style={{ 
                        maxHeight: "400px", 
                        overflowY: "auto",
                        overflowX: "hidden"
                      }}
                    >
                      {loadingNotifications ? (
                        <div className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <p className="text-muted mt-2 mb-0">Đang tải thông báo...</p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="text-center text-muted py-5">
                          <i className="ph-duotone ph-bell-slash" style={{ fontSize: '64px', opacity: 0.3 }}></i>
                          <p className="mb-0 mt-3 fw-semibold">Không có thông báo</p>
                          <small className="text-muted">Bạn sẽ nhận được thông báo tại đây</small>
                        </div>
                      ) : (
                        <div className="list-group list-group-flush">
                          {notifications.map((notification) => (
                            <div
                              key={notification._id}
                              className={`list-group-item list-group-item-action border-0 ${!notification.read ? 'bg-light' : ''}`}
                              onClick={() => handleNotificationClick(notification)}
                              style={{
                                cursor: 'pointer',
                                borderLeft: !notification.read ? '3px solid #0d6efd' : '3px solid transparent',
                                transition: 'all 0.2s ease',
                                padding: '12px 16px'
                              }}
                            >
                              <div className="d-flex align-items-start gap-3">
                                {/* Avatar */}
                                <div className="flex-shrink-0 position-relative">
                                  <img
                                    src={notification.data?.senderAvatar || `https://ui-avatars.com/api/?name=${notification.data?.senderName || 'User'}&background=random`}
                                    alt="avatar"
                                    className="rounded-circle"
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      objectFit: 'cover',
                                      border: '2px solid white',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                  />
                                  {/* Type badge */}
                                  <div
                                    className="position-absolute bottom-0 end-0 rounded-circle d-flex align-items-center justify-content-center"
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      backgroundColor: notification.type === 'like' ? '#ff4757' : '#0d6efd',
                                      border: '2px solid white'
                                    }}
                                  >
                                    {notification.type === 'like' ? (
                                      <i className="ph-fill ph-heart text-white" style={{ fontSize: '11px' }}></i>
                                    ) : (
                                      <i className="ph-fill ph-chat-circle-text text-white" style={{ fontSize: '11px' }}></i>
                                    )}
                                  </div>
                                </div>

                                {/* Content */}
                                <div className="flex-grow-1 min-width-0">
                                  <p className="mb-1 text-dark" style={{ fontSize: '14px', lineHeight: '1.4' }}>
                                    <strong>{notification.data?.senderName || 'Người dùng'}</strong>
                                    {' '}
                                    <span className="text-muted">
                                      {notification.type === 'like' ? 'đã thích bài viết của bạn' : 
                                       notification.type === 'comment' ? 'đã bình luận bài viết của bạn' :
                                       'có hoạt động mới'}
                                    </span>
                                  </p>
                                  
                                  {notification.data?.postTitle && (
                                    <p 
                                      className="text-muted mb-1 text-truncate" 
                                      style={{ fontSize: '13px' }}
                                      title={notification.data.postTitle}
                                    >
                                      <i className="ph ph-article me-1"></i>
                                      {notification.data.postTitle}
                                    </p>
                                  )}
                                  
                                  {notification.data?.commentContent && (
                                    <p 
                                      className="text-muted mb-1 fst-italic text-truncate" 
                                      style={{ 
                                        fontSize: '12px',
                                        backgroundColor: 'rgba(13, 110, 253, 0.05)',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        borderLeft: '2px solid rgba(13, 110, 253, 0.3)'
                                      }}
                                    >
                                      "{notification.data.commentContent.substring(0, 60)}{notification.data.commentContent.length > 60 ? '...' : ''}"
                                    </p>
                                  )}
                                  
                                  <small className="text-muted d-flex align-items-center gap-1" style={{ fontSize: '12px' }}>
                                    <i className="ph ph-clock"></i>
                                    {formatTimeAgo(notification.createdAt)}
                                  </small>
                                </div>

                                {/* Unread indicator */}
                                {!notification.read && (
                                  <div className="flex-shrink-0">
                                    <span
                                      className="d-inline-block rounded-circle bg-primary"
                                      style={{ 
                                        width: '10px', 
                                        height: '10px',
                                        boxShadow: '0 0 0 3px rgba(13, 110, 253, 0.2)'
                                      }}
                                    ></span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {notifications.length > 0 && (
                    <div 
                      className="dropdown-footer text-center py-2 border-top"
                      style={{ backgroundColor: '#f8f9fa' }}
                    >
                      <button 
                        className="btn btn-link btn-sm text-primary text-decoration-none"
                        onClick={() => {
                          navigate('/notifications');
                          setShowNotifications(false);
                        }}
                        style={{ fontSize: '13px', fontWeight: '500' }}
                      >
                        Xem tất cả thông báo
                        <i className="ph ph-arrow-right ms-1"></i>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
            {/* Tin nhắn - Tạm thời ẩn cho đến khi có API */}
            {false && (
              <li
                className="dropdown pc-h-item header-user-profile"
                ref={searchRef}
              >
                <button
                  type="button"
                  className="pc-head-link dropdown-toggle arrow-none me-0 btn btn-link p-0 border-0"
                  data-bs-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="false"
                >
                  <i className="ph-duotone ph-chat-circle-dots icon-message"></i>
                  <span className="notification-badge">0</span>
                </button>
                <div className="dropdown-menu dropdown-menu-end pc-h-dropdown">
                  <div className="dropdown-header d-flex align-items-center justify-content-between">
                    <h5 className="m-0">Tin nhắn</h5>
                  </div>
                  <div className="dropdown-body">
                    <div
                      className="message-scroll position-relative"
                      style={{ maxHeight: "calc(100vh - 225px)" }}
                    >
                      <div className="dropdown-item text-center text-muted py-4">
                        <i className="ph-duotone ph-chat-circle-slash" style={{ fontSize: '48px' }}></i>
                        <p className="mb-0 mt-2">Chưa có tin nhắn</p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            )}
            <li
              className="dropdown pc-h-item header-user-profile"
              ref={userMenuRef}
            >
              <span
                className="pc-head-link dropdown-toggle arrow-none me-0"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <img
                  src={user && user.avatarUrl || `https://ui-avatars.com/api/?background=random&name=user`}
                  alt="user-avatar"
                  className="user-avtar"
                  width={40}
                  height={40}
                />
              </span>
              {showUserMenu && (
                <div
                  className="dropdown-menu dropdown-user-profile dropdown-menu-end pc-h-dropdown show"
                  data-popper-placement="bottom-end"
                  style={{
                    position: "absolute",
                    inset: "0px 0px auto auto",
                    margin: 0,
                    transform: "translate(0px, 61px)",
                  }}
                >
                  {/* <div className="dropdown-header d-flex align-items-center justify-content-between">
                    <h5 className="m-0">Thông tin</h5>
                  </div> */}
                  <div className="dropdown-body">
                    <div
                      className="profile-notification-scroll position-relative"
                      style={{ maxHeight: "calc(100vh - 225px)" }}
                    >
                      <div className="d-flex mb-1">
                        <div className="flex-shrink-0">
                          <img
                            src={user && user.avatarUrl || `https://ui-avatars.com/api/?background=random&name=user`}

                            alt="user-avatar"
                            className="user-avtar wid-35"
                            width={40}
                            height={40}
                          />
                        </div>
                        <div>
                          <h6 className="ms-3 mb-0 mt-2" style={{ fontSize: '16px' }}>
                            {user?.displayName || "Vui Lòng Đăng Nhập"}
                          </h6>
                        </div>
                      </div>

                      <hr className="border-secondary border-opacity-50" />
                      {/* <div className="d-flex mb-1">
                        <div className="flex-shrink-0">

                        </div>
                        <div>
                          <h6 className="ms-3 mb-0 mt-2" style={{ fontSize: '16px' }}>
                            <Link to={`/user/${user?.username}`} className="dropdown-item">
                              <i className="ph ph-user-circle me-2" style={{ fontSize: '20px' }}></i>
                              Trang cá nhân
                            </Link>
                          </h6>
                        </div>
                      </div> */}
                      <div className="d-flex mb-1">
                        <div className="flex-shrink-0">

                        </div>
                        <div>
                          <h6 className="ms-3 mb-0 mt-2" style={{ fontSize: '16px' }}>
                            <Link to="/profile" className="dropdown-item">
                              <FilterSettingsIcon
                                width={20}
                                height={20}
                                fill="#5ee491ff"
                              /> Cài đặt tài khoản
                            </Link>
                          </h6>
                        </div>
                      </div>
                      <div className="d-flex mb-1">
                        <div className="flex-shrink-0">
                        </div>
                        <div>
                          <h6 className="ms-3 mb-0 mt-2" style={{ fontSize: '16px' }}>
                            <Link onClick={
                              () => {
                                localStorage.removeItem("token");
                                window.location.reload();
                              }
                            } to="/profile" className="dropdown-item">
                              <ArrowMenuIcon
                                width={20}
                                height={20}
                                fill="#5ee491ff"
                              />
                              Đăng xuất
                            </Link>
                          </h6>
                        </div>
                      </div>
                      {/* <div className="d-flex mb-1">
                        <div className="flex-shrink-0">
                        </div>
                        <div>
                              />
                              Đăng xuất
                            </Link>
                          </h6>
                        </div>
                      </div>
                      {/* <div className="d-flex mb-1">
                        <div className="flex-shrink-0">
                        </div>
                        <div>
                          <h6 className="ms-3 mb-0 mt-2" style={{ fontSize: '16px' }}>
                            <Link to="/profile" className="dropdown-item">
                              <i className="ti ti-user me-2 text-muted"></i> Thông
                              tin tài khoản
                            </Link>
                          </h6>
                        </div>
                      </div>
                      <div className="d-flex mb-1">
                        <div className="flex-shrink-0">
                        </div>
                        <div>
                          <h6 className="ms-3 mb-0 mt-2" style={{ fontSize: '16px' }}>
                            <Link to="/profile" className="dropdown-item">
                              <i className="ti ti-user me-2 text-muted"></i> Thông
                              tin tài khoản
                            </Link>
                          </h6>
                        </div>
                      </div> */}
                      <hr className="border-secondary border-opacity-50" />

                    </div>
                  </div>
                </div>
              )}
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
