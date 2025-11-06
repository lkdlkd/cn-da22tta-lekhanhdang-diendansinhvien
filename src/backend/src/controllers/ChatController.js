const Message = require('../models/Message');
const User = require('../models/User');
const Attachment = require('../models/Attachment');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================
// GET MY CONVERSATIONS
// ============================================
exports.getMyConversations = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id || req.userId; // Fix: use req.user

    const conversations = await Message.find({
      participants: userId
    })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();

    // Populate peer info
    const result = [];
    for (const conv of conversations) {
      // Filter out null/undefined participants and find peer
      const validParticipants = conv.participants.filter(p => p);
      const peerId = validParticipants.find(p => String(p) !== String(userId));

      if (!peerId) continue; // Skip if no valid peer found

      const peer = await User.findById(peerId).select('_id username displayName avatar avatarUrl isOnline lastSeen').lean();

      if (peer) {
        const lastMsg = conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
        
        // Calculate unread count
        let unreadCount = 0;
        const readMarks = conv.readMarks || new Map();
        const userReadMark = readMarks instanceof Map 
          ? readMarks.get(String(userId))
          : readMarks[String(userId)];
        
        const lastReadAt = userReadMark?.lastReadAt;
        
        if (lastReadAt) {
          // Count messages after last read time
          unreadCount = conv.messages.filter(msg => 
            new Date(msg.createdAt) > new Date(lastReadAt) &&
            String(msg.senderId) !== String(userId) // Don't count own messages
          ).length;
        } else {
          // User has never read, count all messages from peer
          unreadCount = conv.messages.filter(msg => 
            String(msg.senderId) !== String(userId)
          ).length;
        }
        
        result.push({
          _id: conv._id,
          peer,
          lastMessage: lastMsg ? lastMsg.text || '[File]' : '',
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================
// GET PRIVATE CHAT HISTORY
// ============================================
exports.getPrivateChatHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id || req.userId; // Fix: use req.user
    const { peerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const participants = [String(userId), String(peerId)].sort(); // Ensure strings

    console.log('🔍 Loading chat history:', {
      userId: String(userId),
      peerId: String(peerId),
      participants,
      page,
      limit
    });

    let conversation = await Message.findOne({
      participants: { $all: participants }
    }).lean();

    console.log('📦 Conversation found:', {
      found: !!conversation,
      conversationId: conversation?._id,
      totalMessages: conversation?.messages?.length || 0
    });

    if (!conversation) {
      // Create new conversation
      conversation = await Message.create({
        participants,
        messages: [],
        lastMessageAt: new Date(),
      });
      console.log('✨ Created new conversation:', conversation._id);
    }

    // Paginate messages
    const allMessages = conversation.messages || [];
    const startIdx = Math.max(0, allMessages.length - (page * limit));
    const endIdx = allMessages.length - ((page - 1) * limit);
    const paginatedMessages = allMessages.slice(startIdx, endIdx);

    console.log('📄 Pagination:', {
      totalMessages: allMessages.length,
      startIdx,
      endIdx,
      paginatedCount: paginatedMessages.length
    });

    // Populate sender info and attachments
    const messagesWithSender = await Promise.all(
      paginatedMessages.map(async (msg) => {
        const sender = await User.findById(msg.senderId).select('_id username displayName avatar avatarUrl').lean();
        
        // Populate attachments nếu có
        let populatedAttachments = [];
        if (msg.attachments && msg.attachments.length > 0) {
          populatedAttachments = await Attachment.find({
            _id: { $in: msg.attachments }
          }).select('_id filename mime size storageUrl createdAt').lean();
        }
        
        return {
          ...msg,
          senderId: sender || { _id: msg.senderId, username: 'Unknown', displayName: 'Unknown User' },
          attachments: populatedAttachments,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        conversationId: conversation._id,
        messages: messagesWithSender,
        hasMore: startIdx > 0,
      },
    });
  } catch (error) {
    console.error('Error getting private chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================
// UPLOAD CHAT FILES
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../src/uploads/chat');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedMimes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      // Archives
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, ZIP, RAR, 7Z, JPG, PNG, GIF, WEBP, SVG'));
    }
  }
}).array('files', 5);

exports.uploadChatFiles = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed',
      });
    }

    try {
      const userId = req.user._id || req.user.id || req.userId; // Fix: use req.user
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
        });
      }

      const attachments = [];
      const backendUrl = `${req.protocol}://${req.get('host')}`;

      for (const file of files) {
        const attachment = await Attachment.create({
          ownerId: userId,
          filename: file.originalname,
          mime: file.mimetype,
          size: file.size,
          storageUrl: `${backendUrl}/uploads/chat/${file.filename}`,
        });
        attachments.push(attachment);
      }

      res.status(200).json({
        success: true,
        data: attachments,
        message: `${attachments.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Error saving attachments:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  });
};
