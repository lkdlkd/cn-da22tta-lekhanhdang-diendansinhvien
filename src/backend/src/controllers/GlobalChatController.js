const GlobalMessage = require('../models/GlobalMessage');
const User = require('../models/User');

// ============================================
// GET GLOBAL CHAT HISTORY
// ============================================
exports.getGlobalChatHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    console.log('🌍 Loading global chat history:', { page, limit });

    // Get total count
    const total = await GlobalMessage.countDocuments();

    // Get messages with pagination (newest first)
    const messages = await GlobalMessage.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', '_id username displayName avatar avatarUrl')
      .populate('attachments', '_id filename mime size storageUrl createdAt')
      .lean();

    // Reverse to show oldest first in the page
    messages.reverse();

    console.log('📦 Global messages loaded:', {
      total,
      page,
      returned: messages.length,
      hasMore: skip + messages.length < total
    });

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + messages.length < total
        }
      },
    });
  } catch (error) {
    console.error('Error getting global chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================
// GET ONLINE USERS COUNT
// ============================================
exports.getOnlineUsersCount = async (req, res) => {
  try {
    const count = await User.countDocuments({ isOnline: true });
    
    res.status(200).json({
      success: true,
      data: {
        count
      }
    });
  } catch (error) {
    console.error('Error getting online users count:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
