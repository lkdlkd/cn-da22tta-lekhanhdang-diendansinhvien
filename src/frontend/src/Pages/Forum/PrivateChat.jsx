import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { useParams, useNavigate, Link, useOutletContext } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext";
import { toast } from "react-toastify";
import { getUserByUsername, getPrivateChatHistory, uploadChatFiles } from "../../Utils/api";
import {
  socket,
  joinPrivateRoom,
  leavePrivateRoom,
  sendPrivateMessage,
  sendPrivateTyping,
  markPrivateAsRead,
  onPrivateMessage,
  offPrivateMessage,
  onPrivateNotify,
  offPrivateNotify,
  onPrivateTyping,
  offPrivateTyping,
  onUserStatusChanged,
  offUserStatusChanged,
} from "../../Utils/socket";
import LoadingPost from "@/Components/LoadingPost";

const PrivateChat = ({ usernameOverride, onBack }) => {
  const { username: urlUsername } = useParams();
  const username = usernameOverride || urlUsername;
  const { auth } = useContext(AuthContext);
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const [peer, setPeer] = useState(null);
  const [peerId, setPeerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const previousScrollHeightRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const emojiPickerRef = useRef(null);
  const messageInputRef = useRef(null);

  const me = user;

  // Danh sách emoji phổ biến
  const emojis = [
    "😊", "😂", "❤️", "😍", "😭", "🤔", "👍", "🎉", "🔥", "✨",
    "💯", "😎", "🥰", "😢", "😱", "🤗", "💪", "🙏", "👏", "🎈",
    "🌟", "💖", "😴", "🤩", "😜", "🥳", "🤝", "💕", "🌈", "⭐"
  ];

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

  // Resolve username to userId
  useEffect(() => {
    if (!username || !auth.token) {
      // .log('⚠️ Missing username or token:', { username, hasToken: !!auth.token });
      return;
    }

    const resolvePeer = async () => {
      try {
        // console.log('🔍 Resolving peer username:', username);
        const result = await getUserByUsername(username, auth.token);
        if (result.success && result.user) {
          // console.log('✅ Peer resolved:', result.user);
          setPeer(result.user);
          setPeerId(String(result.user._id));
          setPeerOnline(result.user.isOnline || false);
        } else {
          // console.error("❌ User not found:", username);
          // Don't navigate away if embedded in ListChat
          if (!usernameOverride) {
            navigate("/messages");
          }
        }
      } catch (error) {
        // console.error("❌ Error resolving username:", error);
        // Don't navigate away if embedded in ListChat
        if (!usernameOverride) {
          navigate("/messages");
        }
      }
    };

    resolvePeer();
  }, [username, auth.token, navigate, usernameOverride]);

  // Load chat history
  useEffect(() => {
    if (!peerId || !auth.token) return;

    // Reset state when peerId changes
    setMessages([]);
    setCurrentPage(1);
    setHasMore(true);
    setLoading(true);
    isFirstLoadRef.current = true; // Mark as first load

    const loadHistory = async () => {
      try {
        const result = await getPrivateChatHistory(auth.token, peerId, 1, 50);
        // console.log('📂 Loaded messages from DB:', result.data?.messages?.length || 0);
        if (result.success && result.data) {
          const msgs = result.data.messages || [];
          setMessages(msgs);
          setCurrentPage(1);
          setHasMore(msgs.length >= 50); // If we got 50 messages, there might be more

          // Mark messages as read when loading chat
          markPrivateAsRead(peerId);
        }
      } catch (error) {
        // console.error("Error loading chat history:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [peerId, auth.token]);

  // Join room and listen to socket events
  useEffect(() => {
    if (!peerId || !me) {
      return;
    }

    // Reset file selection when switching users
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const roomId = [String(me._id), String(peerId)].sort().join("_");
    joinPrivateRoom(roomId);

    const handleNewMessage = (data) => {
      const fromUserIdStr = String(data.fromUserId);
      const toUserIdStr = String(data.toUserId);
      const meIdStr = String(me._id);
      const peerIdStr = String(peerId);

      // Chỉ thêm tin nhắn nếu nó liên quan đến cuộc trò chuyện hiện tại

      if (
        (fromUserIdStr === peerIdStr && toUserIdStr === meIdStr) ||
        (fromUserIdStr === meIdStr && toUserIdStr === peerIdStr)
      ) {
        // Populate senderId với thông tin user đầy đủ
        // QUAN TRỌNG: Khi tin nhắn của mình, senderId phải là object me
        const enrichedMessage = {
          ...data.message,
          senderId: fromUserIdStr === meIdStr
            ? { _id: me._id, id: me._id, username: me.username, ...me }
            : (fromUserIdStr === peerIdStr ? peer : data.message.senderId)
        };

        // console.log('✅ New message enriched:', enrichedMessage);

        setMessages((prev) => [...prev, enrichedMessage]);

        if (fromUserIdStr === peerIdStr) {
          markPrivateAsRead(peerId);
        }
      }
    };

    const handleTyping = (data) => {
      const fromUserIdStr = String(data.fromUserId);
      const peerIdStr = String(peerId);

      if (fromUserIdStr === peerIdStr) {
        setIsTyping(data.isTyping);
      }
    };

    const handleStatusChange = ({ userId, isOnline }) => {
      const userIdStr = String(userId);
      const peerIdStr = String(peerId);

      if (userIdStr === peerIdStr) {
        setPeerOnline(isOnline);
      }
    };

    onPrivateMessage(handleNewMessage);
    // onPrivateNotify(handleNotify); // ❌ Tắt vì đã join room, chỉ cần handleNewMessage
    onPrivateTyping(handleTyping);
    onUserStatusChanged(handleStatusChange);

    return () => {
      leavePrivateRoom(roomId);
      offPrivateMessage(handleNewMessage);
      // offPrivateNotify(handleNotify); // ❌ Tắt vì không dùng nữa
      offPrivateTyping(handleTyping);
      offUserStatusChanged(handleStatusChange);
    };
  }, [peerId, me, peer]); // Add peer to dependencies

  // Re-join private room when tab becomes visible (helps after long sleep)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && socket.connected && peerId && me) {
        const roomId = [String(me._id), String(peerId)].sort().join("_");
        console.log('👀 [PrivateChat] Tab visible, ensuring joined to room:', roomId);
        joinPrivateRoom(roomId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [peerId, me]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isFirstLoadRef.current && messages.length > 0) {
      // First load: scroll immediately without animation
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      isFirstLoadRef.current = false;
    } else if (isAtBottom) {
      // New message arrived and user is at bottom: smooth scroll
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  // Handle scroll to load more messages
  const handleScroll = async (e) => {
    const container = e.target;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // Check if user is at bottom (within 50px)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(isNearBottom);

    // Show/hide scroll to bottom button
    setShowScrollButton(!isNearBottom && scrollTop > 200);

    // If user scrolled to top (within 100px) and we have more messages to load
    if (scrollTop < 100 && !loadingMore && hasMore && peerId && auth.token) {
      setLoadingMore(true);
      previousScrollHeightRef.current = container.scrollHeight;

      try {
        const nextPage = currentPage + 1;
        // console.log(`📥 Loading more messages - Page ${nextPage}`);

        const result = await getPrivateChatHistory(auth.token, peerId, nextPage, 50);

        if (result.success && result.data) {
          const olderMessages = result.data.messages || [];
          // console.log(`✅ Loaded ${olderMessages.length} older messages`);

          if (olderMessages.length > 0) {
            // Prepend older messages to the beginning of the array
            setMessages(prev => [...olderMessages, ...prev]);
            setCurrentPage(nextPage);
            setHasMore(olderMessages.length >= 50);

            // Maintain scroll position after new messages are added
            setTimeout(() => {
              const newScrollHeight = container.scrollHeight;
              const scrollDiff = newScrollHeight - previousScrollHeightRef.current;
              container.scrollTop = scrollDiff;
            }, 0);
          } else {
            setHasMore(false);
          }
        }
      } catch (error) {
        //  console.error("Error loading more messages:", error);
      } finally {
        setLoadingMore(false);
      }
    }
  };

  const handleSend = () => {
    if (!newMessage.trim() || !peerId) return;

    const msgData = {
      text: newMessage.trim(),
      attachments: [],
    };

    sendPrivateMessage(peerId, msgData, (res) => {
      if (!res || res.success !== true) {
        const reason = res?.error
        toast.error(reason);
        return;
      }
      // Clear only on success
      setNewMessage("");
      setSelectedFiles([]);
    });
  };

  const handleBack = () => {
    if (usernameOverride && onBack) {
      // Nếu được embed trong ListChat, gọi callback onBack
      onBack();
    } else {
      // Nếu là standalone route, navigate
      navigate("/messages");
    }
  };

  const autoSizeInput = useCallback(() => {
    if (!messageInputRef.current) return;
    const el = messageInputRef.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, []);

  const handleTypingInput = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    autoSizeInput();

    if (!peerId) {
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendPrivateTyping(peerId, true);

    typingTimeoutRef.current = setTimeout(() => {
      sendPrivateTyping(peerId, false);
    }, 1000);
  };

  const handleComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (selectedFiles.length > 0) {
        handleSendFiles();
      } else {
        handleSend();
      }
    }
  };

  useEffect(() => {
    autoSizeInput();
  }, [newMessage, autoSizeInput]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !peerId) return;

    // Hiển thị preview các file đã chọn
    setSelectedFiles(files);
  };

  const handleSendFiles = async () => {
    if (selectedFiles.length === 0 || !peerId) return;

    setUploadingFiles(true);
    try {
      const result = await uploadChatFiles(auth.token, selectedFiles);
      if (result.success && result.data) {
        const msgData = {
          text: newMessage.trim() || "", // Cho phép gửi kèm text
          attachments: result.data,
        };
        sendPrivateMessage(peerId, msgData, (res) => {
          if (!res || res.success !== true) {
            const reason = res?.error;
            toast.error(reason);
            return;
          }
          // Clear only on success
          setNewMessage("");
          setSelectedFiles([]);
        });
      }
    } catch (error) {
      // console.error("Error uploading files:", error);
      toast.error("Lỗi khi tải file lên");
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const getFileIcon = (filename) => {
    if (!filename || typeof filename !== 'string') {
      return 'bi-file-earmark text-secondary';
    }

    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
      pdf: 'bi-file-pdf text-danger',
      doc: 'bi-file-word text-primary',
      docx: 'bi-file-word text-primary',
      xls: 'bi-file-excel text-success',
      xlsx: 'bi-file-excel text-success',
      ppt: 'bi-file-ppt text-warning',
      pptx: 'bi-file-ppt text-warning',
      txt: 'bi-file-text text-secondary',
      zip: 'bi-file-zip text-info',
      rar: 'bi-file-zip text-info',
      '7z': 'bi-file-zip text-info',
      jpg: 'bi-file-image text-success',
      jpeg: 'bi-file-image text-success',
      png: 'bi-file-image text-success',
      gif: 'bi-file-image text-success',
      webp: 'bi-file-image text-success',
      svg: 'bi-file-image text-success',
    };
    return iconMap[ext] || 'bi-file-earmark text-secondary';
  };

  const isImageFile = (filename) => {
    if (!filename) return false;
    const ext = filename.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  };

  const openLightbox = (images, index) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxImage(images[index]);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    setLightboxImages([]);
    setLightboxIndex(0);
  };

  const nextImage = () => {
    if (lightboxImages.length === 0) return;
    const newIndex = (lightboxIndex + 1) % lightboxImages.length;
    setLightboxIndex(newIndex);
    setLightboxImage(lightboxImages[newIndex]);
  };

  const prevImage = () => {
    if (lightboxImages.length === 0) return;
    const newIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    setLightboxIndex(newIndex);
    setLightboxImage(lightboxImages[newIndex]);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatMessageTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
  };

  if (loading || !peer) {
    return (
      <LoadingPost />
    );
  }

  return (
    <div className="w-100 h-100 d-flex flex-column" style={{ overflow: "hidden", position: "relative" }}>
      <div className="d-flex flex-column h-100">
        {/* Header */}
        <div className="border-bottom bg-white px-2 px-md-3 py-2" style={{
          minHeight: "56px",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          zIndex: 10,
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
        }}>
          <div className="d-flex align-items-center">
            <button
              className="btn btn-light btn-sm me-2"
              onClick={handleBack}
              style={{
                padding: "0.25rem 0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <span style={{ fontSize: '20px' }}>←</span>
              <span className="d-none d-md-inline">Trở lại</span>
            </button>
            <div className="position-relative me-2 me-md-3 flex-shrink-0">
              <img
                src={peer.avatarUrl || `https://ui-avatars.com/api/?name=${peer.displayName || peer.username}&background=random`}
                alt={peer.displayName || peer.username}
                className="rounded-circle"
                style={{ width: 36, height: 36, objectFit: "cover" }}
              />
              {peerOnline && (
                <span
                  className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle"
                  style={{ width: 10, height: 10 }}
                ></span>
              )}
            </div>
            <div className="flex-grow-1 overflow-hidden">
              <h6 className="mb-0 fw-semibold text-truncate" style={{ fontSize: "0.95rem" }}>
                {peer.displayName || peer.username}
              </h6>
              <small className="text-muted d-none d-sm-block" style={{ fontSize: "0.75rem" }}>
                {peerOnline ? "Đang hoạt động" : "Không hoạt động"}
              </small>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-grow-1 overflow-auto p-2 p-md-3 bg-light"
          style={{
            minHeight: 0,
            maxHeight: "100%",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch"
          }}
          onScroll={handleScroll}
        >
          {/* Loading More Indicator */}
          {loadingMore && (
            <LoadingPost small={true} />
          )}

          {/* No More Messages Indicator */}
          {!hasMore && messages.length > 0 && (
            <div className="text-center py-2 mb-3">
              <small className="text-muted">
                <i className="bi bi-check-circle me-1"></i>
                Đã hiển thị tất cả tin nhắn
              </small>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="bi bi-chat-dots" style={{ fontSize: "2.5rem" }}></i>
              <p className="mt-3 mb-1" style={{ fontSize: "0.95rem" }}>Bắt đầu cuộc trò chuyện</p>
              <small className="text-muted">Gửi tin nhắn đầu tiên...</small>
            </div>
          ) : (
            messages.map((msg, idx) => {
              // So sánh senderId với me.id
              const myIdStr = String(me._id);
              const msgSenderIdStr = String(msg.senderId?._id || msg.senderId?.id || msg.senderId);
              const isMine = msgSenderIdStr === myIdStr;

              // Use sender from message data if available, fallback to me/peer
              const sender = msg.senderId && typeof msg.senderId === 'object'
                ? msg.senderId
                : (isMine ? me : peer);

              return (
                <div
                  key={idx}
                  className={`d-flex mb-2 mb-md-3 ${isMine ? "justify-content-end" : "justify-content-start"}`}
                >
                  {/* Avatar - chỉ hiển thị cho tin nhắn người khác, bên trái */}
                  {!isMine && (
                    <img
                      src={sender.avatarUrl || sender.avatar || `https://ui-avatars.com/api/?name=${sender.displayName || sender.username}&background=random`}
                      alt={sender.displayName || sender.username}
                      className="rounded-circle me-2 flex-shrink-0"
                      style={{ width: 28, height: 28, objectFit: "cover" }}
                    />
                  )}

                  <div style={{ maxWidth: "85%", maxWidth: "min(85%, 400px)" }}>
                    <div
                      className={`rounded-3 px-2 px-md-3 py-2 ${isMine ? "bg-primary text-white" : "bg-white"
                        }`}
                      style={{
                        wordWrap: "break-word",
                        borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        fontSize: "0.9rem"
                      }}
                    >
                      {msg.text && <div>{msg.text}</div>}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className={msg.text ? "mt-2" : ""}>
                          {msg.attachments.map((att, attIdx) => {
                            if (!att || !att.filename) return null;

                            const isImage = isImageFile(att.filename);

                            return (
                              <div key={attIdx} style={{ marginBottom: attIdx < msg.attachments.length - 1 ? '8px' : '0' }}>
                                {isImage ? (
                                  // Image Preview
                                  <div className="position-relative" style={{ maxWidth: '280px' }}>
                                    <img
                                      src={att.storageUrl}
                                      alt={att.filename}
                                      className="rounded"
                                      style={{
                                        width: '100%',
                                        maxHeight: '200px',
                                        objectFit: 'cover',
                                        cursor: 'pointer',
                                        transition: 'opacity 0.2s'
                                      }}
                                      onClick={() => {
                                        // Collect all images in this message
                                        const imageAttachments = msg.attachments.filter(a => a && a.filename && isImageFile(a.filename));
                                        const imageUrls = imageAttachments.map(a => a.storageUrl);
                                        const currentIndex = imageAttachments.findIndex(a => a.storageUrl === att.storageUrl);
                                        openLightbox(imageUrls, currentIndex);
                                      }}
                                      onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                                      onMouseLeave={(e) => e.target.style.opacity = '1'}
                                    />
                                    <div className={`d-flex align-items-center justify-content-between mt-1 px-2 py-1 rounded ${isMine ? 'bg-white bg-opacity-25' : 'bg-light'}`}>
                                      <div className="flex-grow-1 overflow-hidden me-2">
                                        <div className={`text-truncate ${isMine ? 'text-white' : 'text-dark'}`} style={{ fontSize: "0.75rem" }}>
                                          {att.filename}
                                        </div>
                                        {att.size && (
                                          <small className={`${isMine ? 'text-white text-opacity-75' : 'text-muted'}`} style={{ fontSize: "0.7rem" }}>
                                            {formatFileSize(att.size)}
                                          </small>
                                        )}
                                      </div>
                                      <Link
                                        to={att.storageUrl}
                                        download
                                        className={`btn btn-sm ${isMine ? 'btn-light' : 'btn-outline-secondary'}`}
                                        style={{ padding: '0.15rem 0.4rem', fontSize: '0.8rem' }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <i className="bi bi-download"></i>
                                      </Link>
                                    </div>
                                  </div>
                                ) : (
                                  // File Card
                                  <div
                                    className={`d-flex align-items-center p-2 rounded ${isMine ? 'bg-white bg-opacity-25' : 'bg-light'}`}
                                    style={{
                                      minWidth: '200px',
                                      maxWidth: '320px',
                                      border: isMine ? 'none' : '1px solid #e0e0e0'
                                    }}
                                  >
                                    <div
                                      className={`rounded d-flex align-items-center justify-content-center me-2 flex-shrink-0`}
                                      style={{
                                        width: '40px',
                                        height: '40px',
                                        backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : '#f8f9fa'
                                      }}
                                    >
                                      <i className={`${getFileIcon(att.filename)} fs-5`}></i>
                                    </div>
                                    <div className="flex-grow-1 overflow-hidden me-2">
                                      <Link
                                        to={att.storageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`text-decoration-none d-block text-truncate ${isMine ? 'text-white' : 'text-dark'}`}
                                        style={{ fontSize: "0.85rem", fontWeight: "500" }}
                                      >
                                        {att.filename}
                                      </Link>
                                      {att.size && (
                                        <small className={`${isMine ? 'text-white text-opacity-75' : 'text-muted'}`} style={{ fontSize: "0.75rem" }}>
                                          {formatFileSize(att.size)}
                                        </small>
                                      )}
                                    </div>
                                    <Link
                                      to={att.storageUrl}
                                      download
                                      className={`btn btn-sm ${isMine ? 'btn-light' : 'btn-outline-primary'}`}
                                      style={{ padding: '0.25rem 0.5rem' }}
                                    >
                                      <i className="bi bi-download"></i>
                                    </Link>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <small className={`text-muted d-block mt-1 ${isMine ? "text-end" : "text-start"}`} style={{ fontSize: "0.7rem" }}>
                      {formatMessageTime(msg.createdAt)}
                    </small>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="d-flex mb-2 mb-md-3">
              <img
                src={peer.avatarUrl || peer.avatar || `https://ui-avatars.com/api/?name=${peer.displayName || peer.username}&background=random`}
                alt={peer.displayName || peer.username}
                className="rounded-circle me-2"
                style={{ width: 28, height: 28, objectFit: "cover" }}
              />
              <div className="bg-white rounded-3 px-3 py-2">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            className="btn btn-primary rounded-circle shadow-lg position-absolute"
            onClick={scrollToBottom}
            style={{
              bottom: '90px',
              right: '20px',
              width: '48px',
              height: '48px',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              border: 'none'
            }}
            title="Trở về tin nhắn mới nhất"
          >
            <i className="bi bi-arrow-down" style={{ fontSize: '1.25rem' }}></i>
          </button>
        )}

        {/* Input */}
        <div className="border-top bg-white p-2 p-md-3" style={{
          flexShrink: 0,
          position: "sticky",
          bottom: 0,
          zIndex: 10,
          boxShadow: "0 -2px 4px rgba(0,0,0,0.05)"
        }}>
          {/* File Preview */}
          {selectedFiles.length > 0 && (
            <div className="mb-2 p-3 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <small className="fw-semibold text-dark">
                  <i className="bi bi-paperclip me-1"></i>
                  {selectedFiles.length} file đã chọn
                </small>
                <button
                  className="btn btn-link btn-sm text-danger p-0 text-decoration-none"
                  onClick={() => {
                    setSelectedFiles([]);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  style={{ fontSize: "0.85rem", fontWeight: "500" }}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Xóa tất cả
                </button>
              </div>
              <div className="d-flex flex-column gap-2" style={{ maxHeight: "200px", overflowY: "auto" }}>
                {selectedFiles.map((file, idx) => {
                  const isImage = isImageFile(file.name);
                  const previewUrl = isImage ? URL.createObjectURL(file) : null;

                  return (
                    <div key={idx} className="d-flex align-items-center p-2 bg-white rounded shadow-sm border">
                      {isImage && previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={file.name}
                          className="rounded me-2"
                          style={{
                            width: '48px',
                            height: '48px',
                            objectFit: 'cover',
                            border: '2px solid #e0e0e0'
                          }}
                        />
                      ) : (
                        <div
                          className="rounded d-flex align-items-center justify-content-center me-2"
                          style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: '#f0f0f0'
                          }}
                        >
                          <i className={`${getFileIcon(file.name)} fs-4`}></i>
                        </div>
                      )}
                      <div className="flex-grow-1 overflow-hidden me-2">
                        <div className="text-truncate fw-semibold" style={{ fontSize: "0.85rem", color: '#212529' }}>
                          {file.name}
                        </div>
                        <small className="text-muted">{formatFileSize(file.size)}</small>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-danger rounded-circle"
                        onClick={() => handleRemoveFile(idx)}
                        style={{ width: '32px', height: '32px', padding: '0' }}
                        title="Xóa file"
                      >
                        <i className="bi bi-x-lg"></i>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="d-flex align-items-center gap-2 position-relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              style={{ display: "none" }}
            />
            <button
              className="btn btn-outline-secondary flex-shrink-0 d-flex align-items-center justify-content-center"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFiles}
              style={{
                width: 40,
                height: 40,
                padding: 0,
                borderRadius: '50%',
                transition: 'all 0.2s'
              }}
              title="Đính kèm file"
            >
              {uploadingFiles ? (
                <span className="spinner-border spinner-border-sm"></span>
              ) : (
                <i className="bi bi-paperclip fs-5"></i>
              )}
            </button>

            {/* Emoji Picker Button */}
            <div className="position-relative" ref={emojiPickerRef}>
              <button
                className="btn btn-outline-secondary flex-shrink-0 d-flex align-items-center justify-content-center"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  width: 40,
                  height: 40,
                  padding: 0,
                  borderRadius: '50%',
                  transition: 'all 0.2s'
                }}
                title="Chọn emoji"
              >
                <i className="bi bi-emoji-smile fs-5"></i>
              </button>

              {/* Emoji Picker Dropdown */}
              {showEmojiPicker && (
                <div
                  className="position-absolute bg-white border rounded shadow-lg p-3"
                  style={{
                    bottom: '50px',
                    left: '0',
                    width: '280px',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    zIndex: 1000
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <small className="fw-semibold text-muted">Chọn emoji</small>
                    <button
                      className="btn-close btn-sm"
                      onClick={() => setShowEmojiPicker(false)}
                      style={{ fontSize: '0.7rem' }}
                    ></button>
                  </div>
                  <div className="d-flex flex-wrap gap-1">
                    {emojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        className="btn btn-light p-2"
                        onClick={() => handleEmojiSelect(emoji)}
                        style={{
                          fontSize: '1.3rem',
                          width: '40px',
                          height: '40px',
                          padding: '0',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <textarea
              ref={messageInputRef}
              rows={1}
              className="form-control"
              placeholder="Nhập tin nhắn..."
              value={newMessage}
              onChange={handleTypingInput}
              onKeyDown={handleComposerKeyDown}
              style={{
                fontSize: "0.9rem",
                borderRadius: '20px',
                paddingLeft: '16px',
                paddingRight: '16px',
                resize: 'none',
                minHeight: '42px',
                maxHeight: '180px'
              }}
            />
            <button
              className="btn btn-primary flex-shrink-0 d-flex align-items-center justify-content-center"
              onClick={selectedFiles.length > 0 ? handleSendFiles : handleSend}
              disabled={(!newMessage.trim() && selectedFiles.length === 0) || uploadingFiles}
              style={{
                width: 40,
                height: 40,
                padding: 0,
                borderRadius: '50%',
                transition: 'all 0.2s'
              }}
              title={selectedFiles.length > 0 ? `Gửi ${selectedFiles.length} file` : "Gửi tin nhắn"}
            >
              {uploadingFiles ? (
                <span className="spinner-border spinner-border-sm text-white"></span>
              ) : (
                <i className="bi bi-send-fill"></i>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 9999,
            cursor: 'zoom-out'
          }}
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            className="btn btn-light position-absolute top-0 end-0 m-3 rounded-circle"
            style={{ width: '40px', height: '40px', zIndex: 10000 }}
            onClick={closeLightbox}
          >
            <i className="bi bi-x-lg"></i>
          </button>

          {/* Previous Button */}
          {lightboxImages.length > 1 && (
            <button
              className="btn btn-light position-absolute start-0 top-50 translate-middle-y ms-3 rounded-circle"
              style={{ width: '40px', height: '40px', zIndex: 10000 }}
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
            >
              <i className="bi bi-chevron-left"></i>
            </button>
          )}

          {/* Image */}
          <img
            src={lightboxImage}
            alt="Full size"
            className="img-fluid"
            style={{
              maxWidth: '90%',
              maxHeight: '90vh',
              objectFit: 'contain',
              cursor: 'default'
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next Button */}
          {lightboxImages.length > 1 && (
            <button
              className="btn btn-light position-absolute end-0 top-50 translate-middle-y me-3 rounded-circle"
              style={{ width: '40px', height: '40px', zIndex: 10000 }}
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          )}

          {/* Image Counter */}
          {lightboxImages.length > 1 && (
            <div
              className="position-absolute bottom-0 start-50 translate-middle-x mb-3 bg-dark bg-opacity-75 text-white px-3 py-2 rounded"
              style={{ fontSize: '0.875rem' }}
            >
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          )}
        </div>
      )}

      <style>{`
        .typing-indicator {
          display: flex;
          gap: 4px;
        }
        .typing-indicator span {
          width: 8px;
          height: 8px;
          background-color: #999;
          border-radius: 50%;
          animation: typing 1.4s infinite;
        }
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
};

export default PrivateChat;
