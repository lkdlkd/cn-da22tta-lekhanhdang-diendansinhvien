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
import "../../assets/css/GlobalChat.css";

const GlobalChat = () => {
  const { auth } = useContext(AuthContext);
  const { user } = useOutletContext();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]); // Array of { userId, username, displayName }
  const [attachments, setAttachments] = useState([]); // Selected File objects (not uploaded)
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
  const isLoadingOlderRef = useRef(false);
  const isInitialLoadRef = useRef(true);

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
          const loadedMessages = result.data.messages || [];
          setMessages(loadedMessages);
          setHasMoreMessages(loadedMessages.length === 100);
        }
      } catch (error) {
        // console.error("Error loading global chat:", error);
      } finally {
        setLoading(false);
        isInitialLoadRef.current = false;
        // Scroll to bottom instantly after initial load
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 50);
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

  // Load more messages when scrolling to top
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMoreMessages || !auth.token) return;

    setLoadingMore(true);
    isLoadingOlderRef.current = true;
    try {
      const nextPage = currentPage + 1;
      const result = await getGlobalChatHistory(auth.token, nextPage, 100);

      if (result.success) {
        const olderMessages = result.data.messages || [];

        if (olderMessages.length > 0) {
          // Save current scroll position
          const container = messagesContainerRef.current;
          const oldScrollHeight = container?.scrollHeight || 0;

          // Prepend older messages
          setMessages((prev) => [...olderMessages, ...prev]);
          setCurrentPage(nextPage);
          setHasMoreMessages(olderMessages.length === 100);

          // Restore scroll position after render
          setTimeout(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop = newScrollHeight - oldScrollHeight;
            }
            // Reset flag after scroll restoration is complete
            isLoadingOlderRef.current = false;
          }, 0);
        } else {
          setHasMoreMessages(false);
          isLoadingOlderRef.current = false;
        }
      }
    } catch (error) {
      // console.error("Error loading more messages:", error);
      toast.error("Không thể tải thêm tin nhắn");
      isLoadingOlderRef.current = false;
    } finally {
      setLoadingMore(false);
    }
  };

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if scrolled to top (within 50px)
    if (container.scrollTop < 50 && hasMoreMessages && !loadingMore) {
      loadMoreMessages();
    }

    const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
    setShowScrollButton(distanceFromBottom > 150);
  };

  useEffect(() => {
    handleMessagesScroll();
    // Only scroll to bottom if not loading older messages and not initial load
    if (!isLoadingOlderRef.current && !isInitialLoadRef.current) {
      scrollToBottom("smooth");
    }
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
  // Chỉ lưu file vào state, không upload ngay
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setAttachments((prev) => [...prev, ...files]);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (attachmentIdOrName) => {
    setAttachments((prev) => prev.filter((a) => (a._id ? a._id !== attachmentIdOrName : a.name !== attachmentIdOrName)));
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if ((!newMessage.trim() && attachments.length === 0) || sending) return;

    setSending(true);
    sendGlobalTyping(false); // Stop typing indicator

    try {
      let uploadedAttachments = [];
      // Nếu có file (File object), upload trước khi gửi
      if (attachments.length > 0 && attachments[0] instanceof File) {
        setUploading(true);
        const result = await uploadChatFiles(auth.token, attachments);
        setUploading(false);
        if (result.success) {
          uploadedAttachments = result.data;
        } else {
          toast.error("Không thể tải file lên");
          setSending(false);
          return;
        }
      } else if (attachments.length > 0) {
        // Trường hợp đã là object attachment (nếu có)
        uploadedAttachments = attachments;
      }

      const messageData = {
        text: newMessage.trim(),
        attachments: uploadedAttachments.map((a) => a._id),
      };

      // Clear input immediately to prevent double send
      const textToSend = newMessage.trim();
      const attachmentsToSend = [...attachments];
      setNewMessage("");
      setAttachments([]);

      sendGlobalMessage(messageData, (res) => {
        if (!res || res.success !== true) {
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
      toast.error("Không thể gửi tin nhắn");
    } finally {
      setSending(false);
      setUploading(false);
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
          className="global-chat-attachment-image"
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
          className="global-chat-attachment-file"
        >
          <i className="bi bi-file-earmark-text global-chat-attachment-icon"></i>
          <div className="global-chat-attachment-info">
            <div className="global-chat-attachment-name">{attachment.filename}</div>
            <small className="global-chat-attachment-size">{(attachment.size / 1024).toFixed(1)} KB</small>
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
    <div className="card border-0 shadow-sm p-0 global-chat-container">
      <div className="card-header global-chat-header">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex flex-column">
            <h3 className="global-chat-title mb-2">
              <i className="bi bi-chat-dots-fill text-primary me-2"></i>
              Toàn diễn đàn
            </h3>
            <div className="d-flex flex-wrap align-items-center gap-3">
              <span className="global-chat-online-count">
                <i className="bi bi-people-fill me-1"></i>
                {onlineCount} người online
              </span>
              {typingUsers.length > 0 && (
                <span className="global-chat-typing-badge">
                  {typingUsers.length === 1
                    ? `${typingUsers[0].displayName || typingUsers[0].username} đang nhập...`
                    : `${typingUsers.length} người đang nhập...`}
                </span>
              )}
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => scrollToBottom()}
              title="Cuộn xuống cuối"
            >
              <i className="bi bi-arrow-down"></i>
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => window.history.back()}
              title="Đóng"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="card-body global-chat-messages"
        onScroll={handleMessagesScroll}
      >
        {messages.length === 0 ? (
          <div className="global-chat-empty">
            <i className="bi bi-chat-dots global-chat-empty-icon"></i>
            <p className="mt-3">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
          </div>
        ) : (
          <>
            {loadingMore && (
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Đang tải...</span>
                </div>
                <small className="d-block mt-2 text-muted">Đang tải tin nhắn cũ hơn...</small>
              </div>
            )}
            {!hasMoreMessages && messages.length >= 100 && (
              <div className="text-center py-2">
                <small className="text-muted">Đã tải hết tin nhắn</small>
              </div>
            )}
            {messages.map((msg, index) => {
              const sender = msg.senderId;
              const isMe = String(sender?._id) === String(user?.id || user?._id);
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showSenderInfo = shouldShowSenderInfo(msg, prevMsg);
              const hasAttachments = msg.attachments && msg.attachments.length > 0;

              return (
                <div
                  key={msg._id || index}
                  className={`d-flex ${showSenderInfo ? 'global-chat-message-group' : 'global-chat-message-single'} ${isMe ? "justify-content-end" : "justify-content-start"}`}
                >
                  {!isMe && (
                    <div className="me-2 flex-shrink-0" style={{ width: 40 }}>
                      {showSenderInfo ? (
                        <img
                          src={sender?.avatarUrl || sender?.avatar || `https://ui-avatars.com/api/?name=${sender?.displayName || sender?.username}&background=random`}
                          alt={sender?.displayName || sender?.username}
                          className="global-chat-avatar"
                        />
                      ) : null}
                    </div>
                  )}

                  <div className="global-chat-message">
                    {!isMe && showSenderInfo && (
                      <div className="global-chat-sender-info">
                        <strong className="global-chat-sender-name">{sender?.displayName || sender?.username}</strong>
                        <span className="global-chat-message-time">{formatTime(msg.createdAt)}</span>
                      </div>
                    )}
                    <div className={`global-chat-bubble ${isMe ? "global-chat-bubble-me" : "global-chat-bubble-other"}`}>
                      {/* Attachments */}
                      {hasAttachments && (
                        <div className="mb-2">
                          {msg.attachments.map((att) => renderAttachment(att))}
                        </div>
                      )}

                      {/* Text message */}
                      {msg.text && (
                        <p className="global-chat-bubble-text">
                          {msg.text}
                        </p>
                      )}

                      {/* Time - only show for my messages */}
                      {isMe && (
                        <small className="global-chat-bubble-time text-white-50">
                          {formatTime(msg.createdAt)}
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {typingUsers.length > 0 && (
              <div className="global-chat-typing-indicator">
                <div className="global-chat-typing-bubble">
                  <i className="bi bi-three-dots global-chat-typing-dots"></i>
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
          className="btn global-chat-scroll-button"
          onClick={() => scrollToBottom()}
          title="Cuộn xuống"
        >
          <i className="bi bi-arrow-down"></i>
        </button>
      )}

      <div className="card-footer global-chat-footer">
        {attachments.length > 0 && (
          <div className="global-chat-preview-container">
            {attachments.map((att, idx) => {
              const isImage = att.type ? att.type.startsWith("image/") : att.mime?.startsWith("image/");
              const name = att.name || att.filename || `file${idx}`;
              const size = att.size || att.size === 0 ? att.size : att.fileSize;
              let previewUrl = "";
              if (att instanceof File) {
                previewUrl = URL.createObjectURL(att);
              } else if (att.storageUrl) {
                previewUrl = att.storageUrl;
              }
              return (
                <div key={name + idx} className="global-chat-preview-item">
                  {isImage ? (
                    <img
                      src={previewUrl}
                      alt={name}
                      className="global-chat-preview-image"
                    />
                  ) : (
                    <i className="bi bi-file-earmark-text global-chat-attachment-icon"></i>
                  )}
                  <div className="global-chat-preview-info">
                    <div className="global-chat-preview-name">{name}</div>
                    <small className="global-chat-preview-size">{(size / 1024).toFixed(1)} KB</small>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-danger global-chat-preview-remove"
                    style={{ alignSelf: 'center', marginLeft: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 32, width: 32, padding: 0 }}
                    onClick={() => handleRemoveAttachment(att._id || att.name)}
                  >
                    <i className="bi bi-x" style={{ fontSize: 18, margin: 0 }}></i>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="global-chat-input-wrapper">
          <div className="global-chat-input-row">
            <div className="global-chat-actions">
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
                  className="global-chat-action-btn"
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
                  className="global-chat-action-btn"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={sending}
                  title="Chọn emoji"
                >
                  <i className="bi bi-emoji-smile"></i>
                </button>

                {showEmojiPicker && (
                  <div className="global-chat-emoji-picker">
                    <div className="global-chat-emoji-header">
                      <small className="global-chat-emoji-title">Chọn emoji</small>
                      <button
                        type="button"
                        className="btn btn-sm btn-close"
                        onClick={() => setShowEmojiPicker(false)}
                      ></button>
                    </div>
                    <div className="global-chat-emoji-grid">
                      {emojis.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="global-chat-emoji-btn"
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

            <div className="global-chat-input-field">
              <textarea
                ref={messageInputRef}
                rows={1}
                className="form-control global-chat-textarea"
                placeholder="Chia sẻ cảm nghĩ của bạn..."
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleComposerKeyDown}
                disabled={sending || uploading}
              />
            </div>

            <button
              type="submit"
              className="btn global-chat-send-btn"
              disabled={(!newMessage.trim() && attachments.length === 0) || sending || uploading}
            >
              {sending ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" />
                  <span className="d-none d-sm-inline ms-2">Đang gửi</span>
                </>
              ) : (
                <>
                  <i className="bi bi-send-fill"></i>
                  <span className="d-none d-sm-inline ms-2">Gửi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <div className="global-chat-lightbox" onClick={() => setLightboxImage(null)}>
          <button
            onClick={() => setLightboxImage(null)}
            className="global-chat-lightbox-close"
          >
            <i className="bi bi-x-lg"></i>
          </button>

          <img
            src={lightboxImage}
            alt="Preview"
            className="global-chat-lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default GlobalChat;
