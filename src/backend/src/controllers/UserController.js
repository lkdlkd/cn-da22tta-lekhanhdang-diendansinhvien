const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const fs = require('fs');
const path = require('path');

// Helper: remove a local uploaded file when given a full URL containing /uploads/
function removeLocalUploadByUrl(fileUrl) {
  try {
    if (!fileUrl || typeof fileUrl !== 'string') return;
    // Skip external avatars like gravatar
    if (fileUrl.includes('gravatar.com')) return;
    const marker = '/uploads/';
    const idx = fileUrl.indexOf(marker);
    if (idx === -1) return;
    const relative = fileUrl.substring(idx + marker.length); // e.g., 'user/xxx.png' or 'posts/abc.jpg'
    const filePath = path.join(__dirname, '..', 'uploads', ...relative.split('/'));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Đã xóa file:', filePath);
    }
  } catch (e) {
    console.error('Lỗi xoá file upload:', e?.message || e);
  }
}
// ĐĂNG NHẬP
exports.login = async (req, res) => {
  try {
    let { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Vui lòng nhập tên đăng nhập/email/số điện thoại và mật khẩu" });
    }
    username = username.toLowerCase();
    // Tìm user theo username, email hoặc phone
    const user = await User.findOne({
      $or: [
        { username: username },
        { email: username },
        { phone: username }
      ]
    }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: "Sai thông tin đăng nhập hoặc mật khẩu" });
    }
    // Kiểm tra mật khẩu
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Sai thông tin đăng nhập hoặc mật khẩu" });
    }
    // Kiểm tra trạng thái cấm
    if (user.isBanned && (!user.bannedUntil || new Date() < user.bannedUntil)) {
      return res.status(403).json({ success: false, error: "Tài khoản đã bị cấm" });
    }
    // Tạo token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || process.env.secretKey || 'your-secret-key-here',
      { expiresIn: '7d' }
    );
    // Trả về thông tin user (không bao gồm password)
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        // avatar: user.avatar,
        faculty: user.faculty,
        class: user.class,
        bio: user.bio,
        stats: user.stats,
        settings: user.settings
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi đăng nhập" });
  }
};

