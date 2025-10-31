const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const fs = require('fs');
const path = require('path');

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
        avatar: user.avatar,
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
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Lấy danh sách người dùng lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi lấy danh sách người dùng" });
  }
};

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
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }
    return res.status(200).json({ success: true, message: "Người dùng đã bị xóa" });
  } catch (error) {
    console.error("Xóa người dùng lỗi:", error);
    return res.status(500).json({ error: "Có lỗi xảy ra khi xóa người dùng" });
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
          localField: '_id',
          foreignField: 'authorId',
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

// API mới: Lấy chỉ user đang online
exports.getOnlineUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const onlineUsers = await User.find({
      isOnline: true,
      isBanned: { $ne: true }
    })
    .select('_id username displayName avatar avatarUrl isOnline lastSeen')
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