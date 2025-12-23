const Message = require('../models/Message');

// Đăng ký các xử lý socket cho chat riêng tư
// onlineUsers: Map<userId, socketId>
module.exports = function registerPrivateChatHandlers(io, socket, onlineUsers) {
  // Tham gia phòng chat riêng tư
  socket.on('chat:private:join', (roomId) => {
    socket.join(roomId);
    console.log(`🚪 Socket ${socket.id} joined room ${roomId}`);
  });

  // Rời khỏi phòng chat riêng tư
  socket.on('chat:private:leave', (roomId) => {
    socket.leave(roomId);
    console.log(`🚪 Socket ${socket.id} left room ${roomId}`);
  });

  // Gửi tin nhắn riêng tư (có thể có ACK)
  socket.on('chat:private:message', async (data, callback) => {
    const { peerId, message } = data;

    try {
      // Sử dụng userId đã xác thực từ socket
      if (!socket.userId) {
        console.error('⚠️ Unauthenticated socket tried to send message:', socket.id);
        if (typeof callback === 'function') {
          return callback({ success: false, error: 'unauthenticated' });
        }
        return;
      }

      const senderId = socket.userId;

      // Kiểm tra user có bị ban không
      const User = require('../models/User');
      const user = await User.findById(senderId).select('isBanned').lean();
      if (user?.isBanned) {
        console.error('⚠️ Banned user tried to send private message:', senderId);
        if (typeof callback === 'function') {
          return callback({ success: false, error: 'Tài khoản của bạn đã bị khóa' });
        }
        return;
      }
      const participants = [senderId, peerId].sort();
      const roomId = participants.join('_');

      // Tìm hoặc tạo cuộc trò chuyện
      let conversation = await Message.findOne({
        participants: { $all: participants },
      });

      if (!conversation) {
        conversation = await Message.create({
          participants,
          messages: [],
          lastMessageAt: new Date(),
        });
      }

      // Thêm tin nhắn
      const newMessage = {
        senderId,
        text: message.text || '',
        attachments: message.attachments || [],
        createdAt: new Date(),
      };

      conversation.messages.push(newMessage);
      conversation.lastMessageAt = new Date();
      await conversation.save();

      console.log(
        `✅ Message saved to DB. Total messages in conversation: ${conversation.messages.length}`
      );

      // Phát tín hiệu đến phòng (cho người dùng đã ở trong phòng)
      io.to(roomId).emit('chat:private:new', {
        fromUserId: senderId,
        toUserId: peerId,
        message: newMessage,
      });

      // Cũng phát tín hiệu trực tiếp đến socket của người nhận CHỈ KHI họ không ở trong phòng
      // QUAN TRỌNG: Không bao giờ gửi thông báo cho người gửi, chỉ gửi cho người nhận
      const peerSocketId = onlineUsers.get(peerId);
      if (peerSocketId) {
        const peerSocket = io.sockets.sockets.get(peerSocketId);
        const isInRoom = peerSocket && peerSocket.rooms.has(roomId);

        // Chỉ gửi thông báo nếu người nhận KHÔNG ở trong phòng (để cập nhật danh sách cuộc trò chuyện)
        if (!isInRoom) {
          io.to(peerSocketId).emit('chat:private:notify', {
            fromUserId: senderId,
            message: newMessage,
          });
          console.log(`📢 Sent notify to peer ${peerId} (not in room)`);
        } else {
          console.log(`✅ Peer ${peerId} is in room, skipping notify`);
        }
      }

      console.log(`💬 Private message from ${senderId} to ${peerId}`);

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (error) {
      console.error('Error sending private message:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'server-error' });
      }
    }
  });

  // Chỉ báo đang gõ
  socket.on('chat:private:typing', async (data) => {
    const { peerId, isTyping } = data;

    try {
      if (!socket.userId) return;

      const senderId = socket.userId;

      // Kiểm tra user có bị ban không
      const User = require('../models/User');
      const user = await User.findById(senderId).select('isBanned').lean();
      if (user?.isBanned) return;
      const participants = [senderId, peerId].sort();
      const roomId = participants.join('_');

      io.to(roomId).emit('chat:private:typing', {
        fromUserId: senderId,
        isTyping,
      });
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  });

  // Đánh dấu đã đọc
  socket.on('chat:private:read', async (data) => {
    const { peerId } = data;

    try {
      if (!socket.userId) return;

      const readerId = socket.userId;
      const participants = [readerId, peerId].sort();
      const roomId = participants.join('_');

      // Tìm cuộc trò chuyện trước
      const conversation = await Message.findOne({
        participants: { $all: participants },
      });

      if (conversation) {
        // Chuyển đổi readMarks thành Map nếu nó là mảng (di chuyển dữ liệu)
        if (Array.isArray(conversation.readMarks)) {
          conversation.readMarks = new Map();
        } else if (!(conversation.readMarks instanceof Map)) {
          conversation.readMarks = new Map(
            Object.entries(conversation.readMarks || {})
          );
        }

        // Đặt dấu đã đọc
        conversation.readMarks.set(readerId, {
          userId: readerId,
          lastReadAt: new Date(),
        });

        // Lưu bằng cách sử dụng markModified cho Map
        conversation.markModified('readMarks');
        await conversation.save();

        io.to(roomId).emit('chat:private:read', {
          fromUserId: readerId,
          timestamp: new Date(),
        });

        console.log(`✅ User ${readerId} marked messages from ${peerId} as read`);
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  });
};