// ĐĂNG KÝ
exports.register = async (req, res) => {
  try {
    let { username, email, password, displayName, phone, faculty, class: userClass, bio } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: "Vui lòng nhập đầy đủ tên đăng nhập, email và mật khẩu" });
    }
    username = username.toLowerCase();
    email = email.toLowerCase();
    // Kiểm tra username và password không được ngắn hơn 6 ký tự
    if (username.length < 6) {
      return res.status(400).json({ success: false, error: "Tên người dùng phải có ít nhất 6 ký tự" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Mật khẩu phải có ít nhất 6 ký tự" });
    }
    // Kiểm tra username chỉ chứa chữ và số
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ success: false, error: "Tên người dùng không được chứa ký tự đặc biệt" });
    }
    // Kiểm tra username phải chứa ít nhất một ký tự chữ
    const containsLetterRegex = /[a-zA-Z]/;
    if (!containsLetterRegex.test(username)) {
      return res.status(400).json({ success: false, error: "Tên người dùng phải chứa ít nhất một ký tự chữ" });
    }
    // Kiểm tra nếu người dùng đã tồn tại
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Tên người dùng hoặc email đã tồn tại" });
    }
    // Kiểm tra xem đã có admin chưa
    const isAdminExists = await User.findOne({ role: "admin" });

    const avatarUrl = 'https://www.gravatar.com/avatar/' + require('crypto').createHash('md5').update(email).digest('hex') + '?d=identicon';
    // Tạo người dùng mới
    const user = new User({
      username,
      email,
      password,
      displayName: displayName || username,
      phone,
      faculty,
      class: userClass,
      bio: bio || '',
      role: isAdminExists ? "student" : "admin",
      avatarUrl: avatarUrl
    });
    await user.save();
    return res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        phone: user.phone,
        faculty: user.faculty,
        class: user.class,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error("Đăng ký lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra. Vui lòng thử lại." });
  }
};
// THÔNG TIN CÁ NHÂN
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    let user = await User.findById(userId).select('-password');
    // const notifications = await Notification.find({ userId });
    // Lấy các cuộc trò chuyện có user tham gia, sắp xếp theo lastMessageAt
    // const messages = await Message.find({ participants: userId })
    // .sort({ lastMessageAt: -1 })
    // .populate('participants', 'username displayName avatar')
    // .populate('messages.senderId', 'username displayName avatar');
    // user = { ...user.toObject(), notifications, messages };

    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Lấy thông tin người dùng lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi lấy thông tin người dùng" });
  }
};
// CẬP NHẬT THÔNG TIN CÁ NHÂN
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    let updates = req.body;

    // Nếu có file avatar upload lên
    if (req.file) {
      // Lấy thông tin user cũ để xóa avatar cũ
      const oldUser = await User.findById(userId);

      // Xóa file avatar cũ nếu tồn tại và không phải avatar mặc định (gravatar)
      if (oldUser && oldUser.avatarUrl && !oldUser.avatarUrl.includes('gravatar.com')) {
        try {
          // Lấy tên file từ URL
          const oldFileName = oldUser.avatarUrl.split('/').pop();
          const oldFilePath = path.join(__dirname, '../../src/uploads/user', oldFileName);

          // Kiểm tra file tồn tại rồi mới xóa
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
            console.log('Đã xóa avatar cũ:', oldFileName);
          }
        } catch (error) {
          console.error('Lỗi khi xóa avatar cũ:', error);
          // Không throw error, vẫn tiếp tục update avatar mới
        }
      }

      // Đường dẫn backend để lưu URL
      const backendUrl = `${req.protocol}://${req.get('host')}`;
      // Lưu đường dẫn file avatar vào trường avatarUrl
      updates.avatarUrl = `${backendUrl}/uploads/user/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');

    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Cập nhật thông tin người dùng lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật thông tin người dùng" });
  }
};


exports.getActiveUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const onlineOnly = req.query.onlineOnly === 'true';

    // Match condition
    const matchCondition = {
      isBanned: { $ne: true },
      role: { $ne: 'admin' }
    };

    // Nếu chỉ lấy user online
    if (onlineOnly) {
      matchCondition.isOnline = true;
    }

    // Lấy danh sách user có nhiều bài viết nhất
    const activeUsers = await User.aggregate([
      {
        $match: matchCondition
      },
      {
        $lookup: {
          from: 'posts',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$authorId', '$$userId'] },
                isDeleted: { $ne: true },
                isDraft: { $ne: true }
              }
            }
          ],
          as: 'posts'
        }
      },
      {
        $addFields: {
          postsCount: { $size: '$posts' }
        }
      },
      {
        $match: {
          postsCount: { $gt: 0 } // Chỉ lấy user có ít nhất 1 bài viết
        }
      },
      {
        $sort: {
          isOnline: -1, // Online users trước
          postsCount: -1 // Sau đó sort theo số bài viết
        }
      },
      {
        $limit: limit
      },
      {
        $project: {
          _id: 1,
          username: 1,
          displayName: 1,
          avatar: 1,
          avatarUrl: 1,
          postsCount: 1,
          isOnline: 1,
          lastSeen: 1,
          createdAt: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      users: activeUsers
    });
  } catch (error) {
    console.error("Lấy danh sách thành viên tích cực lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi lấy danh sách thành viên tích cực" });
  }
};

// API riêng: Lấy chỉ user đang online (không cần có bài viết)
exports.getOnlineUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const onlineUsers = await User.find({
      isOnline: true,
      isBanned: { $ne: true },
      role: { $ne: 'admin' }
    })
      .select('_id username displayName avatar avatarUrl isOnline lastSeen createdAt')
      .limit(limit)
      .sort({ lastSeen: -1 });

    return res.status(200).json({
      success: true,
      count: onlineUsers.length,
      users: onlineUsers
    });
  } catch (error) {
    console.error("Lấy danh sách user online lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi lấy danh sách user online" });
  }
};

// API lấy thông tin user theo username (public profile)
exports.getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    // Tìm user theo username
    const user = await User.findOne({ username: username.toLowerCase() })
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy người dùng"
      });
    }

    // Lấy thống kê posts và comments của user
    const Post = require('../models/Post');
    const Comment = require('../models/Comment');

    const [postsCount, commentsCount] = await Promise.all([
      Post.countDocuments({ authorId: user._id, isDeleted: false }),
      Comment.countDocuments({ authorId: user._id, isDeleted: false })
    ]);

    // Trả về thông tin user kèm stats
    res.json({
      success: true,
      user: {
        ...user,
        stats: {
          ...user.stats,
          postsCount,
          commentsCount
        }
      }
    });
  } catch (err) {
    console.error('Error in getUserByUsername:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// API lấy bài viết của một user cụ thể
exports.getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    // Tìm user
    const user = await User.findOne({ username: username.toLowerCase() })
      .select('_id')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy người dùng"
      });
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;
    const limitNum = parseInt(limit);

    const Post = require('../models/Post');
    const Like = require('../models/Like');
    const Comment = require('../models/Comment');
    const Attachment = require('../models/Attachment');

    // Query posts và total count song song
    const [posts, total] = await Promise.all([
      Post.find({
        authorId: user._id,
        isDeleted: false,
        isDraft: false
      })
        .populate('authorId', 'username displayName avatar avatarUrl faculty class bio stats')
        .populate('categoryId', 'title slug description')
        .populate('attachments')
        .skip(skip)
        .limit(limitNum)
        .sort({ [sortBy]: sortOrder })
        .lean(),
      Post.countDocuments({
        authorId: user._id,
        isDeleted: false,
        isDraft: false
      })
    ]);

    if (posts.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total: 0,
          pages: 0
        }
      });
    }

    const postIds = posts.map(p => p._id);

    // Query song song tất cả data cần thiết (giống getAllPosts)
    const [commentsRaw, likes, commentIds] = await Promise.all([
      Comment.find({ postId: { $in: postIds } })
        .populate('authorId', 'username displayName avatarUrl faculty class')
        .populate('attachments')
        .lean(),
      Like.find({ targetType: 'post', targetId: { $in: postIds } })
        .populate('userId', 'username displayName avatarUrl faculty class')
        .sort({ createdAt: -1 })
        .lean(),
      Comment.find({ postId: { $in: postIds } }).distinct('_id')
    ]);

    // Lấy likes cho comments trong 1 query
    const likescmt = commentIds.length > 0
      ? await Like.find({ targetType: 'comment', targetId: { $in: commentIds } })
        .populate('userId', 'username displayName avatarUrl faculty class')
        .sort({ createdAt: -1 })
        .lean()
      : [];

    // Tạo maps để tra cứu nhanh O(1)
    const commentMap = new Map();
    const likesMap = new Map();
    const commentLikesMap = new Map();

    commentsRaw.forEach(c => commentMap.set(String(c._id), c));
    likes.forEach(l => {
      const key = String(l.targetId);
      if (!likesMap.has(key)) likesMap.set(key, []);
      likesMap.get(key).push(l);
    });
    likescmt.forEach(l => {
      const key = String(l.targetId);
      if (!commentLikesMap.has(key)) commentLikesMap.set(key, []);
      commentLikesMap.get(key).push(l);
    });

    // Xử lý comments với O(n) complexity
    const comments = commentsRaw.map(c => {
      const commentId = String(c._id);
      return {
        ...c,
        likes: commentLikesMap.get(commentId) || []
      };
    });

    // Tạo comment map theo postId
    const commentsByPost = new Map();
    comments.forEach(c => {
      const key = String(c.postId);
      if (!commentsByPost.has(key)) commentsByPost.set(key, []);
      commentsByPost.get(key).push(c);
    });

    // Gắn data vào posts
    const postsWithComments = posts.map(post => {
      const postId = String(post._id);
      return {
        ...post,
        likes: likesMap.get(postId) || [],
        comments: commentsByPost.get(postId) || []
      };
    });

    res.json({
      success: true,
      data: postsWithComments,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Error in getUserPosts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ==================== ADMIN FUNCTIONS ====================


exports.banUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }
    user.isBanned = true;
    await user.save();
    return res.status(200).json({ success: true, message: "Người dùng đã bị cấm" });
  } catch (error) {
    console.error("Cấm người dùng lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi cấm người dùng" });
  }
};
exports.unbanUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }
    user.isBanned = false;
    await user.save();
    return res.status(200).json({ success: true, message: "Người dùng đã được gỡ cấm" });
  } catch (error) {
    console.error("Gỡ cấm người dùng lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi gỡ cấm người dùng" });
  }
};
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    // Kiểm tra tồn tại user trước khi xoá
    const user = await User.findById(userId).select('_id avatarUrl');
    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }

    // Nạp model khi cần để tránh vòng lặp import
    const Post = require('../models/Post');
    const Comment = require('../models/Comment');
    const Like = require('../models/Like');
    const Attachment = require('../models/Attachment');
    const Report = require('../models/Report');

    // Lấy danh sách post và comment liên quan để xoá dữ liệu phụ thuộc (likes, reports...)
    const posts = await Post.find({ authorId: userId }).select('_id attachments').lean();
    const postIds = posts.map(p => p._id);
    const postAttachmentIds = posts.flatMap(p => (p.attachments || []));

    const comments = await Comment.find({
      $or: [
        { authorId: userId }, // comment do user viết
        { postId: { $in: postIds } } // comment nằm trong post của user
      ]
    }).select('_id attachments authorId').lean();
    const commentIds = comments.map(c => c._id);
    const commentAttachmentIds = comments.flatMap(c => (c.attachments || []));

    // Gom tất cả attachment IDs cần xoá (theo tham chiếu post/comment và theo chủ sở hữu)
    const ownerAttachments = await Attachment.find({ ownerId: userId }).select('_id storageUrl').lean();
    const allAttachmentIdSet = new Set([
      ...postAttachmentIds.map(id => String(id)),
      ...commentAttachmentIds.map(id => String(id)),
      ...ownerAttachments.map(a => String(a._id))
    ]);
    const allAttachmentIds = Array.from(allAttachmentIdSet);
    const attachmentsToDelete = allAttachmentIds.length > 0
      ? await Attachment.find({ _id: { $in: allAttachmentIds } }).select('_id storageUrl').lean()
      : [];

    // Xoá file vật lý cho avatar (nếu là file local)
    if (user.avatarUrl) {
      removeLocalUploadByUrl(user.avatarUrl);
    }

    // Xoá file vật lý cho tất cả attachments liên quan
    for (const att of attachmentsToDelete) {
      removeLocalUploadByUrl(att.storageUrl);
    }

    // Thực thi các thao tác xoá song song
    const [
      delPosts,
      delComments,
      delLikes,
      delAttachments,
      delNotifications,
      delMessages,
      delReports,
      delUser
    ] = await Promise.all([
      // Xoá bài viết của user
      Post.deleteMany({ authorId: userId }),
      // Xoá comment do user viết hoặc trên bài viết của user
      Comment.deleteMany({
        $or: [
          { authorId: userId },
          { postId: { $in: postIds } }
        ]
      }),
      // Xoá likes: do user tạo hoặc nhắm tới post/comment của user
      Like.deleteMany({
        $or: [
          { userId: userId },
          { targetType: 'post', targetId: { $in: postIds } },
          { targetType: 'comment', targetId: { $in: commentIds } }
        ]
      }),
      // Xoá tất cả attachment document đã gom (post, comment, owner)
      allAttachmentIds.length > 0 ? Attachment.deleteMany({ _id: { $in: allAttachmentIds } }) : { deletedCount: 0 },
      // Xoá thông báo gửi tới user
      Notification.deleteMany({ userId: userId }),
      // Xoá các đoạn hội thoại mà user tham gia
      Message.deleteMany({ participants: userId }),
      // Xoá báo cáo do user gửi hoặc nhắm tới user/post/comment của user
      Report.deleteMany({
        $or: [
          { reporterId: userId },
          { targetType: 'user', targetId: userId },
          { targetType: 'post', targetId: { $in: postIds } },
          { targetType: 'comment', targetId: { $in: commentIds } }
        ]
      }),
      // Cuối cùng xoá user
      User.findByIdAndDelete(userId)
    ]);

    return res.status(200).json({
      success: true,
      message: "Đã xoá người dùng và toàn bộ dữ liệu liên quan",
      deleted: {
        posts: delPosts?.deletedCount || 0,
        comments: delComments?.deletedCount || 0,
        likes: delLikes?.deletedCount || 0,
        attachments: delAttachments?.deletedCount || 0,
        notifications: delNotifications?.deletedCount || 0,
        messages: delMessages?.deletedCount || 0,
        reports: delReports?.deletedCount || 0,
        users: delUser ? 1 : 0
      }
    });
  } catch (error) {
    console.error("Xóa người dùng lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi xóa người dùng" });
  }
};
// [ADMIN] Lấy tất cả users với phân trang và tìm kiếm nâng cao
exports.getAllUsersAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      keyword,
      role,
      isBanned,
      isOnline,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const query = {};

    // Tìm kiếm theo keyword
    if (keyword) {
      query.$or = [
        { username: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } },
        { displayName: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword, $options: 'i' } }
      ];
    }

    // Lọc theo role
    if (role) query.role = role;

    // Lọc theo trạng thái ban
    if (isBanned !== undefined) {
      query.isBanned = isBanned === 'true';
    }

    // Lọc theo online status
    if (isOnline !== undefined) {
      query.isOnline = isOnline === 'true';
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;
    const limitNum = parseInt(limit);

    // Query song song users và total
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .skip(skip)
        .limit(limitNum)
        .sort({ [sortBy]: sortOrder })
        .lean(),
      User.countDocuments(query)
    ]);

    // Lấy stats cho tất cả users song song
    const Post = require('../models/Post');
    const Comment = require('../models/Comment');

    const userIds = users.map(u => u._id);
    const [postsStats, commentsStats] = await Promise.all([
      Post.aggregate([
        { $match: { authorId: { $in: userIds } } },
        { $group: { _id: '$authorId', count: { $sum: 1 } } }
      ]),
      Comment.aggregate([
        { $match: { authorId: { $in: userIds } } },
        { $group: { _id: '$authorId', count: { $sum: 1 } } }
      ])
    ]);

    // Tạo maps cho O(1) lookup
    const postsMap = new Map(postsStats.map(s => [String(s._id), s.count]));
    const commentsMap = new Map(commentsStats.map(s => [String(s._id), s.count]));

    // Gắn stats vào users
    const usersWithStats = users.map(user => ({
      ...user,
      postsCount: postsMap.get(String(user._id)) || 0,
      commentsCount: commentsMap.get(String(user._id)) || 0
    }));

    res.json({
      success: true,
      data: usersWithStats,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Error in getAllUsersAdmin:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};


// [ADMIN] Ban nhiều users cùng lúc
exports.banMultipleUsers = async (req, res) => {
  try {
    const { userIds, duration, reason } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp danh sách user IDs'
      });
    }

    const bannedUntil = duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null;

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      {
        isBanned: true,
        bannedUntil,
        bannedReason: reason || 'Vi phạm quy định'
      }
    );

    res.json({
      success: true,
      message: `Đã ban ${result.modifiedCount} users`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// [ADMIN] Unban nhiều users cùng lúc
exports.unbanMultipleUsers = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp danh sách user IDs'
      });
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      {
        isBanned: false,
        bannedUntil: null,
        bannedReason: null
      }
    );

    res.json({
      success: true,
      message: `Đã unban ${result.modifiedCount} users`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// [ADMIN] Xóa nhiều users cùng lúc
exports.deleteMultipleUsers = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp danh sách user IDs'
      });
    }
    // Xóa tất cả related data song song (bao gồm phụ thuộc vào post/comment của các user)
    const Post = require('../models/Post');
    const Comment = require('../models/Comment');
    const Like = require('../models/Like');
    const Attachment = require('../models/Attachment');
    const Report = require('../models/Report');

    // Lấy danh sách postId của các user
    const posts = await Post.find({ authorId: { $in: userIds } }).select('_id attachments').lean();
    const postIds = posts.map(p => p._id);
    const postAttachmentIds = posts.flatMap(p => (p.attachments || []));

    // Lấy danh sách commentId: do user viết hoặc trên post của các user
    const comments = await Comment.find({
      $or: [
        { authorId: { $in: userIds } },
        { postId: { $in: postIds } }
      ]
    }).select('_id attachments authorId').lean();
    const commentIds = comments.map(c => c._id);
    const commentAttachmentIds = comments.flatMap(c => (c.attachments || []));

    // Gom attachment IDs: từ posts, comments và của chính các users
    const ownerAttachments = await Attachment.find({ ownerId: { $in: userIds } }).select('_id storageUrl').lean();
    const allAttachmentIdSet = new Set([
      ...postAttachmentIds.map(id => String(id)),
      ...commentAttachmentIds.map(id => String(id)),
      ...ownerAttachments.map(a => String(a._id))
    ]);
    const allAttachmentIds = Array.from(allAttachmentIdSet);
    const attachmentsToDelete = allAttachmentIds.length > 0
      ? await Attachment.find({ _id: { $in: allAttachmentIds } }).select('_id storageUrl').lean()
      : [];

    // Xoá file avatar local của các users (nếu có)
    const usersWithAvatar = await User.find({ _id: { $in: userIds } }).select('avatarUrl').lean();
    for (const u of usersWithAvatar) {
      if (u.avatarUrl) removeLocalUploadByUrl(u.avatarUrl);
    }

    // Xoá file vật lý cho tất cả attachments liên quan
    for (const att of attachmentsToDelete) {
      removeLocalUploadByUrl(att.storageUrl);
    }

    const [
      delPosts,
      delComments,
      delLikes,
      delAttachments,
      delNotifications,
      delMessages,
      delReports,
      delUsers
    ] = await Promise.all([
      // Bài viết của các user
      Post.deleteMany({ authorId: { $in: userIds } }),
      // Comment do các user viết hoặc trên bài viết của họ
      Comment.deleteMany({
        $or: [
          { authorId: { $in: userIds } },
          { postId: { $in: postIds } }
        ]
      }),
      // Likes do các user tạo hoặc nhắm tới post/comment của họ
      Like.deleteMany({
        $or: [
          { userId: { $in: userIds } },
          { targetType: 'post', targetId: { $in: postIds } },
          { targetType: 'comment', targetId: { $in: commentIds } }
        ]
      }),
      // Tệp đính kèm đã gom từ post/comment/owner
      allAttachmentIds.length > 0 ? Attachment.deleteMany({ _id: { $in: allAttachmentIds } }) : { deletedCount: 0 },
      // Thông báo gửi tới các user
      Notification.deleteMany({ userId: { $in: userIds } }),
      // Hội thoại có sự tham gia của bất kỳ user nào trong danh sách
      Message.deleteMany({ participants: { $in: userIds } }),
      // Báo cáo do các user gửi hoặc nhắm tới user/post/comment của họ
      Report.deleteMany({
        $or: [
          { reporterId: { $in: userIds } },
          { targetType: 'user', targetId: { $in: userIds } },
          { targetType: 'post', targetId: { $in: postIds } },
          { targetType: 'comment', targetId: { $in: commentIds } }
        ]
      }),
      // Cuối cùng, xoá user
      User.deleteMany({ _id: { $in: userIds } })
    ]);

    res.json({
      success: true,
      message: `Đã xoá người dùng và dữ liệu liên quan`,
      deleted: {
        users: delUsers?.deletedCount || 0,
        posts: delPosts?.deletedCount || 0,
        comments: delComments?.deletedCount || 0,
        likes: delLikes?.deletedCount || 0,
        attachments: delAttachments?.deletedCount || 0,
        notifications: delNotifications?.deletedCount || 0,
        messages: delMessages?.deletedCount || 0,
        reports: delReports?.deletedCount || 0
      }
    });
  } catch (err) {
    console.error('Error in deleteMultipleUsers:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// [ADMIN] Thống kê users
exports.getUsersStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Query tất cả stats song song
    const Post = require('../models/Post');

    const [
      totalUsers,
      bannedUsers,
      onlineUsers,
      newUsers,
      usersByRole,
      usersByMonth,
      topUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ isOnline: true }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]),
      User.aggregate([
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
      ]),
      Post.aggregate([
        {
          $group: {
            _id: '$authorId',
            postsCount: { $sum: 1 }
          }
        },
        { $sort: { postsCount: -1 } },
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
            postsCount: 1
          }
        }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        bannedUsers,
        onlineUsers,
        newUsers,
        usersByRole,
        usersByMonth,
        topUsers
      }
    });
  } catch (err) {
    console.error('Error in getUsersStats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};