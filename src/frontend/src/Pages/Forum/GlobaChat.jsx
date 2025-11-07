import React, { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../../Context/AuthContext";
import { getGlobalChatHistory, getOnlineUsersCount, uploadChatFiles } from "../../Utils/api";
import {
  joinGlobalChat,
  leaveGlobalChat,
  sendGlobalMessage,
  sendGlobalTyping,
  onGlobalMessage,
  onGlobalTyping,
  offGlobalMessage,
  offGlobalTyping,
  socket,
} from "../../Utils/socket";

const GlobalChat = () => {
  const { auth } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]); // Array of { userId, username, displayName }
  const [attachments, setAttachments] = useState([]); // Selected attachments
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Emoji list (same as PrivateChat)
  const emojis = [
    "😊", "😂", "❤️", "😍", "😭", "🤔", "👍", "🎉", "🔥", "✨",
    "💯", "😎", "🥰", "😢", "😱", "🤗", "💪", "🙏", "👏", "🎈",
    "🌟", "💖", "😴", "🤩", "😜", "🥳", "🤝", "💕", "🌈", "⭐"
  ];

  // Check socket connection on mount
  useEffect(() => {
   // console.log('🔌 [GlobalChat] Socket connected:', socket.connected);
   // console.log('🔌 [GlobalChat] Socket ID:', socket.id);
    
    // If socket not connected, wait for it
    if (!socket.connected) {
     // console.log('⏳ [GlobalChat] Waiting for socket connection...');
      const handleConnect = () => {
       // console.log('✅ [GlobalChat] Socket connected!', socket.id);
      };
      
      socket.on('connect', handleConnect);
      
      return () => {
        socket.off('connect', handleConnect);
      };
    }
  }, []);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load chat history
  useEffect(() => {
    if (!auth.token) return;

    const loadHistory = async () => {
      try {
        const result = await getGlobalChatHistory(auth.token, 1, 100);
        if (result.success) {
          setMessages(result.data.messages || []);
        }
      } catch (error) {
       // console.error("Error loading global chat:", error);
      } finally {
        setLoading(false);
      }
    };

    const loadOnlineCount = async () => {
      try {
        const result = await getOnlineUsersCount(auth.token);
        if (result.success) {
          setOnlineCount(result.data.count || 0);
        }
      } catch (error) {
       // console.error("Error loading online count:", error);
      }
    };

    loadHistory();
    loadOnlineCount();

    // Refresh online count every 30 seconds
    const interval = setInterval(loadOnlineCount, 30000);
    return () => clearInterval(interval);
  }, [auth.token]);

  // Join global chat room AND setup listeners (wait for socket to be connected)
  useEffect(() => {
    // Handler for new messages
    const handleNewMessage = (data) => {
     // console.log('🌍 [GlobalChat] Received new message:', data);
      const { message } = data;
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    };

    // Function to join and setup listeners
    const joinAndListen = () => {
     // console.log('🚪 [GlobalChat] Joining global chat room');
      joinGlobalChat();

      // console.log('🎧 [GlobalChat] Setting up message listener');
      onGlobalMessage(handleNewMessage);
    };

    // Check if socket already connected
    if (!socket.connected) {
     // console.log('⏳ [GlobalChat] Socket not connected yet, waiting...');
      
      const handleConnect = () => {
       // console.log('✅ [GlobalChat] Socket connected, now joining and listening');
        joinAndListen();
      };
      
      socket.on('connect', handleConnect);
      
      return () => {
        socket.off('connect', handleConnect);
       // console.log('� [GlobalChat] Cleaning up message listener');
        offGlobalMessage(handleNewMessage);
       // console.log('🚪 [GlobalChat] Leaving global chat room');
        leaveGlobalChat();
      };
    } else {
     // console.log('✅ [GlobalChat] Socket already connected');
      joinAndListen();
      
      return () => {
       // console.log('🔇 [GlobalChat] Cleaning up message listener');
        offGlobalMessage(handleNewMessage);
       // console.log('🚪 [GlobalChat] Leaving global chat room');
        leaveGlobalChat();
      };
    }
  }, []);

  // Listen for typing indicators
  useEffect(() => {
    const handleTyping = (data) => {
      const { userId, username, displayName, isTyping } = data;

      if (isTyping) {
        setTypingUsers((prev) => {
          // Check if user already in list
          if (prev.find((u) => u.userId === userId)) return prev;
          return [...prev, { userId, username, displayName }];
        });

        // Auto-remove after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
        }, 3000);
      } else {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
      }
    };

    onGlobalTyping(handleTyping);

    return () => {
      offGlobalTyping(handleTyping);
    };
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Handle typing
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    // Send typing indicator
    if (value.trim()) {
      sendGlobalTyping(true);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        sendGlobalTyping(false);
      }, 2000);
    } else {
      sendGlobalTyping(false);
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Handle file selection
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const result = await uploadChatFiles(auth.token, files);
      if (result.success) {
        setAttachments((prev) => [...prev, ...result.data]);
      } else {
        alert("Không thể tải file lên");
      }
    } catch (error) {
      // console.error("Error uploading files:", error);
      alert("Lỗi khi tải file");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (attachmentId) => {
    setAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if ((!newMessage.trim() && attachments.length === 0) || sending) return;

    setSending(true);
    sendGlobalTyping(false); // Stop typing indicator

    try {
      const messageData = {
        text: newMessage.trim(),
        attachments: attachments.map((a) => a._id),
      };

      console.log('📤 [GlobalChat] Sending message:', messageData);
      sendGlobalMessage(messageData, (res) => {
        if (!res || res.success !== true) {
          console.warn('⚠️ [GlobalChat] Message not accepted by server:', res);
          const reason = res?.error === 'unauthenticated'
            ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
            : 'Không thể gửi tin nhắn. Vui lòng thử lại.';
          alert(reason);
          return;
        }
        // Clear only on success
        setNewMessage("");
        setAttachments([]);
      });

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      // console.error("Error sending message:", error);
      alert("Không thể gửi tin nhắn");
    } finally {
      setSending(false);
    }
  };

  // Re-join global chat when tab becomes visible (helps after long sleep)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && socket.connected) {
        console.log('👀 [GlobalChat] Tab visible, ensuring joined to global chat');
        joinGlobalChat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Format time
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} giờ`;
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if should show avatar/name (only when sender changes or time gap > 5 mins)
  const shouldShowSenderInfo = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    const currentSender = currentMsg.senderId?._id;
    const prevSender = prevMsg.senderId?._id;
    
    // Different sender
    if (currentSender !== prevSender) return true;
    
    // Time gap > 5 minutes
    const currentTime = new Date(currentMsg.createdAt).getTime();
    const prevTime = new Date(prevMsg.createdAt).getTime();
    return (currentTime - prevTime) > 5 * 60 * 1000;
  };

  // Render attachment preview
  const renderAttachment = (attachment) => {
    const isImage = attachment.mime?.startsWith("image/");
    
    if (isImage) {
      return (
        <img
          key={attachment._id}
          src={attachment.storageUrl}
          alt={attachment.filename}
          className="rounded mb-2"
          style={{ maxWidth: "200px", maxHeight: "200px", cursor: "pointer" }}
          onClick={() => window.open(attachment.storageUrl, "_blank")}
        />
      );
    } else {
      return (
        <a
          key={attachment._id}
          href={attachment.storageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="d-flex align-items-center gap-2 text-decoration-none bg-light p-2 rounded mb-2"
          style={{ maxWidth: "250px" }}
        >
          <i className="bi bi-file-earmark-text fs-4"></i>
          <div className="flex-grow-1 overflow-hidden">
            <div className="text-truncate small fw-medium">{attachment.filename}</div>
            <small className="text-muted">{(attachment.size / 1024).toFixed(1)} KB</small>
          </div>
          <i className="bi bi-download"></i>
        </a>
      );
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "calc(100vh - 70px)" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-0" style={{ height: "calc(100vh - 70px)", overflow: "hidden" }}>
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center" style={{ padding: "0.75rem 1rem" }}>
        <div>
          <h5 className="mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-globe"></i>
            <span>Chat Toàn Diễn Đàn</span>
          </h5>
          <small style={{ fontSize: "0.8rem", opacity: 0.9 }}>
            <i className="bi bi-people-fill me-1"></i>
            {onlineCount} người đang online
          </small>
        </div>
        <button className="btn btn-sm btn-light" onClick={() => window.history.back()}>
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      {/* Messages Area */}
      <div className="card-body bg-light" style={{ overflowY: "auto", flex: 1, padding: "1rem" }}>
        {messages.length === 0 ? (
          <div className="text-center text-muted py-5">
            <i className="bi bi-chat-dots" style={{ fontSize: "3rem", opacity: 0.3 }}></i>
            <p className="mt-3">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const sender = msg.senderId;
              const isMe = String(sender?._id) === String(auth.user?.id || auth.user?._id);
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showSenderInfo = shouldShowSenderInfo(msg, prevMsg);
              const hasAttachments = msg.attachments && msg.attachments.length > 0;

              return (
                <div
                  key={msg._id || index}
                  className={`d-flex ${showSenderInfo ? 'mb-3' : 'mb-1'} ${isMe ? "justify-content-end" : "justify-content-start"}`}
                >
                  {!isMe && (
                    <div className="me-2 flex-shrink-0" style={{ width: 36 }}>
                      {showSenderInfo ? (
                        <img
                          src={sender?.avatarUrl || sender?.avatar || `https://ui-avatars.com/api/?name=${sender?.displayName || sender?.username}&background=random`}
                          alt={sender?.displayName || sender?.username}
                          className="rounded-circle"
                          style={{ width: 36, height: 36, objectFit: "cover" }}
                        />
                      ) : null}
                    </div>
                  )}

                  <div style={{ maxWidth: "70%" }}>
                    {!isMe && showSenderInfo && (
                      <div className="small text-muted mb-1">
                        <strong>{sender?.displayName || sender?.username}</strong>
                      </div>
                    )}
                    <div
                      className={`p-2 rounded ${
                        isMe ? "bg-primary text-white" : "bg-white border"
                      } ${!showSenderInfo ? (isMe ? 'rounded-end' : 'rounded-start') : ''}`}
                      style={{ wordWrap: "break-word" }}
                    >
                      {/* Attachments */}
                      {hasAttachments && (
                        <div className="mb-2">
                          {msg.attachments.map((att) => renderAttachment(att))}
                        </div>
                      )}
                      
                      {/* Text message */}
                      {msg.text && (
                        <p className="mb-0" style={{ fontSize: "0.9rem" }}>
                          {msg.text}
                        </p>
                      )}
                      
                      {/* Time - only show on last message of group */}
                      {showSenderInfo && (
                        <small
                          className={`d-block mt-1 ${isMe ? "text-white-50" : "text-muted"}`}
                          style={{ fontSize: "0.7rem" }}
                        >
                          {formatTime(msg.createdAt)}
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="d-flex mb-3">
                <div className="me-2">
                  <div style={{ width: 36 }}></div>
                </div>
                <div className="bg-white border rounded p-2" style={{ fontSize: "0.85rem" }}>
                  <i className="bi bi-three-dots text-primary"></i>
                  <span className="text-muted ms-2">
                    {typingUsers.map((u) => u.displayName || u.username).join(", ")} đang nhập...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="card-footer bg-white border-top" style={{ padding: "0.75rem" }}>
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="mb-2 d-flex flex-wrap gap-2">
            {attachments.map((att) => {
              const isImage = att.mime?.startsWith("image/");
              return (
                <div
                  key={att._id}
                  className="position-relative bg-light p-2 rounded d-flex align-items-center gap-2"
                  style={{ maxWidth: "200px" }}
                >
                  {isImage ? (
                    <img
                      src={att.storageUrl}
                      alt={att.filename}
                      className="rounded"
                      style={{ width: 40, height: 40, objectFit: "cover" }}
                    />
                  ) : (
                    <i className="bi bi-file-earmark-text fs-4"></i>
                  )}
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="text-truncate small">{att.filename}</div>
                    <small className="text-muted">{(att.size / 1024).toFixed(1)} KB</small>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger rounded-circle p-0"
                    style={{ width: 20, height: 20, fontSize: "0.7rem" }}
                    onClick={() => handleRemoveAttachment(att._id)}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="d-flex gap-2 align-items-center">
          {/* File upload button */}
          <div className="position-relative">
            <input
              ref={fileInputRef}
              type="file"
              className="d-none"
              multiple
              onChange={handleFileSelect}
              disabled={uploading || sending}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || sending}
              title="Đính kèm file"
            >
              {uploading ? (
                <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                <i className="bi bi-paperclip"></i>
              )}
            </button>
          </div>

          {/* Emoji picker */}
          <div className="position-relative" ref={emojiPickerRef}>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={sending}
              title="Chọn emoji"
            >
              <i className="bi bi-emoji-smile"></i>
            </button>

            {/* Emoji dropdown */}
            {showEmojiPicker && (
              <div
                className="position-absolute bg-white border rounded shadow-lg p-2"
                style={{
                  bottom: '50px',
                  left: 0,
                  width: '280px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                  <small className="text-muted fw-bold">Chọn emoji</small>
                  <button
                    type="button"
                    className="btn btn-sm btn-close"
                    onClick={() => setShowEmojiPicker(false)}
                  ></button>
                </div>
                <div className="d-flex flex-wrap gap-1">
                  {emojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="btn btn-sm btn-light"
                      style={{ fontSize: '1.5rem', width: '36px', height: '36px', padding: 0 }}
                      onClick={() => handleEmojiSelect(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Text input */}
          <input
            type="text"
            className="form-control"
            placeholder="Nhập tin nhắn..."
            value={newMessage}
            onChange={handleInputChange}
            disabled={sending || uploading}
            style={{ fontSize: "0.9rem" }}
          />

          {/* Send button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={(!newMessage.trim() && attachments.length === 0) || sending || uploading}
            style={{ minWidth: "80px" }}
          >
            {sending ? (
              <span className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Đang gửi...</span>
              </span>
            ) : (
              <>
                <i className="bi bi-send-fill me-1"></i>
                Gửi
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GlobalChat;
