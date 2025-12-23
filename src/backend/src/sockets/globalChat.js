const User = require('../models/User');
const GlobalMessage = require('../models/GlobalMessage');

// Đăng ký các xử lý socket cho chat toàn cục
module.exports = function registerGlobalChatHandlers(io, socket) {
  // Tham gia phòng chat toàn cục
  socket.on('chat:global:join', () => {
    socket.join('global_chat');
  });

  // Rời khỏi phòng chat toàn cục
  socket.on('chat:global:leave', () => {
    socket.leave('global_chat');
  });

  // Gửi tin nhắn toàn cục (có thể có ACK)
  socket.on('chat:global:message', async (data, callback) => {
    try {
      if (!socket.userId) {
        console.error('⚠️ Unauthenticated socket tried to send global message');
        if (typeof callback === 'function') {
          return callback({ success: false, error: 'unauthenticated' });
        }
        return;
      }

      // Kiểm tra user có bị ban không
      const user = await User.findById(socket.userId).select('isBanned').lean();
      if (user?.isBanned) {
        console.error('⚠️ Banned user tried to send global message:', socket.userId);
        if (typeof callback === 'function') {
          return callback({ success: false, error: 'Tài khoản của bạn đã bị khóa' });
        }
        return;
      }

      const { message } = data;

      // Lưu tin nhắn vào database
      const newMessage = await GlobalMessage.create({
        senderId: socket.userId,
        text: message.text || '',
        attachments: message.attachments || [],
      });

      // Lấy thông tin người gửi và tệp đính kèm
      const populatedMessage = await GlobalMessage.findById(newMessage._id)
        .populate('senderId', '_id username displayName avatar avatarUrl')
        .populate('attachments', '_id filename mime size storageUrl createdAt')
        .lean();

      // Phát tín hiệu đến tất cả người dùng trong phòng chat toàn cục
      io.to('global_chat').emit('chat:global:new', {
        message: populatedMessage,
      });

      // console.log(
      //   `🌍 Global message from ${socket.userId}${
      //     message.attachments?.length ? ` with ${message.attachments.length} attachments` : ''
      //   }`
      // );

      if (typeof callback === 'function') {
        callback({ success: true, messageId: populatedMessage?._id });
      }
    } catch (error) {
      console.error('Error sending global message:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'server-error' });
      }
    }
  });

  // Chỉ báo đang gõ toàn cục
  socket.on('chat:global:typing', async (data) => {
    try {
      if (!socket.userId) return;

      const { isTyping } = data;

      // Lấy thông tin người dùng và kiểm tra trạng thái ban
      const user = await User.findById(socket.userId)
        .select('username displayName isBanned')
        .lean();

      // Không cho phép user bị ban gửi typing indicator
      if (user?.isBanned) return;

      // Phát tín hiệu đến người dùng khác trong chat toàn cục (không bao gồm người gửi)
      socket.to('global_chat').emit('chat:global:typing', {
        userId: socket.userId,
        username: user?.username,
        displayName: user?.displayName,
        isTyping,
      });
    } catch (error) {
      console.error('Error sending global typing indicator:', error);
    }
  });
};
