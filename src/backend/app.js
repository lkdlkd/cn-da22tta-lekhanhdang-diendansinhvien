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

// ✅ Lắng nghe kết nối từ client
io.on("connection", (socket) => {
  console.log("📡 Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});
