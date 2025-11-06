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
app.use('/uploads', express.static('src/uploads'));
app.use('/uploads/user', express.static('src/uploads/user'));
app.use('/uploads/chat', express.static('src/uploads/chat'));

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
    console.log("🔐 JWT secret available:", !!secret);
    
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

// ✅ Lắng nghe kết nối từ client
io.on("connection", async (socket) => {
  console.log("📡 Client connected:", socket.id, "userId:", socket.userId);

  // Auto-register user as online if authenticated
  if (socket.userId) {
    try {
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

  // ============================================
  // GLOBAL CHAT HANDLERS
  // ============================================
  
  // Join global chat room
  socket.on("chat:global:join", () => {
    socket.join("global_chat");
    console.log(`🌍 Socket ${socket.id} joined global chat`);
  });

  // Leave global chat room
  socket.on("chat:global:leave", () => {
    socket.leave("global_chat");
    console.log(`🌍 Socket ${socket.id} left global chat`);
  });

  // Send global message
  socket.on("chat:global:message", async (data) => {
    try {
      if (!socket.userId) {
        console.error("⚠️ Unauthenticated socket tried to send global message");
        return;
      }

      const { message } = data;
      const GlobalMessage = require('./src/models/GlobalMessage');
      const Attachment = require('./src/models/Attachment');
      
      // Save message to DB
      const newMessage = await GlobalMessage.create({
        senderId: socket.userId,
        text: message.text || "",
        attachments: message.attachments || [],
      });

      // Populate sender info and attachments
      const populatedMessage = await GlobalMessage.findById(newMessage._id)
        .populate('senderId', '_id username displayName avatar avatarUrl')
        .populate('attachments', '_id filename mime size storageUrl createdAt')
        .lean();

      // Broadcast to all users in global chat room
      io.to("global_chat").emit("chat:global:new", {
        message: populatedMessage,
      });

      console.log(`🌍 Global message from ${socket.userId}${message.attachments?.length ? ` with ${message.attachments.length} attachments` : ''}`);
    } catch (error) {
      console.error("Error sending global message:", error);
    }
  });

  // Global typing indicator
  socket.on("chat:global:typing", async (data) => {
    try {
      if (!socket.userId) return;

      const { isTyping } = data;
      
      // Get user info
      const user = await User.findById(socket.userId).select('username displayName').lean();
      
      // Broadcast to others in global chat (exclude sender)
      socket.to("global_chat").emit("chat:global:typing", {
        userId: socket.userId,
        username: user?.username,
        displayName: user?.displayName,
        isTyping,
      });
    } catch (error) {
      console.error("Error sending global typing indicator:", error);
    }
  });

  // ============================================
  // PRIVATE CHAT HANDLERS
  // ============================================
  
  // Join private chat room
  socket.on("chat:private:join", (roomId) => {
    socket.join(roomId);
    console.log(`🚪 Socket ${socket.id} joined room ${roomId}`);
  });

  // Leave private chat room
  socket.on("chat:private:leave", (roomId) => {
    socket.leave(roomId);
    console.log(`🚪 Socket ${socket.id} left room ${roomId}`);
  });

  // Send private message
  socket.on("chat:private:message", async (data) => {
    const { peerId, message } = data;

    try {
      // Use authenticated userId from socket
      if (!socket.userId) {
        console.error("⚠️ Unauthenticated socket tried to send message:", socket.id);
        return;
      }

      const senderId = socket.userId;
      const participants = [senderId, peerId].sort();
      const roomId = participants.join("_");

      // Find or create conversation
      let conversation = await Message.findOne({
        participants: { $all: participants }
      });

      if (!conversation) {
        conversation = await Message.create({
          participants,
          messages: [],
          lastMessageAt: new Date(),
        });
      }

      // Add message
      const newMessage = {
        senderId,
        text: message.text || "",
        attachments: message.attachments || [],
        createdAt: new Date(),
      };

      conversation.messages.push(newMessage);
      conversation.lastMessageAt = new Date();
      await conversation.save();
      
      console.log(`✅ Message saved to DB. Total messages in conversation: ${conversation.messages.length}`);

      // Emit to room (for users already in the room)
      io.to(roomId).emit("chat:private:new", {
        fromUserId: senderId,
        toUserId: peerId,
        message: newMessage,
      });

      // Also emit directly to peer's socket ONLY if they're not in the room
      // IMPORTANT: Never emit notify to sender, only to peer
      const peerSocketId = onlineUsers.get(peerId);
      if (peerSocketId) {
        const peerSocket = io.sockets.sockets.get(peerSocketId);
        const isInRoom = peerSocket && peerSocket.rooms.has(roomId);
        
        // Only emit notify if peer is NOT in the room (to update conversation list)
        if (!isInRoom) {
          io.to(peerSocketId).emit("chat:private:notify", {
            fromUserId: senderId,
            message: newMessage,
          });
          console.log(`📢 Sent notify to peer ${peerId} (not in room)`);
        } else {
          console.log(`✅ Peer ${peerId} is in room, skipping notify`);
        }
      }

      console.log(`💬 Private message from ${senderId} to ${peerId}`);
    } catch (error) {
      console.error("Error sending private message:", error);
    }
  });

  // Typing indicator
  socket.on("chat:private:typing", async (data) => {
    const { peerId, isTyping } = data;

    try {
      if (!socket.userId) return;

      const senderId = socket.userId;
      const participants = [senderId, peerId].sort();
      const roomId = participants.join("_");

      io.to(roomId).emit("chat:private:typing", {
        fromUserId: senderId,
        isTyping,
      });
    } catch (error) {
      console.error("Error sending typing indicator:", error);
    }
  });

  // Mark as read
  socket.on("chat:private:read", async (data) => {
    const { peerId } = data;

    try {
      if (!socket.userId) return;

      const readerId = socket.userId;
      const participants = [readerId, peerId].sort();
      const roomId = participants.join("_");

      // Find conversation first
      const conversation = await Message.findOne({
        participants: { $all: participants }
      });

      if (conversation) {
        // Convert readMarks to Map if it's an array (migration)
        if (Array.isArray(conversation.readMarks)) {
          conversation.readMarks = new Map();
        } else if (!(conversation.readMarks instanceof Map)) {
          conversation.readMarks = new Map(Object.entries(conversation.readMarks || {}));
        }

        // Set read mark
        conversation.readMarks.set(readerId, {
          userId: readerId,
          lastReadAt: new Date(),
        });

        // Save using markModified for Map
        conversation.markModified('readMarks');
        await conversation.save();

        io.to(roomId).emit("chat:private:read", {
          fromUserId: readerId,
          timestamp: new Date(),
        });

        console.log(`✅ User ${readerId} marked messages from ${peerId} as read`);
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  });

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
