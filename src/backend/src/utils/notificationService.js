const Notification = require('../models/Notification');

/**
 * Tạo thông báo mới và emit socket event
 * @param {Object} params - Thông tin thông báo
 * @param {String} params.userId - ID người nhận thông báo
 * @param {String} params.type - Loại thông báo: 'comment', 'like', 'mention', 'system'
 * @param {Object} params.data - Dữ liệu thông báo
 * @param {Object} io - Socket.IO instance
 */
async function createNotification({ userId, type, data }, io) {
  try {
    // Tạo thông báo mới
    const notification = await Notification.create({
      userId,
      type,
      data,
      read: false
    });

    // Populate thông tin để gửi về client
    await notification.populate([
      { path: 'data.actorId', select: 'username displayName avatarUrl' },
      { path: 'data.postId', select: 'title slug' }
    ]);

    // Emit socket event để gửi thông báo realtime
    if (io) {
      io.emit('notification:new', {
        userId,
        notification
      });
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Đánh dấu thông báo đã đọc
 * @param {String} notificationId - ID thông báo
 */
async function markAsRead(notificationId) {
  try {
    await Notification.findByIdAndUpdate(notificationId, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Lấy danh sách thông báo của user
 * @param {String} userId - ID người dùng
 * @param {Number} limit - Số lượng thông báo
 */
async function getUserNotifications(userId, limit = 20) {
  try {
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return notifications;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
}

module.exports = {
  createNotification,
  markAsRead,
  getUserNotifications
};
