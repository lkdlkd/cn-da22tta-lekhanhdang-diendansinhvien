const Notification = require('../models/Notification');

// Lấy danh sách thông báo của user hiện tại
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, skip = 0 } = req.query;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    // Đếm số thông báo chưa đọc
    const unreadCount = await Notification.countDocuments({ userId, read: false });

    res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Đánh dấu thông báo đã đọc
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({ _id: id, userId });
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();

    res.json({ success: true, notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Đánh dấu tất cả thông báo đã đọc
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Xóa thông báo
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({ _id: id, userId });
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Đã xóa thông báo' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Xóa tất cả thông báo
exports.deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.deleteMany({ userId });

    res.json({ success: true, message: 'Đã xóa tất cả thông báo' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
