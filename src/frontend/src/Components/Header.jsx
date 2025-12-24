import React, { useContext } from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { forwardRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../Context/AuthContext';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getMyConversations } from '../Utils/api';
import LoadingPost from './LoadingPost';
import { onPrivateNotify, offPrivateNotify } from '../Utils/socket';
const { socket } = require('../Utils/socket');


export default function Header({ user }) {
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Messages state
  const [showMessages, setShowMessages] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const messagesRef = useRef(null);
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const token = auth.token;

  // Refs for message tracking (like ListChat)
  const processedMessagesRef = useRef(new Set());
  const lastMessageTimestampRef = useRef({});
  const conversationsRef = useRef(conversations);
  const messageHandlerRef = useRef(null);
  const stableHandlerRef = useRef(null);

  // Update conversationsRef whenever conversations change
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Fetch notifications on mount
  useEffect(() => {
    const fetchNotifications = async () => {
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

    if (token) {
      fetchNotifications();
    }

    // Setup socket listener for new notifications
    const handleNewNotification = ({ userId, notification }) => {
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

  // Fetch conversations function (reusable)
  const fetchConversations = useCallback(async () => {
    if (!token) return;

    setLoadingMessages(true);
    try {
      const result = await getMyConversations(token);
      const data = result.data || [];

      setConversations(data.slice(0, 5)); // Chỉ lấy 5 conversation gần nhất

      // Calculate total unread
      const totalUnread = data.reduce((sum, conv) => {
        return sum + (conv.unreadCount || 0);
      }, 0);

      setUnreadMessagesCount(totalUnread);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, [token]);

  // Initial load of conversations
  useEffect(() => {
    if (token) {
      fetchConversations();
    }
  }, [token, fetchConversations]);

  // Handle incoming messages (like ListChat)
  const handlePrivateNotify = useCallback((data) => {
    console.log('📬 [Header] Received private:notify:', data);
    
    if (!token || !user) {
      console.log('❌ [Header] No token or user, ignoring message');
      return;
    }

    const { fromUserId, message } = data;
    const fromUserIdStr = String(fromUserId);
    const myIdStr = String(user.id || user._id);

    console.log('📊 [Header] Processing message from:', fromUserIdStr, 'My ID:', myIdStr);

    // Create unique message ID to prevent duplicates
    const attachmentSignature = Array.isArray(message?.attachments)
      ? message.attachments
        .map((att) => att?._id || att?.storageUrl || att?.filename || att?.originalname || '')
        .join('|')
      : '';
    const createdAtTs = message?.createdAt ? new Date(message.createdAt).getTime() : Date.now();
    const messageId = [
      fromUserIdStr,
      message?._id || createdAtTs,
      message?.text || '',
      attachmentSignature,
    ].join('::');

    // Check for stale/duplicate messages
    const lastTimestamp = lastMessageTimestampRef.current[fromUserIdStr];
    if (lastTimestamp && createdAtTs <= lastTimestamp) {
      console.log('⚠️ [Header] Stale message, ignoring');
      return; // Ignore stale message
    }
    lastMessageTimestampRef.current[fromUserIdStr] = createdAtTs;

    // Check if already processed
    if (processedMessagesRef.current.has(messageId)) {
      console.log('⚠️ [Header] Duplicate message, ignoring');
      return; // Ignore duplicate
    }

    // Mark as processed
    processedMessagesRef.current.add(messageId);

    // Clean up old message IDs (keep only last 50)
    if (processedMessagesRef.current.size > 50) {
      const arr = Array.from(processedMessagesRef.current);
      processedMessagesRef.current = new Set(arr.slice(-50));
    }

    // Ignore messages from self
    if (fromUserIdStr === myIdStr) {
      console.log('🚫 [Header] Message from self, ignoring');
      return;
    }

    console.log('✅ [Header] Processing new message, updating conversations');

    // Update conversations list
    const prevConversations = conversationsRef.current || [];
    const convIdx = prevConversations.findIndex(
      (c) => String(c.peer?._id) === fromUserIdStr
    );

    if (convIdx !== -1) {
      // Update existing conversation
      console.log('📝 [Header] Updating existing conversation');
      
      // Increment unread count
      setUnreadMessagesCount(prev => {
        const newCount = prev + 1;
        console.log('🔢 [Header] Unread count:', prev, '→', newCount);
        return newCount;
      });

      // Move conversation to top and update last message
      const updated = [...prevConversations];
      const [movedConv] = updated.splice(convIdx, 1);
      movedConv.lastMessage = message?.text || '[File]';
      movedConv.lastMessageAt = message?.createdAt || new Date().toISOString();
      movedConv.unreadCount = (movedConv.unreadCount || 0) + 1;
      updated.unshift(movedConv);

      setConversations(updated.slice(0, 5));
    } else {
      // New conversation, refresh list
      console.log('🆕 [Header] New conversation, refreshing list');
      fetchConversations();
    }
  }, [token, user, fetchConversations]);

  // Store handler in ref
  useEffect(() => {
    messageHandlerRef.current = handlePrivateNotify;
  }, [handlePrivateNotify]);

  // Register socket listener with stable wrapper (like ListChat)
  useEffect(() => {
    // Create stable wrapper ONCE and store in ref
    if (!stableHandlerRef.current) {
      stableHandlerRef.current = (data) => {
        if (messageHandlerRef.current) {
          messageHandlerRef.current(data);
        }
      };
    }

    // Only register if we have auth and haven't registered yet
    if (token && user) {
      console.log('🔔 [Header] Registering socket listener for chat:private:notify');
      onPrivateNotify(stableHandlerRef.current);
    }

    return () => {
      // Only cleanup if we have the stable handler
      if (stableHandlerRef.current) {
        console.log('🔕 [Header] Unregistering socket listener for chat:private:notify');
        offPrivateNotify(stableHandlerRef.current);
      }
    };
  }, []); // Empty deps - register only once on mount

  // Re-register listener when tab becomes visible (like ListChat)
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && token && user && stableHandlerRef.current) {
        console.log('👁️ [Header] Tab visible, re-registering socket listener');
        offPrivateNotify(stableHandlerRef.current);
        onPrivateNotify(stableHandlerRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [token, user]);

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

      // Xử lý đóng messages dropdown
      if (
        messagesRef.current &&
        !messagesRef.current.contains(event.target)
      ) {
        setShowMessages(false);
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
    if (!token) return;

    try {
      await markAllNotificationsAsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Handle conversation click
  const handleConversationClick = (conversation) => {
    const peer = conversation.peer;
    
    // Mark as read locally if there are unread messages
    if (conversation.unreadCount > 0) {
      const unreadAmount = conversation.unreadCount;
      
      // Update the conversations list
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversation._id 
            ? { ...conv, unreadCount: 0 } 
            : conv
        )
      );
      
      // Decrease total unread count
      setUnreadMessagesCount(prev => Math.max(0, prev - unreadAmount));
    }
    
    // Navigate to chat
    navigate(`/message/${peer?.username || ''}`);
    setShowMessages(false);
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
    <header className="pc-header" style={{ overflow: 'visible', paddingTop: '4px', paddingBottom: '4px' }}>
      <style>{`
        /* Header Overflow Fix */
        .pc-header {
          overflow: visible !important;
        }

        .pc-header .header-wrapper {
          overflow: visible !important;
          padding-top: 4px;
          padding-bottom: 4px;
        }

        .pc-h-item {
          position: relative;
          overflow: visible !important;
        }

        .ms-auto, .ms-auto ul {
          overflow: visible !important;
        }

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

        /* User Menu Dropdown Styles */
        .dropdown-item {
          transition: all 0.2s ease;
        }

        .dropdown-item:hover {
          background-color: #f0f2f5 !important;
          transform: translateX(2px);
        }

        .dropdown-item:active {
          transform: scale(0.98);
        }

        .dropdown-user-profile {
          min-width: 280px;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.15);
          border: 1px solid rgba(0,0,0,0.1);
        }

        .dropdown-divider {
          margin: 8px 0;
          opacity: 0.1;
        }

        /* Header Icons */
        .pc-head-link {
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .pc-head-link:hover {
          background-color: rgba(13, 110, 253, 0.12) !important;
          transform: translateY(-1px);
        }

        .pc-head-link:active {
          transform: translateY(0);
        }

        .user-avtar {
          transition: all 0.3s ease;
        }

        .user-avtar:hover {
          transform: scale(1.05);
          border-color: #0d6efd !important;
        }
      `}</style>
      <div className="header-wrapper" style={{ overflow: 'visible', position: 'relative' }}>
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

            {/* <li className="dropdown pc-h-item" ref={searchRef}>
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
            </li> */}
          </ul>
        </div>

        {/* [User Block] */}
        <div className="ms-auto" style={{ overflow: 'visible' }}>
          <ul className="list-unstyled d-flex align-items-center m-0 gap-2" style={{ overflow: 'visible' }}>
            <li className="dropdown pc-h-item header-user-profile d-flex align-items-center" ref={notificationRef} style={{ marginRight: '8px', overflow: 'visible', padding: '8px 0' }}>
              <button
                type="button"
                className="pc-head-link dropdown-toggle arrow-none me-0 btn btn-link border-0 position-relative"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-haspopup="true"
                aria-expanded={showNotifications}
                style={{ 
                  transition: 'all 0.3s ease',
                  padding: '12px',
                  borderRadius: '12px',
                  background: showNotifications ? 'rgba(13, 110, 253, 0.08)' : 'transparent',
                  minWidth: '48px',
                  minHeight: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
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
                    className="position-absolute badge rounded-pill bg-danger"
                    style={{
                      top: '2px',
                      right: '2px',
                      fontSize: '10px',
                      padding: '3px 6px',
                      minWidth: '20px',
                      fontWeight: '600',
                      animation: 'pulse 2s infinite',
                      boxShadow: '0 2px 8px rgba(220, 53, 69, 0.4)',
                      border: '2px solid white',
                      zIndex: 10
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
                    animation: 'slideDown 0.3s ease',
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    zIndex: 9999,
                    marginTop: '8px'
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
                        <LoadingPost count={3} />
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
                                      backgroundColor: notification.type === 'like' ? '#ff4757' :
                                        notification.type === 'comment' ? '#0d6efd' :
                                          notification.type === 'system' ? '#00d2d3' : '#6c757d',
                                      border: '2px solid white'
                                    }}
                                  >
                                    {notification.type === 'like' ? (
                                      <i className="ph-fill ph-heart text-white" style={{ fontSize: '11px' }}></i>
                                    ) : notification.type === 'comment' ? (
                                      <i className="ph-fill ph-chat-circle-text text-white" style={{ fontSize: '11px' }}></i>
                                    ) : notification.type === 'system' ? (
                                      <i className="ph-fill ph-bell-ringing text-white" style={{ fontSize: '11px' }}></i>
                                    ) : (
                                      <i className="ph-fill ph-bell text-white" style={{ fontSize: '11px' }}></i>
                                    )}
                                  </div>
                                </div>

                                {/* Content */}
                                <div className="flex-grow-1 min-width-0">
                                  <p className="mb-1 text-dark" style={{ fontSize: '14px', lineHeight: '1.4' }}>
                                    <strong>{notification.data?.senderName || (notification.type === 'system' ? 'Hệ thống' : 'Người dùng')}</strong>
                                    {notification.type === 'system' && notification.data?.senderUsername && (
                                      <span className="badge bg-danger ms-1" style={{ fontSize: '9px', padding: '2px 6px' }}>
                                        <i className="ph-fill ph-shield-check" style={{ fontSize: '8px' }}></i> ADMIN
                                      </span>
                                    )}
                                    {' '}
                                    <span className="text-muted">
                                      {notification.type === 'like' ? 'đã thích bài viết của bạn' :
                                        notification.type === 'comment' ? 'đã bình luận bài viết của bạn' :
                                          notification.type === 'system' ? '' :
                                            'có hoạt động mới'}
                                    </span>
                                  </p>

                                  {notification.type === 'system' && notification.data?.message && (
                                    <div
                                      className="mb-1 p-2 rounded d-flex align-items-start gap-2"
                                      style={{
                                        fontSize: '13px',
                                        backgroundColor: 'rgba(0, 210, 211, 0.08)',
                                        border: '1px solid rgba(0, 210, 211, 0.2)',
                                        lineHeight: '1.5'
                                      }}
                                    >
                                      <i className="ph-fill ph-info text-info" style={{ fontSize: '16px', marginTop: '1px', flexShrink: 0 }}></i>
                                      <span className="text-dark" style={{ wordBreak: 'break-word' }}>
                                        {notification.data.message}
                                      </span>
                                    </div>
                                  )}

                                  {notification.data?.postTitle && notification.type !== 'system' && (
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
            {/* Messages Dropdown */}
            <li className="dropdown pc-h-item header-user-profile d-flex align-items-center" ref={messagesRef} style={{ marginRight: '8px', overflow: 'visible', padding: '8px 0' }}>
              <button
                type="button"
                className="pc-head-link dropdown-toggle arrow-none me-0 btn btn-link border-0 position-relative"
                onClick={() => setShowMessages(!showMessages)}
                aria-haspopup="true"
                aria-expanded={showMessages}
                style={{ 
                  transition: 'all 0.3s ease',
                  padding: '12px',
                  borderRadius: '12px',
                  background: showMessages ? 'rgba(13, 110, 253, 0.08)' : 'transparent',
                  minWidth: '48px',
                  minHeight: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{
                    filter: unreadMessagesCount > 0 ? 'drop-shadow(0 0 6px rgba(0, 123, 255, 0.4))' : 'none'
                  }}
                >
                  <path
                    d="M12 2C6.477 2 2 6.477 2 12C2 13.89 2.525 15.66 3.438 17.168L2.546 20.2C2.49478 20.3741 2.49141 20.5594 2.53624 20.7354C2.58107 20.9114 2.67245 21.0718 2.80076 21.1992C2.92907 21.3267 3.08987 21.4165 3.26607 21.4599C3.44227 21.5032 3.62744 21.4983 3.801 21.446L6.832 20.562C8.39029 21.5051 10.1782 22.0025 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z"
                    fill="currentColor"
                    opacity="0.2"
                  />
                  <path
                    d="M12 2C6.477 2 2 6.477 2 12C2 13.89 2.525 15.66 3.438 17.168L2.546 20.2C2.49478 20.3741 2.49141 20.5594 2.53624 20.7354C2.58107 20.9114 2.67245 21.0718 2.80076 21.1992C2.92907 21.3267 3.08987 21.4165 3.26607 21.4599C3.44227 21.5032 3.62744 21.4983 3.801 21.446L6.832 20.562C8.39029 21.5051 10.1782 22.0025 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {unreadMessagesCount > 0 && (
                    <circle
                      cx="18"
                      cy="6"
                      r="4"
                      fill="#007bff"
                      stroke="white"
                      strokeWidth="2"
                    />
                  )}
                </svg>
                {unreadMessagesCount > 0 && (
                  <span
                    className="position-absolute badge rounded-pill bg-primary"
                    style={{
                      top: '2px',
                      right: '2px',
                      fontSize: '10px',
                      padding: '3px 6px',
                      minWidth: '20px',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(0, 123, 255, 0.4)',
                      border: '2px solid white',
                      zIndex: 10
                    }}
                  >
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </button>
              {showMessages && (
                <div
                  className="dropdown-menu dropdown-menu-end pc-h-dropdown show"
                  style={{
                    width: '360px',
                    maxWidth: '90vw',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '12px',
                    animation: 'slideDown 0.3s ease',
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    zIndex: 9999,
                    marginTop: '8px'
                  }}
                >
                  <div
                    className="dropdown-header d-flex align-items-center justify-content-between py-3 px-4"
                    style={{
                      borderBottom: '1px solid #e9ecef'
                    }}
                  >
                    <h5 className="m-0 fw-bold" style={{ fontSize: '18px' }}>
                      <i className="ph-duotone ph-chats-circle me-2"></i>
                      Tin nhắn
                      {unreadMessagesCount > 0 && (
                        <span className="badge bg-primary ms-2" style={{ fontSize: '11px' }}>
                          {unreadMessagesCount} mới
                        </span>
                      )}
                    </h5>
                  </div>
                  <div
                    className="dropdown-body p-0"
                    style={{
                      maxHeight: '400px',
                      overflowY: 'auto'
                    }}
                  >
                    {loadingMessages ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Đang tải...</span>
                        </div>
                        <p className="text-muted mt-3 mb-0 small">Đang tải tin nhắn...</p>
                      </div>
                    ) : conversations.length > 0 ? (
                      <div className="list-group list-group-flush">
                        {conversations.map((conv) => {
                          const peer = conv.peer;
                          return (
                            <div
                              key={conv._id}
                              className="list-group-item list-group-item-action border-0"
                              onClick={() => handleConversationClick(conv)}
                              style={{
                                cursor: 'pointer',
                                borderLeft: conv.unreadCount > 0 ? '3px solid #0d6efd' : '3px solid transparent',
                                transition: 'all 0.2s ease',
                                padding: '12px 16px',
                                backgroundColor: conv.unreadCount > 0 ? 'rgba(13, 110, 253, 0.03)' : 'transparent'
                              }}
                            >
                              <div className="d-flex align-items-start gap-3">
                                {/* Avatar */}
                                <div className="flex-shrink-0 position-relative">
                                  <img
                                    src={peer?.avatarUrl || peer?.avatar || `https://ui-avatars.com/api/?name=${peer?.displayName || peer?.username || 'User'}&background=random`}
                                    alt={peer?.username || 'User'}
                                    className="rounded-circle"
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      objectFit: 'cover',
                                      border: '2px solid white',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                  />
                                  {conv.unreadCount > 0 && (
                                    <div
                                      className="position-absolute bottom-0 end-0 rounded-circle d-flex align-items-center justify-content-center"
                                      style={{
                                        width: '20px',
                                        height: '20px',
                                        backgroundColor: '#0d6efd',
                                        border: '2px solid white'
                                      }}
                                    >
                                      <i className="ph-fill ph-chat-circle-text text-white" style={{ fontSize: '11px' }}></i>
                                    </div>
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-grow-1 min-width-0">
                                  <div className="d-flex align-items-center justify-content-between mb-1">
                                    <h6
                                      className="mb-0 text-truncate fw-semibold"
                                      style={{
                                        fontSize: '14px',
                                        color: '#2c3e50',
                                        maxWidth: '200px'
                                      }}
                                    >
                                      {peer?.displayName || peer?.username || 'Unknown User'}
                                    </h6>
                                    {conv.lastMessageAt && (
                                      <small
                                        className="text-muted flex-shrink-0"
                                        style={{
                                          fontSize: '11px'
                                        }}
                                      >
                                        {formatTimeAgo(conv.lastMessageAt)}
                                      </small>
                                    )}
                                  </div>

                                  <p
                                    className="mb-0 text-truncate"
                                    style={{
                                      fontSize: '13px',
                                      color: conv.unreadCount > 0 ? '#495057' : '#6c757d',
                                      lineHeight: '1.4'
                                    }}
                                  >
                                    {conv.lastMessage || 'Bắt đầu cuộc trò chuyện'}
                                  </p>

                                  {conv.unreadCount > 0 && (
                                    <span
                                      className="badge bg-primary mt-1"
                                      style={{
                                        fontSize: '10px',
                                        padding: '3px 8px',
                                        borderRadius: '12px',
                                        fontWeight: '600'
                                      }}
                                    >
                                      {conv.unreadCount} tin nhắn mới
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-5 px-3">
                        <i className="ph-duotone ph-chat-text" style={{ fontSize: '64px', opacity: 0.3, color: '#6c757d' }}></i>
                        <p className="mb-0 mt-3 fw-semibold" style={{ color: '#495057' }}>Chưa có tin nhắn</p>
                        <small className="text-muted" style={{ fontSize: '13px' }}>Bắt đầu trò chuyện với bạn bè</small>
                      </div>
                    )}
                  </div>
                  {conversations.length > 0 && (
                    <div
                      className="dropdown-footer text-center py-2 border-top"
                      style={{
                        backgroundColor: '#f8f9fa'
                      }}
                    >
                      <button
                        className="btn btn-link btn-sm text-primary text-decoration-none"
                        onClick={() => {
                          navigate('/messages');
                          setShowMessages(false);
                        }}
                        style={{ fontSize: '13px', fontWeight: '500' }}
                      >
                        Xem tất cả tin nhắn
                        <i className="ph ph-arrow-right ms-1"></i>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
            <li
              className="dropdown pc-h-item header-user-profile d-flex align-items-center"
              ref={userMenuRef}
              style={{ overflow: 'visible', paddingTop: '4px' }}
            >
              <span
                className="pc-head-link dropdown-toggle arrow-none me-0"
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  padding: '4px',
                  borderRadius: '50%',
                  background: showUserMenu ? 'rgba(13, 110, 253, 0.08)' : 'transparent',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
              >
                <img
                  src={user && user.avatarUrl || `https://ui-avatars.com/api/?background=random&name=user`}
                  alt="user-avatar"
                  className="user-avtar"
                  width={36}
                  height={36}
                  style={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #e9ecef'
                  }}
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
                    zIndex: 9999
                  }}
                >
                  {/* <div className="dropdown-header d-flex align-items-center justify-content-between">
                    <h5 className="m-0">Thông tin</h5>
                  </div> */}
                  <div className="dropdown-body p-2">
                    <div
                      className="profile-notification-scroll position-relative"
                      style={{ maxHeight: "calc(100vh - 225px)" }}
                    >
                      {/* User Info Header */}
                      <div className="d-flex align-items-center p-2 mb-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                        <img
                          src={user && user.avatarUrl || `https://ui-avatars.com/api/?background=random&name=user`}
                          alt="user-avatar"
                          className="rounded-circle"
                          style={{
                            width: '48px',
                            height: '48px',
                            objectFit: 'cover',
                            border: '2px solid #fff',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                        />
                        <div className="ms-3 flex-grow-1 min-width-0">
                          <h6 className="mb-0 fw-bold text-truncate" style={{ fontSize: '15px' }}>
                            {user?.displayName || "Vui Lòng Đăng Nhập"}
                          </h6>
                          {user?.username && (
                            <small className="text-muted text-truncate d-block" style={{ fontSize: '12px' }}>
                              @{user.username}
                            </small>
                          )}
                        </div>
                      </div>

                      <div className="dropdown-divider my-2"></div>

                      {/* Menu Items */}
                      <Link
                        to={`/user/${user?.username}`}
                        className="dropdown-item d-flex align-items-center py-2 px-3 rounded"
                        style={{ transition: 'all 0.2s ease' }}
                        onClick={() => setShowUserMenu(false)}
                      >
                        <div className="d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '36px', height: '36px', backgroundColor: '#e3f2fd', borderRadius: '10px' }}>
                          <i className="ph-duotone ph-user-circle" style={{ fontSize: '20px', color: '#1976d2', marginLeft: '7px' }}></i>
                        </div>
                        <span className="ms-2 fw-medium" style={{ fontSize: '14px', color: '#1c1c1c' }}>Trang cá nhân</span>
                      </Link>

                      <Link
                        to="/profile"
                        className="dropdown-item d-flex align-items-center py-2 px-3 rounded mt-1"
                        style={{ transition: 'all 0.2s ease' }}
                        onClick={() => setShowUserMenu(false)}
                      >
                        <div className="d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '36px', height: '36px', backgroundColor: '#e8f5e9', borderRadius: '10px' }}>
                          <i className="ph-duotone ph-gear" style={{ fontSize: '20px', color: '#388e3c', marginLeft: '7px' }}></i>
                        </div>
                        <span className="ms-2 fw-medium" style={{ fontSize: '14px', color: '#1c1c1c' }}>Cài đặt tài khoản</span>
                      </Link>

                      {/* Link MOD Dashboard cho MOD và ADMIN */}
                      {(user?.role === 'mod' || user?.role === 'admin') && (
                        <>
                          <div className="dropdown-divider my-2"></div>
                          <Link
                            to="/mod/dashboard"
                            className="dropdown-item d-flex align-items-center py-2 px-3 rounded"
                            style={{ transition: 'all 0.2s ease' }}
                            onClick={() => setShowUserMenu(false)}
                          >
                            <div className="d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '36px', height: '36px', backgroundColor: '#f3e5f5', borderRadius: '10px' }}>
                              <i className="ph-duotone ph-shield-check" style={{ fontSize: '20px', color: '#8b5cf6', marginLeft: '7px' }}></i>
                            </div>
                            <span className="ms-2 fw-medium" style={{ fontSize: '14px', color: '#1c1c1c' }}>Quản lý duyệt bài</span>
                          </Link>
                        </>
                      )}

                      <div className="dropdown-divider my-2"></div>

                      <Link
                        to="/login"
                        className="dropdown-item d-flex align-items-center py-2 px-3 rounded"
                        style={{ transition: 'all 0.2s ease' }}
                        onClick={() => {
                          localStorage.removeItem("token");
                          window.location.reload();
                        }}
                      >
                        <div className="d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '36px', height: '36px', backgroundColor: '#ffebee', borderRadius: '10px' }}>
                          <i className="ph-duotone ph-sign-out" style={{ fontSize: '20px', color: '#d32f2f', marginLeft: '7px' }}></i>
                        </div>
                        <span className="ms-2 fw-medium" style={{ fontSize: '14px', color: '#d32f2f' }}>Đăng xuất</span>
                      </Link>

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
