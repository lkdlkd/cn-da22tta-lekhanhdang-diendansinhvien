import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext";
import { getMyConversations, getUserByUsername, getOnlineUsers } from "../../Utils/api";
import {
  socket,
  onUserStatusChanged,
  offUserStatusChanged,
  onPrivateNotify,
  offPrivateNotify,
} from "../../Utils/socket";
import PrivateChat from "./PrivateChat";
import LoadingPost from "@/Components/LoadingPost";

const ListChat = () => {
  const { auth } = useContext(AuthContext);
  const { username } = useParams();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("conversations"); // "conversations" | "online"
  const [onlineUsersList, setOnlineUsersList] = useState([]);
  const [selectedUsername, setSelectedUsername] = useState(username || null);
  const [filterMode, setFilterMode] = useState("all"); // all | unread | online

  // Unread messages tracking
  const [unreadCounts, setUnreadCounts] = useState({}); // { conversationId: count }

  // Ref for search debounce
  const searchTimeoutRef = useRef(null);

  // Audio notification
  const notificationSoundRef = useRef(null);
  const searchInputRef = useRef(null);

  // Track processed messages to prevent duplicates
  const processedMessagesRef = useRef(new Set());

  // Ref to store current selectedUsername without causing listener re-registration
  const selectedUsernameRef = useRef(selectedUsername);

  // Ref to store the notify handler
  const notifyHandlerRef = useRef(null);

  // Ref to store stable wrapper function for consistent cleanup
  const stableHandlerRef = useRef(null);

  // Ref to store last processed message timestamp per peer to avoid double counting
  const lastMessageTimestampRef = useRef({});

  // Ref to keep latest conversations array for synchronous access inside handlers
  const conversationsRef = useRef(conversations);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Initialize notification sound
  useEffect(() => {
    // Create audio element for notification sound
    notificationSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzCI0fPTgjMGHm7A7+OZURE');
    notificationSoundRef.current.volume = 0.5;
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (notificationSoundRef.current) {
      notificationSoundRef.current.currentTime = 0;
      notificationSoundRef.current.play().catch(err => console.log('Cannot play sound:', err));
    }
  }, []);

  // Update ref whenever selectedUsername changes
  useEffect(() => {
    selectedUsernameRef.current = selectedUsername;
  }, [selectedUsername]);

  // Debug log
  // useEffect(() => {
  //   console.log('📍 ListChat state:', { 
  //     selectedUsername, 
  //     urlUsername: username,
  //     hasSelectedUsername: !!selectedUsername 
  //   });
  // }, [selectedUsername, username]);

  // Load conversations
  useEffect(() => {
    if (!auth.token) return;

    const loadConversations = async () => {
      try {
        const result = await getMyConversations(auth.token);
        if (result.success) {
          setConversations(result.data || []);

          // Initialize unread counts from server data
          const counts = {};
          (result.data || []).forEach(conv => {
            if (conv.unreadCount && conv.unreadCount > 0) {
              counts[conv._id] = conv.unreadCount;
            }
          });
          setUnreadCounts(counts);
        }
      } catch (error) {
        //   console.error("Error loading conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [auth.token]);

  // Sync selectedUsername with route param (chỉ khi đang ở route /message/:username)
  useEffect(() => {
    // console.log('🔄 URL sync:', { urlUsername: username, currentSelected: selectedUsername });

    // Nếu có username trong URL, set nó vào state
    if (username && username !== selectedUsername) {
      // console.log('➡️ Setting from URL:', username);
      setSelectedUsername(username);
    }
    // Nếu không có username trong URL và đang có selectedUsername, clear nó
    else if (!username && selectedUsername) {
      // console.log('🗑️ Clearing selected username');
      setSelectedUsername(null);
    }
  }, [username]); // ❌ Removed selectedUsername from dependencies to prevent loop

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/\/message\/(.+)$/);
      if (match) {
        setSelectedUsername(match[1]);
      } else {
        setSelectedUsername(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update document title with unread count
  useEffect(() => {
    const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Tin nhắn - Diễn đàn`;
    } else {
      document.title = 'Tin nhắn - Diễn đàn';
    }

    // Reset title on unmount
    return () => {
      document.title = 'Diễn đàn';
    };
  }, [unreadCounts]);

  // Handle conversation selection
  const handleSelectConversation = (username) => {
    // console.log('🎯 Selecting conversation with:', username);
    setSelectedUsername(username);

    // Clear unread count for this conversation
    const conv = conversations.find(c => c.peer?.username === username);
    if (conv && unreadCounts[conv._id]) {
      setUnreadCounts(prev => {
        const updated = { ...prev };
        delete updated[conv._id];
        return updated;
      });
    }

    // Update URL without full page reload
    window.history.pushState({}, '', `/message/${username}`);
    //  console.log('✅ Selected username set to:', username);
  };

  const incrementUnread = useCallback((conversationId) => {
    setUnreadCounts((prevCounts) => {
      const currentCount = prevCounts[conversationId] || 0;
      const newCount = currentCount + 1;
      console.log('   Current:', currentCount, '→ New:', newCount);
      return {
        ...prevCounts,
        [conversationId]: newCount,
      };
    });
  }, []);

  // Handle back from chat (mobile)
  const handleBackToList = () => {
    // console.log('⬅️ Back to list');
    setSelectedUsername(null);
    // Update URL to remove username
    window.history.pushState({}, '', `/messages`);
  };

  // Load online users
  useEffect(() => {
    if (!auth.token) return;

    const loadOnlineUsers = async () => {
      try {
        const result = await getOnlineUsers(auth.token, 50);
        if (result.success) {
          setOnlineUsersList(result.users || []);
        }
      } catch (error) {
        // console.error("Error loading online users:", error);
      }
    };

    loadOnlineUsers();
  }, [auth.token]);

  // Listen for presence updates
  useEffect(() => {
    const handleStatusChange = ({ userId, isOnline }) => {
      setOnlineUsers((prev) => {
        const updated = new Map(prev);
        updated.set(userId, isOnline);
        return updated;
      });

      // Update online users list
      if (isOnline) {
        // Reload online users when someone comes online
        getOnlineUsers(auth.token, 50).then((result) => {
          if (result.success) {
            setOnlineUsersList(result.users || []);
          }
        });
      } else {
        // Remove from online list
        setOnlineUsersList((prev) => prev.filter((u) => String(u._id) !== String(userId)));
      }
    };

    onUserStatusChanged(handleStatusChange);
    return () => offUserStatusChanged(handleStatusChange);
  }, [auth.token]);

  // Listen for new messages to update last message snippet
  // Create the handler function - will be stored in ref
  const handlePrivateNotify = useCallback((data) => {
    const { fromUserId, message } = data;
    const fromUserIdStr = String(fromUserId);
    const myIdStr = String(auth.user?.id || auth.user?._id);

    // Create unique message ID using _id when available + normalized timestamp
    const attachmentSignature = Array.isArray(message.attachments)
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

    const lastTimestamp = lastMessageTimestampRef.current[fromUserIdStr];
    if (lastTimestamp && createdAtTs <= lastTimestamp) {
      // console.log('⚠️ [ListChat] Stale/duplicate notify detected, ignoring');
      return;
    }
    lastMessageTimestampRef.current[fromUserIdStr] = createdAtTs;

    // Check if already processed (prevent duplicates)
    if (processedMessagesRef.current.has(messageId)) {
      // console.log('⚠️ [ListChat] Duplicate message detected, skipping:', messageId);
      return;
    }

    // Mark as processed
    processedMessagesRef.current.add(messageId);

    // Clean up old message IDs (keep only last 50)
    if (processedMessagesRef.current.size > 50) {
      const arr = Array.from(processedMessagesRef.current);
      processedMessagesRef.current = new Set(arr.slice(-50));
    }

    // IMPORTANT: Ignore messages from self (sender)
    // Only update conversation list for messages FROM others
    if (fromUserIdStr === myIdStr) {
      // console.log('🚫 [ListChat] Ignoring notify from self');
      return;
    }

    // console.log('📬 [ListChat] Received notify from:', fromUserIdStr, 'Current selectedUsername:', selectedUsernameRef.current);

    const prevConversations = conversationsRef.current || [];
    const convIdx = prevConversations.findIndex(
      (c) => String(c.peer?._id) === fromUserIdStr
    );

    if (convIdx !== -1) {
      const targetConv = prevConversations[convIdx];
      const peerUsername = targetConv.peer?.username;
      const shouldIncrement = String(peerUsername) !== String(selectedUsernameRef.current);

      if (shouldIncrement) {
        console.log('📈 [ListChat] Increasing unread for conv:', targetConv._id);
        incrementUnread(targetConv._id);
        playNotificationSound();
      } else {
        // console.log('✅ [ListChat] Currently viewing, not increasing unread');
      }

      const updated = [...prevConversations];
      updated[convIdx] = {
        ...updated[convIdx],
        lastMessage: message.text || "[File]",
        lastMessageAt: message.createdAt || new Date().toISOString(),
      };

      const [item] = updated.splice(convIdx, 1);
      updated.unshift(item);

      setConversations(updated);
    } else {
      // console.log("📬 [ListChat] New conversation from:", fromUserIdStr);
    }
  }, [auth.user, incrementUnread, playNotificationSound]);

  // Store handler in ref
  useEffect(() => {
    notifyHandlerRef.current = handlePrivateNotify;
  }, [handlePrivateNotify]);

  // Register listener with stable wrapper function - ONCE only
  useEffect(() => {
    // Create stable wrapper ONCE and store in ref
    if (!stableHandlerRef.current) {
      stableHandlerRef.current = (data) => {
        if (notifyHandlerRef.current) {
          notifyHandlerRef.current(data);
        }
      };
    }

    // Only register if we have auth and haven't registered yet
    if (auth.token && auth.user) {
      console.log('🎧 [ListChat] Setting up notify listener (ONCE)');
      onPrivateNotify(stableHandlerRef.current);
    }

    return () => {
      if (stableHandlerRef.current) {
        console.log('🔇 [ListChat] Cleaning up notify listener');
        offPrivateNotify(stableHandlerRef.current);
      }
    };
  }, []); // Empty deps - register only once on mount

  // Re-register listener when tab becomes visible (helps after long sleep)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && socket.connected) {
        console.log('👀 [ListChat] Tab visible, re-registering private notify listener');
        // Force re-render to ensure listener is active
        setConversations(prev => [...prev]);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Search users by username (with debounce)
  const handleSearch = (query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Show searching indicator immediately
    setSearching(true);

    // Debounce: wait 500ms after user stops typing
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await getUserByUsername(query.trim(), auth.token);
        if (result.success && result.user) {
          setSearchResults([result.user]);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        // console.error("Error searching user:", error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500); // Wait 500ms after last keystroke
  };

  // Helper to calculate total unread count
  const getTotalUnread = () => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút`;
    if (diffHours < 24) return `${diffHours} giờ`;
    if (diffDays < 7) return `${diffDays} ngày`;
    return date.toLocaleDateString("vi-VN");
  };

  const filteredConversations = useMemo(() => {
    switch (filterMode) {
      case "unread":
        return conversations.filter((conv) => unreadCounts[conv._id] > 0);
      case "online":
        return conversations.filter((conv) => {
          const peerId = String(conv.peer?._id);
          return onlineUsers.get(peerId) || conv.peer?.isOnline;
        });
      default:
        return conversations;
    }
  }, [conversations, filterMode, unreadCounts, onlineUsers]);

  if (loading) {
    return (
      <LoadingPost />
    );
  }

  return (
    <div className="card p-0" style={{ height: "calc(100vh - 70px)", overflow: "hidden" }}>
      <div className="row g-0 h-100">
        {/* Sidebar - Conversations List */}
        <div
          className={`col-12 col-md-4 col-lg-3 border-end h-100 d-flex flex-column ${selectedUsername ? 'd-none d-md-flex' : ''}`}
          style={{ overflow: "hidden" }}
        >
          {/* Header */}
          <div className="p-2 p-md-3 border-bottom bg-white" style={{ flexShrink: 0 }}>
            <div className="d-flex flex-wrap gap-2 align-items-center mb-2 mb-md-3">
              <div>
                <h5 className="mb-0 fw-bold" style={{ fontSize: "1.1rem" }}>Hộp thư</h5>
                <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                  {getTotalUnread() > 0 ? `${getTotalUnread()} tin chưa đọc` : "Đã đọc hết"}
                </small>
              </div>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm ms-auto d-flex align-items-center gap-1"
                onClick={() => {
                  setActiveTab("conversations");
                  setFilterMode("all");
                }}
              >
                <i className="bi bi-arrow-clockwise"></i>
                Làm mới
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                onClick={() => searchInputRef.current?.focus()}
              >
                <i className="bi bi-pencil-square"></i>
                <span className="d-none d-lg-inline">Tin nhắn mới</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="input-group input-group-sm rounded-pill shadow-sm overflow-hidden">
              <span className="input-group-text bg-white border-0" style={{ padding: "0.375rem 0.5rem" }}>
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="search"
                className="form-control border-0 bg-white"
                placeholder="Tìm bạn hoặc phòng chat"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                ref={searchInputRef}
                autoComplete="off"
                spellCheck={false}
                style={{ fontSize: "0.875rem" }}
              />
              {searchQuery && (
                <button
                  className="btn btn-link text-muted border-0"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  style={{ padding: "0.25rem 0.5rem" }}
                >
                  Xóa
                </button>
              )}
            </div>

            {activeTab === "conversations" && (
              <div className="d-flex gap-2 flex-wrap mt-3">
                {[
                  { id: "all", label: "Tất cả" },
                  { id: "unread", label: "Chưa đọc" },
                  { id: "online", label: "Đang online" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`btn btn-sm rounded-pill ${filterMode === item.id ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => setFilterMode(item.id)}
                    style={{ fontSize: "0.75rem", padding: "0.35rem 0.9rem" }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="btn-group w-100 mt-2 mt-md-3" role="group">
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "conversations" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setActiveTab("conversations")}
                style={{ fontSize: "0.8rem", padding: "0.375rem 0.5rem" }}
              >
                <span className="d-none d-sm-inline">Cuộc trò chuyện</span>
                <span className="d-inline d-sm-none">Chat</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "online" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setActiveTab("online")}
                style={{ fontSize: "0.8rem", padding: "0.375rem 0.5rem" }}
              >
                <span className="d-none d-sm-inline">Đang online ({onlineUsersList.length})</span>
                <span className="d-inline d-sm-none">Online ({onlineUsersList.length})</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-grow-1" style={{ overflowY: "auto" }}>
            {/* Search Results */}
            {searchQuery && (
              <div className="p-2 bg-light border-bottom">
                <small className="text-muted">Kết quả tìm kiếm</small>
              </div>
            )}

            {searching && (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Đang tìm...</span>
                </div>
              </div>
            )}

            {searchQuery && !searching && searchResults.length === 0 && (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-person-x" style={{ fontSize: "2rem" }}></i>
                <p className="mt-2 mb-0 small">Không tìm thấy người dùng</p>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="list-group list-group-flush">
                {searchResults.map((user) => {
                  const isOnline = onlineUsers.get(String(user._id)) || user.isOnline || false;
                  return (
                    <button
                      key={user._id}
                      className="list-group-item list-group-item-action border-0 py-2 py-md-3 text-start"
                      onClick={() => {
                        handleSelectConversation(user.username);
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                    >
                      <div className="d-flex align-items-center">
                        <div className="position-relative me-2 me-md-3 flex-shrink-0">
                          <img
                            src={user.avatarUrl || user.avatar || `https://ui-avatars.com/api/?name=${user.displayName || user.username}&background=random`}
                            alt={user.displayName || user.username}
                            className="rounded-circle"
                            style={{ width: 40, height: 40, objectFit: "cover" }}
                          />
                          {isOnline && (
                            <span
                              className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle"
                              style={{ width: 12, height: 12 }}
                            ></span>
                          )}
                        </div>
                        <div className="flex-grow-1 overflow-hidden">
                          <h6 className="mb-0 text-truncate" style={{ fontSize: "0.9rem" }}>{user.displayName || user.username}</h6>
                          <small className="text-muted text-truncate d-block" style={{ fontSize: "0.75rem" }}>@{user.username}</small>
                          {isOnline && <small className="text-success" style={{ fontSize: "0.75rem" }}>● Online</small>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Conversations Tab */}
            {!searchQuery && activeTab === "conversations" && (
              <>
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-chat-dots" style={{ fontSize: "3rem" }}></i>
                    <p className="mt-3">
                      {conversations.length === 0
                        ? "Chưa có cuộc trò chuyện nào"
                        : filterMode === "unread"
                          ? "Không có tin nhắn chưa đọc"
                          : "Không có ai đang online"}
                    </p>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {filteredConversations.map((conv) => {
                      const peer = conv.peer;
                      const isOnline = onlineUsers.get(String(peer?._id)) || peer?.isOnline || false;
                      const isActive = selectedUsername === peer?.username;

                      return (
                        <button
                          key={conv._id}
                          className={`list-group-item list-group-item-action border-0 py-2 py-md-3 text-start ${isActive ? 'active' : ''}`}
                          onClick={() => handleSelectConversation(peer?.username)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="d-flex align-items-center">
                            <div className="position-relative me-2 me-md-3 flex-shrink-0">
                              <img
                                src={peer?.avatarUrl || peer?.avatar || `https://ui-avatars.com/api/?name=${peer?.displayName || peer?.username}&background=random`}
                                alt={peer?.displayName || peer?.username}
                                className="rounded-circle"
                                style={{ width: 48, height: 48, objectFit: "cover" }}
                              />
                              {isOnline && (
                                <span
                                  className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle"
                                  style={{ width: 14, height: 14 }}
                                ></span>
                              )}
                            </div>
                            <div className="flex-grow-1 overflow-hidden">
                              <div className="d-flex justify-content-between align-items-start">
                                <h6 className="mb-1 fw-semibold text-truncate" style={{ fontSize: "0.9rem" }}>
                                  {peer?.displayName || peer?.username}
                                </h6>
                                <div className="d-flex align-items-center gap-2 flex-shrink-0 ms-2">
                                  {unreadCounts[conv._id] > 0 && (
                                    <span className="badge bg-danger rounded-pill" style={{ fontSize: "0.7rem", minWidth: "20px" }}>
                                      {unreadCounts[conv._id]}
                                    </span>
                                  )}
                                  <small className={isActive ? "text-white-50" : "text-muted"} style={{ fontSize: "0.7rem" }}>
                                    {formatTime(conv.lastMessageAt)}
                                  </small>
                                </div>
                              </div>
                              <p className={`mb-0 small text-truncate ${isActive ? "text-white-50" : "text-muted"}`} style={{ fontSize: "0.8rem" }}>
                                {conv.lastMessage || "Bắt đầu cuộc trò chuyện"}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Online Users Tab */}
            {!searchQuery && activeTab === "online" && (
              <>
                {onlineUsersList.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-people" style={{ fontSize: "3rem" }}></i>
                    <p className="mt-3">Không có ai đang online</p>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {onlineUsersList.map((user) => (
                      <button
                        key={user._id}
                        className="list-group-item list-group-item-action border-0 py-2 py-md-3 text-start"
                        onClick={() => handleSelectConversation(user.username)}
                      >
                        <div className="d-flex align-items-center">
                          <div className="position-relative me-2 me-md-3 flex-shrink-0">
                            <img
                              src={user.avatarUrl || user.avatar || `https://ui-avatars.com/api/?name=${user.displayName || user.username}&background=random`}
                              alt={user.displayName || user.username}
                              className="rounded-circle"
                              style={{ width: 40, height: 40, objectFit: "cover" }}
                            />
                            <span
                              className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle"
                              style={{ width: 12, height: 12 }}
                            ></span>
                          </div>
                          <div className="flex-grow-1 overflow-hidden">
                            <h6 className="mb-0 text-truncate" style={{ fontSize: "0.9rem" }}>{user.displayName || user.username}</h6>
                            <small className="text-muted text-truncate d-block" style={{ fontSize: "0.75rem" }}>@{user.username}</small>
                            {user.postsCount > 0 && (
                              <small className="text-muted d-none d-md-inline" style={{ fontSize: "0.75rem" }}>• {user.postsCount} bài viết</small>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Chat or Empty State */}
        <div
          className={`col-12 col-md-8 col-lg-9 bg-light p-0 d-flex flex-column position-relative ${!selectedUsername ? 'd-none d-md-flex' : ''}`}
          style={{ height: "100%", overflow: "hidden" }}
        >
          {/* {selectedUsername && (
            <button
              className="btn btn-light border shadow-sm rounded-pill position-absolute d-md-none"
              style={{ top: 12, left: 12, zIndex: 20, padding: "0.35rem 0.85rem" }}
              onClick={handleBackToList}
            >
              <i className="bi bi-list me-1"></i>
              Danh sách
            </button>
          )} */}
          {(() => {
            // console.log('🖼️ Rendering chat panel:', { 
            //   hasSelectedUsername: !!selectedUsername, 
            //   selectedUsername,
            //   willRenderChat: !!selectedUsername
            // });

            return selectedUsername ? (
              <PrivateChat
                key={selectedUsername}
                usernameOverride={selectedUsername}
                onBack={handleBackToList}
              />
            ) : (
              <div className="d-flex justify-content-center align-items-center w-100 h-100">
                <div className="text-center text-muted px-3">
                  <i className="bi bi-chat-text" style={{ fontSize: "4rem", opacity: 0.3 }}></i>
                  <h4 className="mt-3" style={{ fontSize: "1.25rem" }}>Chọn một cuộc trò chuyện</h4>
                  <p style={{ fontSize: "0.9rem" }}>Chọn từ danh sách bên trái để bắt đầu nhắn tin</p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default ListChat;
