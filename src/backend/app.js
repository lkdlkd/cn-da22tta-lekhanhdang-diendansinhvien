require('dotenv').config();
require('module-alias/register');
const express = require('express');
const cors = require('cors');
const connectDB = require('@/src/config/connection');
connectDB();

const app = express();
app.use(express.json());
app.use(cors());

// 🔥 Serve file uploads
// app.use('/uploads', express.static('src/uploads'));
// app.use('/uploads/user', express.static('src/uploads/user'));
// app.use('/uploads/chat', express.static('src/uploads/chat'));

// API Routes
const apiRoutes = require('./src/routers/api');

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Website diễn đàn sinh viên TVU By Lê Khánh Đăng DA22TTA',
  });
});

// API
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5000;

// ✅ Tạo HTTP server riêng để Socket.IO có thể dùng
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

// ✅ Khởi tạo Socket.IO
const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');
const io = new Server(server, {
  cors: {
    origin: "*", // Nếu muốn bảo mật: đổi * thành domain frontend
  }
});

// ✅ Lưu io vào app để controller có thể emit (req.app.get('io'))
app.set('io', io);

// ✅ Map để lưu userId -> socketId
const onlineUsers = new Map();
const User = require('./src/models/User');
const Message = require('./src/models/Message');

// ✅ Socket.IO Middleware - Authenticate socket connection
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      console.log("⚠️ Socket connection without token:", socket.id);
      // Allow connection but mark as unauthenticated
      socket.userId = null;
      return next();
    }

    // Verify JWT token
    const secret = process.env.secretKey || process.env.JWT_SECRET;
    
    if (!secret) {
      console.error("❌ No JWT secret found in environment");
      socket.userId = null;
      return next();
    }
    
    const decoded = jwt.verify(token, secret);
    socket.userId = decoded.id;
    
    console.log(`✅ Socket authenticated: ${socket.id} -> User: ${socket.userId}`);
    next();
  } catch (error) {
    console.error("❌ Socket authentication error:", error.message);
    socket.userId = null;
    next(); // Allow connection but without userId
  }
});

// Import socket handler modules
const registerGlobalChatHandlers = require('./src/sockets/globalChat');
const registerPrivateChatHandlers = require('./src/sockets/privateChat');

// ✅ Lắng nghe kết nối từ client
io.on("connection", async (socket) => {
  console.log("📡 Client connected:", socket.id, "userId:", socket.userId);

  // Auto-register user as online if authenticated
  if (socket.userId) {
    try {
      // Join user vào room cá nhân để nhận thông báo
      socket.join(String(socket.userId));
      console.log(`✅ User ${socket.userId} joined personal notification room`);

      // Cập nhật trạng thái online trong DB
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date(),
        socketId: socket.id
      });

      // Lưu vào Map
      onlineUsers.set(socket.userId, socket.id);

      console.log(`✅ User ${socket.userId} is now online`);

      // Broadcast cho tất cả client biết có user online mới
      io.emit("user:status:changed", {
        userId: socket.userId,
        isOnline: true,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error updating user online status:", error);
    }
  }

  // Khi user đăng nhập, client sẽ emit 'user:online' với userId (backward compatibility)
  socket.on("user:online", async (userId) => {
    const targetUserId = userId || socket.userId;
    if (!targetUserId) return;

    try {
      // Join user vào room cá nhân để nhận thông báo
      socket.join(String(targetUserId));
      console.log(`✅ User ${targetUserId} joined personal notification room (via event)`);

      // Cập nhật trạng thái online trong DB
      await User.findByIdAndUpdate(targetUserId, {
        isOnline: true,
        lastSeen: new Date(),
        socketId: socket.id
      });

      // Lưu vào Map
      onlineUsers.set(targetUserId, socket.id);
      // Update socket.userId if it wasn't set
      socket.userId = targetUserId;

      console.log(`✅ User ${targetUserId} is now online (via event)`);

      // Broadcast cho tất cả client biết có user online mới
      io.emit("user:status:changed", {
        userId: targetUserId,
        isOnline: true,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error updating user online status:", error);
    }
  });

  // Register socket feature handlers
  registerGlobalChatHandlers(io, socket);
  registerPrivateChatHandlers(io, socket, onlineUsers);

  // Khi user disconnect
  socket.on("disconnect", async () => {
    console.log("❌ Client disconnected:", socket.id);

    if (!socket.userId) return;

    try {
      // Cập nhật trạng thái offline
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date(),
        socketId: null
      });

      // Xóa khỏi Map
      onlineUsers.delete(socket.userId);

      console.log(`❌ User ${socket.userId} is now offline`);

      // Broadcast cho tất cả client biết user offline
      io.emit("user:status:changed", {
        userId: socket.userId,
        isOnline: false,
        lastSeen: new Date()
      });
    } catch (error) {
      console.error("Error updating user offline status:", error);
    }
  });
});

// ✅ Export onlineUsers Map để controller có thể dùng
app.set('onlineUsers', onlineUsers);
