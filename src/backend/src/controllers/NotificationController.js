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

// ==================== ADMIN FUNCTIONS ====================

// [ADMIN] Lấy tất cả notifications với phân trang và lọc
exports.getAllNotificationsAdmin = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      userId,
      type,
      read,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const query = {};
    
    // Lọc theo user
    if (userId) query.userId = userId;
    
    // Lọc theo type
    if (type) query.type = type;
    
    // Lọc theo read status
    if (read !== undefined) query.read = read === 'true';

    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;

    const notifications = await Notification.find(query)
      .populate('userId', 'username displayName avatarUrl email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ [sortBy]: sortOrder })
      .lean();

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// [ADMIN] Xóa nhiều notifications cùng lúc
exports.deleteMultipleNotifications = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Vui lòng cung cấp danh sách ID' 
      });
    }

    const result = await Notification.deleteMany({ _id: { $in: ids } });

    res.json({ 
      success: true, 
      message: `Đã xóa ${result.deletedCount} thông báo`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// [ADMIN] Xóa tất cả notifications của một user
exports.deleteUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await Notification.deleteMany({ userId });

    res.json({ 
      success: true, 
      message: `Đã xóa ${result.deletedCount} thông báo của user`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// [ADMIN] Gửi notification tới nhiều users
exports.sendBulkNotifications = async (req, res) => {
  try {
    const { userIds, type, message, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Vui lòng cung cấp danh sách user IDs' 
      });
    }

    if (!type || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Vui lòng cung cấp type và message' 
      });
    }

    const notifications = userIds.map(userId => ({
      userId,
      type,
      data: {
        ...data,
        message
      }
    }));

    const result = await Notification.insertMany(notifications);

    // Emit socket events
    if (req.app.get('io')) {
      result.forEach(notification => {
        req.app.get('io').to(String(notification.userId)).emit('notification:new', notification);
      });
    }

    res.json({ 
      success: true, 
      message: `Đã gửi ${result.length} thông báo`,
      count: result.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// [ADMIN] Thống kê notifications
exports.getNotificationsStats = async (req, res) => {
  try {
    const totalNotifications = await Notification.countDocuments();
    const unreadNotifications = await Notification.countDocuments({ read: false });
    const readNotifications = totalNotifications - unreadNotifications;

    // Notifications trong 7 ngày qua
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentNotifications = await Notification.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });

    // Notifications theo type
    const notificationsByType = await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Notifications theo tháng (12 tháng gần nhất)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const notificationsByMonth = await Notification.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Users có nhiều notifications nhất
    const topUsersByNotifications = await Notification.aggregate([
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          username: '$user.username',
          displayName: '$user.displayName',
          avatarUrl: '$user.avatarUrl',
          notificationsCount: '$count'
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalNotifications,
        unreadNotifications,
        readNotifications,
        recentNotifications,
        notificationsByType,
        notificationsByMonth,
        topUsersByNotifications
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
