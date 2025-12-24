const User = require('../../models/User');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const Like = require('../../models/Like');
const Attachment = require('../../models/Attachment');
const Notification = require('../../models/Notification');
const Message = require('../../models/Message');
const Report = require('../../models/Report');
const { deleteFromDrive } = require('../../utils/fileUpload');

// Helper: xóa file từ Cloudinary khi biết URL
async function removeCloudinaryFileByUrl(fileUrl) {
  try {
    if (!fileUrl || typeof fileUrl !== 'string') return;
    // Bỏ qua avatar external như gravatar
    if (fileUrl.includes('gravatar.com')) return;
    // Chỉ xử lý Cloudinary URLs
    if (!fileUrl.includes('cloudinary.com')) return;

    // Parse Cloudinary URL để lấy public_id
    // Format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{version}/{public_id}.{format}
    // hoặc: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{version}/{folder}/{public_id}.{format}
    const urlParts = fileUrl.split('/upload/');
    if (urlParts.length < 2) return;

    // Lấy phần sau /upload/
    const afterUpload = urlParts[1];
    // Bỏ version (vXXXXXXXXXX/)
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    // Bỏ extension để lấy public_id
    const publicId = withoutVersion.replace(/\.[^.]+$/, '');

    // Xác định resource_type từ URL
    let resourceType = 'image'; // default
    if (urlParts[0].includes('/image/')) resourceType = 'image';
    else if (urlParts[0].includes('/video/')) resourceType = 'video';
    else if (urlParts[0].includes('/raw/')) resourceType = 'raw';

    console.log(`🗑️ Đang xóa file từ Cloudinary: ${publicId} [${resourceType}]`);
    await deleteFromDrive(publicId, resourceType);
  } catch (e) {
    console.error('Lỗi xóa file từ Cloudinary:', e?.message || e);
  }
}

// [ADMIN] CẤM USER
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

// [ADMIN] GỠ CẤM USER
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

