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

// ✅ Lắng nghe kết nối từ client
io.on("connection", (socket) => {
  console.log("📡 Client connected:", socket.id);

  // Khi user đăng nhập, client sẽ emit 'user:online' với userId
  socket.on("user:online", async (userId) => {
    if (!userId) return;

    try {

      // Cập nhật trạng thái online trong DB
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
        socketId: socket.id
      });

      // Lưu vào Map
      onlineUsers.set(userId, socket.id);

      console.log(`✅ User ${userId} is now online`);

      // Broadcast cho tất cả client biết có user online mới
      io.emit("user:status:changed", {
        userId,
        isOnline: true,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error updating user online status:", error);
    }
  });

  // Khi user disconnect
  socket.on("disconnect", async () => {
    console.log("❌ Client disconnected:", socket.id);

    try {

      // Tìm user có socketId này
      const user = await User.findOne({ socketId: socket.id });

      if (user) {
        // Cập nhật trạng thái offline
        await User.findByIdAndUpdate(user._id, {
          isOnline: false,
          lastSeen: new Date(),
          socketId: null
        });

        // Xóa khỏi Map
        onlineUsers.delete(user._id.toString());

        console.log(`❌ User ${user._id} is now offline`);

        // Broadcast cho tất cả client biết user offline
        io.emit("user:status:changed", {
          userId: user._id,
          isOnline: false,
          lastSeen: new Date()
        });
      }
    } catch (error) {
      console.error("Error updating user offline status:", error);
    }
  });
});

// ✅ Export onlineUsers Map để controller có thể dùng
app.set('onlineUsers', onlineUsers);
