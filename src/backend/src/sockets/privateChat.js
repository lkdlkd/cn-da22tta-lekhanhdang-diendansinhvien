const Message = require('../models/Message');

// Register private chat socket handlers for a connected socket
// onlineUsers: Map<userId, socketId>
module.exports = function registerPrivateChatHandlers(io, socket, onlineUsers) {
  // Join private chat room
  socket.on('chat:private:join', (roomId) => {
    socket.join(roomId);
    console.log(`🚪 Socket ${socket.id} joined room ${roomId}`);
  });

  // Leave private chat room
  socket.on('chat:private:leave', (roomId) => {
    socket.leave(roomId);
    console.log(`🚪 Socket ${socket.id} left room ${roomId}`);
  });

  // Send private message (with optional ACK)
  socket.on('chat:private:message', async (data, callback) => {
    const { peerId, message } = data;

    try {
      // Use authenticated userId from socket
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

      // Find or create conversation
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

      // Add message
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

      // Emit to room (for users already in the room)
      io.to(roomId).emit('chat:private:new', {
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

  // Typing indicator
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

  // Mark as read
  socket.on('chat:private:read', async (data) => {
    const { peerId } = data;

    try {
      if (!socket.userId) return;

      const readerId = socket.userId;
      const participants = [readerId, peerId].sort();
      const roomId = participants.join('_');

      // Find conversation first
      const conversation = await Message.findOne({
        participants: { $all: participants },
      });

      if (conversation) {
        // Convert readMarks to Map if it's an array (migration)
        if (Array.isArray(conversation.readMarks)) {
          conversation.readMarks = new Map();
        } else if (!(conversation.readMarks instanceof Map)) {
          conversation.readMarks = new Map(
            Object.entries(conversation.readMarks || {})
          );
        }

        // Set read mark
        conversation.readMarks.set(readerId, {
          userId: readerId,
          lastReadAt: new Date(),
        });

        // Save using markModified for Map
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