// [ADMIN] XÓA USER VÀ TẤT CẢ DỮ LIỆU LIÊN QUAN
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    // Kiểm tra tồn tại user trước khi xoá
    const user = await User.findById(userId).select('_id avatarUrl');
    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }

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

    // Lấy tất cả replies (comments con) đệ quy
    const allCommentIds = [...commentIds];
    let currentIds = [...commentIds];
    while (currentIds.length > 0) {
      const replies = await Comment.find({ parentId: { $in: currentIds } }).select('_id').lean();
      const replyIds = replies.map(r => r._id);
      if (replyIds.length === 0) break;
      allCommentIds.push(...replyIds);
      currentIds = replyIds;
    }

    // Lấy attachments của tất cả comments (bao gồm cả replies)
    const allComments = await Comment.find({ _id: { $in: allCommentIds } }).select('attachments').lean();
    const commentAttachmentIds = allComments.flatMap(c => (c.attachments || []));

    // Lấy attachments từ messages (chat) - CHỈ từ messages do user này gửi
    const messagesWithAttachments = await Message.find({ participants: userId }).select('messages').lean();
    const messageAttachmentIds = messagesWithAttachments.flatMap(m => 
      (m.messages || [])
        .filter(msg => String(msg.senderId) === String(userId)) // Chỉ lấy message do user gửi
        .flatMap(msg => (msg.attachments || []))
    );

    // Gom tất cả attachment IDs cần xoá (theo tham chiếu post/comment/message và theo chủ sở hữu)
    const ownerAttachments = await Attachment.find({ ownerId: userId }).select('_id storageUrl').lean();
    const allAttachmentIdSet = new Set([
      ...postAttachmentIds.map(id => String(id)),
      ...commentAttachmentIds.map(id => String(id)),
      ...messageAttachmentIds.map(id => String(id)),
      ...ownerAttachments.map(a => String(a._id))
    ]);
    const allAttachmentIds = Array.from(allAttachmentIdSet);
    const attachmentsToDelete = allAttachmentIds.length > 0
      ? await Attachment.find({ _id: { $in: allAttachmentIds } }).select('_id storageUrl').lean()
      : [];

    // Xoá file vật lý cho avatar từ Cloudinary
    if (user.avatarUrl) {
      await removeCloudinaryFileByUrl(user.avatarUrl);
    }

    // Xoá file vật lý cho tất cả attachments liên quan từ Cloudinary
    for (const att of attachmentsToDelete) {
      await removeCloudinaryFileByUrl(att.storageUrl);
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
      // Xoá likes: do user tạo hoặc nhắm tới post/comment của user (bao gồm cả replies)
      Like.deleteMany({
        $or: [
          { userId: userId },
          { targetType: 'post', targetId: { $in: postIds } },
          { targetType: 'comment', targetId: { $in: allCommentIds } }
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

// [ADMIN] CẬP NHẬT VAI TRÒ NGƯỜI DÙNG
exports.updateUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    // Validate role
    const validRoles = ['student', 'mod'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: "Vai trò không hợp lệ. Chỉ chấp nhận: student, mod"
      });
    }

    // Tìm user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy người dùng"
      });
    }

    // Không cho phép thay đổi vai trò của chính mình
    if (String(user._id) === String(req.user._id)) {
      return res.status(403).json({
        success: false,
        error: "Không thể thay đổi vai trò của chính mình"
      });
    }

    // Lưu vai trò cũ để ghi log
    const oldRole = user.role;

    // Cập nhật vai trò
    user.role = role;
    await user.save();

    console.log(`Admin ${req.user.username} changed role of user ${user.username} from ${oldRole} to ${role}`);

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật vai trò từ ${oldRole} thành ${role}`,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.displayName
      }
    });
  } catch (error) {
    console.error("Cập nhật vai trò người dùng lỗi:", error);
    return res.status(500).json({
      success: false,
      error: "Có lỗi xảy ra khi cập nhật vai trò người dùng"
    });
  }
};

// [ADMIN] LẤY TẤT CẢ USERS VỚI PHÂN TRANG VÀ TÌM KIẾM NÂNG CAO
exports.getAllUsersAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      keyword,
      role,
      isBanned,
      isOnline,
      emailVerified,
      sortBy = 'createdAt',
      order = 'desc',
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

    // Lọc theo trạng thái xác thực email
    if (emailVerified !== undefined) {
      query.emailVerified = emailVerified === 'true';
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

// [ADMIN] BAN NHIỀU USERS CÙNG LÚC
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

// [ADMIN] UNBAN NHIỀU USERS CÙNG LÚC
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

// [ADMIN] XÓA NHIỀU USERS CÙNG LÚC
exports.deleteMultipleUsers = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp danh sách user IDs'
      });
    }

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

    // Lấy tất cả replies (comments con) đệ quy
    const allCommentIds = [...commentIds];
    let currentIds = [...commentIds];
    while (currentIds.length > 0) {
      const replies = await Comment.find({ parentId: { $in: currentIds } }).select('_id').lean();
      const replyIds = replies.map(r => r._id);
      if (replyIds.length === 0) break;
      allCommentIds.push(...replyIds);
      currentIds = replyIds;
    }

    // Lấy attachments của tất cả comments (bao gồm cả replies)
    const allComments = await Comment.find({ _id: { $in: allCommentIds } }).select('attachments').lean();
    const commentAttachmentIds = allComments.flatMap(c => (c.attachments || []));

    // Lấy attachments từ messages (chat) - CHỈ từ messages do các users này gửi
    const userIdStrings = userIds.map(id => String(id));
    const messagesWithAttachments = await Message.find({ participants: { $in: userIds } }).select('messages').lean();
    const messageAttachmentIds = messagesWithAttachments.flatMap(m => 
      (m.messages || [])
        .filter(msg => userIdStrings.includes(String(msg.senderId))) // Chỉ lấy messages do các users gửi
        .flatMap(msg => (msg.attachments || []))
    );

    // Gom attachment IDs: từ posts, comments, messages và của chính các users
    const ownerAttachments = await Attachment.find({ ownerId: { $in: userIds } }).select('_id storageUrl').lean();
    const allAttachmentIdSet = new Set([
      ...postAttachmentIds.map(id => String(id)),
      ...commentAttachmentIds.map(id => String(id)),
      ...messageAttachmentIds.map(id => String(id)),
      ...ownerAttachments.map(a => String(a._id))
    ]);
    const allAttachmentIds = Array.from(allAttachmentIdSet);
    const attachmentsToDelete = allAttachmentIds.length > 0
      ? await Attachment.find({ _id: { $in: allAttachmentIds } }).select('_id storageUrl').lean()
      : [];

    // Xoá file avatar từ Cloudinary của các users (nếu có)
    const usersWithAvatar = await User.find({ _id: { $in: userIds } }).select('avatarUrl').lean();
    for (const u of usersWithAvatar) {
      if (u.avatarUrl) await removeCloudinaryFileByUrl(u.avatarUrl);
    }

    // Xoá file vật lý cho tất cả attachments liên quan từ Cloudinary
    for (const att of attachmentsToDelete) {
      await removeCloudinaryFileByUrl(att.storageUrl);
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
      // Likes do các user tạo hoặc nhắm tới post/comment của họ (bao gồm cả replies)
      Like.deleteMany({
        $or: [
          { userId: { $in: userIds } },
          { targetType: 'post', targetId: { $in: postIds } },
          { targetType: 'comment', targetId: { $in: allCommentIds } }
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

// [ADMIN] THỐNG KÊ USERS
exports.getUsersStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Query tất cả stats song song
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

module.exports = exports;
