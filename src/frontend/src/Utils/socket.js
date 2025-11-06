// src/Utils/socket.js
import { io } from "socket.io-client";

const SOCKET_URL = (process.env.REACT_APP_API_BASE || "http://localhost:5000").replace(/\/api$/, '');

// Get token from localStorage for socket auth
const getToken = () => localStorage.getItem("token");

// Initialize socket with authentication
export const socket = io(SOCKET_URL, {
  autoConnect: false, // Don't auto-connect, we'll connect manually with token
  transports: ["websocket"],
  auth: (cb) => {
    const token = getToken();
   // console.log("🔐 Socket auth callback, token:", token ? "present" : "missing");
    cb({ token });
  },
});

// Connect socket with token
export const connectSocket = () => {
  const token = getToken();
  if (token) {
    // Update auth before connecting
    socket.auth = { token };
    
    if (!socket.connected) {
      socket.connect();
      // console.log("🔌 Connecting socket with authentication...");
    } else {
     // console.log("✅ Socket already connected");
    }
  } else {
    // console.warn("⚠️ No token found, socket not connected");
  }
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
    // console.log("🔌 Socket disconnected");
  }
};

// Khi socket kết nối lại, update auth token
socket.io.on("reconnect_attempt", () => {
  const token = getToken();
  if (token) {
    socket.auth = { token };
  //   console.log("🔄 Reconnecting with fresh token...");
  }
});

// Khi socket kết nối, re-emit user:online (backward compatibility)
socket.on("connect", () => {
 //  console.log("✅ Socket connected:", socket.id);
  const userId = localStorage.getItem("userId");
  if (userId) {
    socket.emit("user:online", userId);
    // console.log("🔄 Re-announcing online status for:", userId);
  }
});

socket.on("disconnect", (reason) => {
  // console.log("❌ Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
  // console.error("❌ Socket connection error:", error.message);
});

// Helper function để emit user online status
export const setUserOnline = (userId) => {
  if (userId) {
    socket.emit("user:online", userId);
    // console.log("🟢 User set to online:", userId);
  }
};

// Helper function để listen user status changes
export const onUserStatusChanged = (callback) => {
  socket.on("user:status:changed", callback);
};

// Helper function để remove listener
export const offUserStatusChanged = (callback) => {
  socket.off("user:status:changed", callback);
};

// ============================================
// PRIVATE CHAT HELPERS
// ============================================
export const joinPrivateRoom = (roomId) => {
  socket.emit("chat:private:join", roomId);
  // console.log("🚪 Joined private room:", roomId);
};

export const leavePrivateRoom = (roomId) => {
  socket.emit("chat:private:leave", roomId);
 //  console.log("🚪 Left private room:", roomId);
};

export const sendPrivateMessage = (peerId, message) => {
  socket.emit("chat:private:message", { peerId, message });
  // console.log("📤 Sent private message to:", peerId);
};

export const sendPrivateTyping = (peerId, isTyping) => {
  socket.emit("chat:private:typing", { peerId, isTyping });
};

export const markPrivateAsRead = (peerId) => {
  socket.emit("chat:private:read", { peerId });
  // console.log("✅ Marked messages from", peerId, "as read");
};

export const onPrivateMessage = (callback) => {
  // Remove all previous listeners to avoid duplicates
  socket.off("chat:private:new");
  socket.on("chat:private:new", callback);
};

export const onPrivateNotify = (callback) => {
  // Remove all previous listeners to avoid duplicates
  socket.off("chat:private:notify");
  socket.on("chat:private:notify", callback);
};

export const onPrivateTyping = (callback) => {
  // Remove all previous listeners to avoid duplicates
  socket.off("chat:private:typing");
  socket.on("chat:private:typing", callback);
};

export const onPrivateRead = (callback) => {
  socket.on("chat:private:read", callback);
};

export const offPrivateMessage = (callback) => {
  socket.off("chat:private:new", callback);
};

export const offPrivateNotify = (callback) => {
  socket.off("chat:private:notify", callback);
};

export const offPrivateTyping = (callback) => {
  socket.off("chat:private:typing", callback);
};

export const offPrivateRead = (callback) => {
  socket.off("chat:private:read", callback);
};