import React, { useState, useEffect, useContext, useRef } from "react";
import { useOutletContext } from "react-router-dom";
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
import { toast } from "react-toastify";
import LoadingPost from "@/Components/LoadingPost";
import { Link } from "react-router-dom";

const GlobalChat = () => {
  const { auth } = useContext(AuthContext);
  const { user } = useOutletContext();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]); // Array of { userId, username, displayName }
  const [attachments, setAttachments] = useState([]); // Selected attachments
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messageInputRef = useRef(null);
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

  // Scroll helpers keep the view pinned near the bottom
  const scrollToBottom = (behavior = "smooth") => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
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

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
    setShowScrollButton(distanceFromBottom > 150);
  };

  useEffect(() => {
    handleMessagesScroll();
    scrollToBottom(messages.length > 3 ? "smooth" : "auto");
  }, [messages]);

  useEffect(() => {
    if (!messageInputRef.current) return;
    const textarea = messageInputRef.current;
    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${nextHeight}px`;
  }, [newMessage]);

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

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      handleSendMessage(event);
    }
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
        toast.error("Không thể tải file lên");
      }
    } catch (error) {
      // console.error("Error uploading files:", error);
      toast.error("Lỗi khi tải file");
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

     // console.log('📤 [GlobalChat] Sending message:', messageData);

      // Clear input immediately to prevent double send
      const textToSend = newMessage.trim();
      const attachmentsToSend = [...attachments];
      setNewMessage("");
      setAttachments([]);

      sendGlobalMessage(messageData, (res) => {
        if (!res || res.success !== true) {
          //console.warn('⚠️ [GlobalChat] Message not accepted by server:', res);
          const reason = res?.error === 'unauthenticated'
            ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
            : 'Không thể gửi tin nhắn. Vui lòng thử lại.';
          toast.error(reason);
          // Restore message on failure
          setNewMessage(textToSend);
          setAttachments(attachmentsToSend);
          return;
        }
        // Success - message already cleared
      });

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      // console.error("Error sending message:", error);
      toast.error("Không thể gửi tin nhắn");
    } finally {
      setSending(false);
    }
  };

  // Re-join global chat when tab becomes visible (helps after long sleep)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && socket.connected) {
        //console.log('👀 [GlobalChat] Tab visible, ensuring joined to global chat');
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
          onClick={() => setLightboxImage(attachment.storageUrl)}
        />
      );
    } else {
      return (
        <Link
          key={attachment._id}
          to={attachment.storageUrl}
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
        </Link>
      );
    }
  };

  if (loading) {
    return (
      <LoadingPost count={5} />
    );
  }

  return (
    <div
      className="card border-0 shadow-sm p-0"
      style={{ height: "calc(100vh - 70px)", borderRadius: "16px", overflow: "hidden", position: "relative" }}
    >
      <div
        className="card-header text-white d-flex flex-wrap flex-md-nowrap align-items-center gap-3"
        style={{ padding: "0.9rem 1.25rem", background: "linear-gradient(135deg, #5c6ac4, #3f51b5)" }}
      >
        <div className="flex-grow-1">
          <h5 className="mb-1 d-flex align-items-center gap-2 fw-semibold">
            <span className="badge bg-light text-primary rounded-pill">
              <i className="bi bi-globe me-1"></i>
              Global Chat
            </span>
            <span className="d-none d-md-inline">Toàn diễn đàn</span>
          </h5>
          <div className="d-flex flex-wrap align-items-center gap-3" style={{ fontSize: "0.85rem" }}>
            <span className="d-flex align-items-center gap-1 opacity-75">
              <i className="bi bi-people-fill"></i>
              {onlineCount} người online
            </span>
            {typingUsers.length > 0 && (
              <span className="badge bg-warning text-dark">
                {typingUsers.length === 1
                  ? `${typingUsers[0].displayName || typingUsers[0].username} đang nhập...`
                  : `${typingUsers.length} người đang nhập...`}
              </span>
            )}
          </div>
        </div>
        <div className="ms-md-auto d-flex align-items-center gap-2 flex-nowrap">
          <button
            type="button"
            className="btn btn-light btn-sm text-primary"
            onClick={() => scrollToBottom()}
            title="Cuộn xuống cuối"
          >
            <i className="bi bi-arrow-down"></i>
          </button>
          <button className="btn btn-outline-light btn-sm" onClick={() => window.history.back()}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="card-body bg-light"
        style={{ overflowY: "auto", flex: 1, padding: "1rem" }}
        onScroll={handleMessagesScroll}
      >
        {messages.length === 0 ? (
          <div className="text-center text-muted py-5">
            <i className="bi bi-chat-dots" style={{ fontSize: "3rem", opacity: 0.3 }}></i>
            <p className="mt-3">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const sender = msg.senderId;
              const isMe = String(sender?._id) === String(user?.id || user?._id);
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

                  <div style={{ maxWidth: "75%" }}>
                    {!isMe && showSenderInfo && (
                      <div className="small text-muted mb-1 d-flex align-items-center gap-2">
                        <strong>{sender?.displayName || sender?.username}</strong>
                        <span className="text-muted" style={{ fontSize: "0.7rem" }}>{formatTime(msg.createdAt)}</span>
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-4 shadow-sm ${isMe ? "bg-primary text-white" : "bg-white"}
                        ${!showSenderInfo ? (isMe ? 'rounded-end-4' : 'rounded-start-4') : ''}`}
                      style={{ wordWrap: "break-word", lineHeight: 1.5 }}
                    >
                      {/* Attachments */}
                      {hasAttachments && (
                        <div className="mb-2">
                          {msg.attachments.map((att) => renderAttachment(att))}
                        </div>
                      )}

                      {/* Text message */}
                      {msg.text && (
                        <p className="mb-0" style={{ fontSize: "0.92rem" }}>
                          {msg.text}
                        </p>
                      )}

                      {/* Time - only show for my messages */}
                      {isMe && (
                        <small
                          className="d-block mt-2 text-white-50 text-end"
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

            {typingUsers.length > 0 && (
              <div className="d-flex mb-3">
                <div className="bg-white border rounded-pill px-3 py-2 shadow-sm">
                  <i className="bi bi-three-dots text-primary me-2"></i>
                  <span className="text-muted">
                    {typingUsers.map((u) => u.displayName || u.username).join(", ")} đang nhập...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {showScrollButton && (
        <button
          type="button"
          className="btn btn-primary shadow-sm position-absolute d-flex align-items-center justify-content-center"
          style={{ bottom: 110, right: 20, borderRadius: "999px", width: 46, height: 46 }}
          onClick={() => scrollToBottom()}
          title="Cuộn xuống"
        >
          <i className="bi bi-arrow-down"></i>
        </button>
      )}

      <div className="card-footer bg-white border-top" style={{ padding: "0.9rem 1.25rem" }}>
        {attachments.length > 0 && (
          <div className="mb-2 d-flex flex-wrap gap-2">
            {attachments.map((att) => {
              const isImage = att.mime?.startsWith("image/");
              return (
                <div
                  key={att._id}
                  className="position-relative bg-light p-2 rounded d-flex align-items-center gap-2"
                  style={{ maxWidth: "220px" }}
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
                    <div className="text-truncate small fw-semibold">{att.filename}</div>
                    <small className="text-muted">{(att.size / 1024).toFixed(1)} KB</small>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger rounded-circle p-0"
                    style={{ width: 22, height: 22, fontSize: "0.7rem" }}
                    onClick={() => handleRemoveAttachment(att._id)}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="d-flex flex-wrap flex-md-nowrap gap-2 align-items-start">
          <div className="d-flex align-items-center gap-2 flex-shrink-0 order-2 order-md-1">
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
                className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: 42, height: 42 }}
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

            <div className="position-relative" ref={emojiPickerRef}>
              <button
                type="button"
                className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: 42, height: 42 }}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={sending}
                title="Chọn emoji"
              >
                <i className="bi bi-emoji-smile"></i>
              </button>

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
                        style={{ fontSize: '1.4rem', width: '36px', height: '36px', padding: 0 }}
                        onClick={() => handleEmojiSelect(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-grow-1 order-1 order-md-2 w-100">
            <textarea
              ref={messageInputRef}
              rows={1}
              className="form-control shadow-sm"
              placeholder="Chia sẻ cảm nghĩ của bạn..."
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleComposerKeyDown}
              disabled={sending || uploading}
              style={{
                fontSize: "0.92rem",
                borderRadius: '20px',
                padding: '0.65rem 1rem',
                resize: 'none',
                minHeight: '42px',
                maxHeight: '200px'
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary d-flex align-items-center justify-content-center gap-2 order-3"
            disabled={(!newMessage.trim() && attachments.length === 0) || sending || uploading}
            style={{ minWidth: "90px", height: 42 }}
          >
            {sending ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" />
                <span>Đang gửi</span>
              </>
            ) : (
              <>
                <i className="bi bi-send-fill"></i>
                Gửi
              </>
            )}
          </button>
        </form>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setLightboxImage(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxImage(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            <i className="bi bi-x-lg"></i>
          </button>

          {/* Image */}
          <img
            src={lightboxImage}
            alt="Preview"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default GlobalChat;
