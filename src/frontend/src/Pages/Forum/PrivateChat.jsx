import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext";
import { getUserByUsername, getPrivateChatHistory, uploadChatFiles } from "../../Utils/api";
import {
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

const PrivateChat = ({ usernameOverride, onBack }) => {
  const { username: urlUsername } = useParams();
  const username = usernameOverride || urlUsername;
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  const [peer, setPeer] = useState(null);
  const [peerId, setPeerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const me = auth.user;

  // Resolve username to userId
  useEffect(() => {
    if (!username || !auth.token) {
      console.log('⚠️ Missing username or token:', { username, hasToken: !!auth.token });
      return;
    }

    const resolvePeer = async () => {
      try {
        console.log('🔍 Resolving peer username:', username);
        const result = await getUserByUsername(username, auth.token);
        if (result.success && result.user) {
          console.log('✅ Peer resolved:', result.user);
          setPeer(result.user);
          setPeerId(String(result.user._id));
          setPeerOnline(result.user.isOnline || false);
        } else {
          console.error("❌ User not found:", username);
          // Don't navigate away if embedded in ListChat
          if (!usernameOverride) {
            navigate("/messages");
          }
        }
      } catch (error) {
        console.error("❌ Error resolving username:", error);
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

    const loadHistory = async () => {
      try {
        // Add timestamp to prevent caching
        const result = await getPrivateChatHistory(auth.token, peerId, 1, 50);
        console.log('📂 Loaded messages from DB:', result.data?.messages?.length || 0);
        if (result.success && result.data) {
          const msgs = result.data.messages || [];
          setMessages(msgs);
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
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

    const roomId = [String(me.id), String(peerId)].sort().join("_");
    joinPrivateRoom(roomId);

    const handleNewMessage = (data) => {
      const fromUserIdStr = String(data.fromUserId);
      const toUserIdStr = String(data.toUserId);
      const meIdStr = String(me.id);
      const peerIdStr = String(peerId);

      console.log('📨 New message received:', { 
        from: fromUserIdStr, 
        to: toUserIdStr, 
        myId: meIdStr, 
        peerId: peerIdStr,
        isMine: fromUserIdStr === meIdStr
      });

      if (
        (fromUserIdStr === peerIdStr && toUserIdStr === meIdStr) ||
        (fromUserIdStr === meIdStr && toUserIdStr === peerIdStr)
      ) {
        // Populate senderId với thông tin user đầy đủ
        // QUAN TRỌNG: Khi tin nhắn của mình, senderId phải là object me
        const enrichedMessage = {
          ...data.message,
          senderId: fromUserIdStr === meIdStr 
            ? { _id: me.id, id: me.id, username: me.username, ...me } 
            : (fromUserIdStr === peerIdStr ? peer : data.message.senderId)
        };
        
        console.log('✅ Adding message to state:', { 
          senderId: enrichedMessage.senderId?._id || enrichedMessage.senderId?.id,
          isMine: fromUserIdStr === meIdStr 
        });
        
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

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim() || !peerId) return;

    const msgData = {
      text: newMessage.trim(),
      attachments: [],
    };

    sendPrivateMessage(peerId, msgData);
    setNewMessage("");
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

  const handleTypingInput = (e) => {
    setNewMessage(e.target.value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendPrivateTyping(peerId, true);

    typingTimeoutRef.current = setTimeout(() => {
      sendPrivateTyping(peerId, false);
    }, 1000);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !peerId) return;

    setUploadingFiles(true);
    try {
      const result = await uploadChatFiles(auth.token, files);
      if (result.success && result.data) {
        const msgData = {
          text: "",
          attachments: result.data,
        };
        sendPrivateMessage(peerId, msgData);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Lỗi khi tải file lên");
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatMessageTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading || !peer) {
    return (
      <div className="d-flex justify-content-center align-items-center w-100" style={{ height: "100%" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-100 h-100 d-flex flex-column" style={{ overflow: "hidden" }}>
      <div className="d-flex flex-column h-100">
        {/* Header */}
        <div className="border-bottom bg-white px-2 px-md-3 py-2" style={{ minHeight: "56px", flexShrink: 0 }}>
          <div className="d-flex align-items-center">
            <button
              className="btn btn-light btn-sm me-2 d-md-none"
              onClick={handleBack}
              style={{ padding: "0.25rem 0.5rem" }}
            >
              <i className="bi bi-arrow-left"></i>
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
        <div className="flex-grow-1 overflow-auto p-2 p-md-3 bg-light" style={{ minHeight: 0 }}>
          {messages.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="bi bi-chat-dots" style={{ fontSize: "2.5rem" }}></i>
              <p className="mt-3 mb-1" style={{ fontSize: "0.95rem" }}>Bắt đầu cuộc trò chuyện</p>
              <small className="text-muted">Gửi tin nhắn đầu tiên...</small>
            </div>
          ) : (
            messages.map((msg, idx) => {
              // So sánh senderId với me.id
              const myIdStr = String(me.id);
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
                      className="rounded-circle me-2 flex-shrink-0 d-none d-sm-block"
                      style={{ width: 28, height: 28, objectFit: "cover" }}
                    />
                  )}
                  
                  <div style={{ maxWidth: "85%", maxWidth: "min(85%, 400px)" }}>
                    <div
                      className={`rounded-3 px-2 px-md-3 py-2 ${
                        isMine ? "bg-primary text-white" : "bg-white"
                      }`}
                      style={{ 
                        wordWrap: "break-word",
                        borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        fontSize: "0.9rem"
                      }}
                    >
                      {msg.text && <div>{msg.text}</div>}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2">
                          {msg.attachments.map((att, attIdx) => (
                            <a
                              key={attIdx}
                              href={att.storageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={isMine ? "text-white" : "text-primary"}
                              style={{ fontSize: "0.85rem" }}
                            >
                              <i className="bi bi-paperclip me-1"></i>
                              {att.filename}
                            </a>
                          ))}
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
                className="rounded-circle me-2 d-none d-sm-block"
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

        {/* Input */}
        <div className="border-top bg-white p-2 p-md-3" style={{ flexShrink: 0 }}>
          <div className="d-flex align-items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              style={{ display: "none" }}
            />
            <button
              className="btn btn-light flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFiles}
              style={{ width: 36, height: 36, padding: 0 }}
            >
              {uploadingFiles ? (
                <span className="spinner-border spinner-border-sm"></span>
              ) : (
                <i className="bi bi-paperclip"></i>
              )}
            </button>
            <input
              type="text"
              className="form-control"
              placeholder="Aa"
              value={newMessage}
              onChange={handleTypingInput}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              style={{ fontSize: "0.9rem" }}
            />
            <button
              className="btn btn-primary rounded-circle flex-shrink-0"
              onClick={handleSend}
              disabled={!newMessage.trim()}
              style={{ width: 36, height: 36, padding: 0 }}
            >
              <i className="bi bi-send-fill"></i>
            </button>
          </div>
        </div>
      </div>

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
