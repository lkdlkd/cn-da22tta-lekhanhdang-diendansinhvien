const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Tạo thư mục uploads/user nếu chưa tồn tại
const userUploadDir = path.join(__dirname, '../uploads/user');
if (!fs.existsSync(userUploadDir)) {
    fs.mkdirSync(userUploadDir, { recursive: true });
}

// Multer storage cho bài viết (uploads chung)
const postStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: function (req, file, cb) {
        // Đặt tên file theo tên gốc (sanitize) + hậu tố ngắn tránh trùng
        // Hậu tố ngắn: 8 ký tự (4 ký tự thời gian base36 + 4 ký tự ngẫu nhiên)
        const ext = path.extname(file.originalname).toLowerCase();
        const base = path.parse(file.originalname).name || 'file';
        // Loại bỏ dấu và ký tự đặc biệt để an toàn URL/hệ thống tệp
        const normalized = base
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
            .replace(/[^a-zA-Z0-9-_]+/g, '-') // chỉ giữ chữ/số/-/_
            .replace(/-{2,}/g, '-')
            .replace(/^[-_]+|[-_]+$/g, '')
            .slice(0, 100) || 'file';

        const ts = Date.now().toString(36).slice(-4);
        const rnd = Math.random().toString(36).slice(2, 6);
        const shortSuffix = ts + rnd;

        cb(null, `${normalized}-${shortSuffix}${ext}`);
    }
});

// Multer storage cho avatar user (uploads/user)
const userStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/user'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'avatar-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage: postStorage });
const uploadAvatar = multer({ storage: userStorage });
const router = express.Router();

// Import controllers
const userController = require('../controllers/user/userController');
const adminUserController = require('../controllers/admin/userController');
const userPostController = require('../controllers/user/postController');
const adminPostController = require('../controllers/admin/postController');

const { authenticateUser, authenticateAdmin, authenticateMod } = require('../Middleware/authenticate');
const userCategoryController = require('../controllers/user/categoryController');
const adminCategoryController = require('../controllers/admin/categoryController');
const userCommentController = require('../controllers/user/commentController');
const adminCommentController = require('../controllers/admin/commentController');
const userNotificationController = require('../controllers/user/notificationController');
const adminNotificationController = require('../controllers/admin/notificationController');
const userReportController = require('../controllers/user/reportController');
const adminReportController = require('../controllers/admin/reportController');
const AttchmentController = require('../controllers/AttchmentController');

// ===== USER ROUTES =====
router.post('/auth/login', userController.login); // Đăng nhập
router.post('/auth/register', userController.register);// Đăng ký
router.get('/auth/verify-email', userController.verifyEmailByToken);// Xác thực email bằng token từ link
router.post('/auth/verify-email', userController.verifyEmail);// Xác thực email bằng mã OTP
router.post('/auth/resend-verification', userController.resendVerificationEmail);// Gửi lại mã xác thực
router.post('/auth/forgot-password', userController.forgotPassword);// Quên mật khẩu - gửi mã reset
router.post('/auth/verify-reset-code', userController.verifyResetCode);// Xác thực mã reset password
router.post('/auth/reset-password', userController.resetPassword);// Đặt lại mật khẩu

router.get('/user', authenticateUser, userController.getProfile);// Lấy thông tin người dùng
router.put('/user', authenticateUser, uploadAvatar.single('avatar'), userController.updateProfile);// Cập nhật thông tin người dùng
router.post('/users/change-password', authenticateUser, userController.changePassword);// Đổi mật khẩu
router.get('/users/online', userController.getOnlineUsers);// Lấy danh sách user đang online
router.get('/users/active', userController.getActiveUsers);// Lấy danh sách thành viên tích cực
router.get('/users/:username', userController.getUserByUsername);// Lấy thông tin user theo username (public profile)
router.get('/users/:username/posts', userController.getUserPosts);// Lấy bài viết của user theo username

// ===== ADMIN ROUTES =====
router.get('/admin/users/all', authenticateAdmin, adminUserController.getAllUsersAdmin);// Lấy danh sách người dùng admin với filters
router.get('/admin/users/stats', authenticateAdmin, adminUserController.getUsersStats);// Thống kê người dùng
// Bulk operations PHẢI đặt trước các route có :id để tránh conflict
router.post('/admin/users/bulk-ban', authenticateAdmin, adminUserController.banMultipleUsers);// Cấm nhiều người dùng
router.post('/admin/users/bulk-unban', authenticateAdmin, adminUserController.unbanMultipleUsers);// Bỏ cấm nhiều người dùng
router.delete('/admin/users/bulk-delete', authenticateAdmin, adminUserController.deleteMultipleUsers);// Xóa nhiều người dùng
// Single user operations
router.delete('/admin/users/:id', authenticateAdmin, adminUserController.deleteUser);// Xóa người dùng admin 
router.put('/admin/users/:id/role', authenticateAdmin, adminUserController.updateUserRole);// Cập nhật vai trò người dùng
router.post('/admin/users/:id/ban', authenticateAdmin, adminUserController.banUser);// Cấm người dùng admin
router.post('/admin/users/:id/unban', authenticateAdmin, adminUserController.unbanUser);// Bỏ cấm người dùng

router.post('/posts', upload.array('attachments'), authenticateUser, userPostController.createPost);// Tạo bài viết mới
router.get('/posts', userPostController.getAllPosts);// Lấy tất cả bài viết
// router.get('/posts/featured', userPostController.getFeaturedPosts);// Lấy bài viết nổi bật // chưa dùng đến
router.get('/posts/:slug', userPostController.getPostBySlug);// Lấy bài viết theo slug
router.get('/posts/category/:slug', userPostController.getPostsByCategory);// Lấy bài viết theo danh mục
router.put('/posts/:id', upload.array('attachments'), authenticateUser, userPostController.updatePost);// Cập nhật bài viết
router.delete('/posts/:id', authenticateUser, userPostController.deletePost);// Xóa bài viết
router.post('/posts/:id/like', authenticateUser, userPostController.likePost);// Like bài viết
router.post('/posts/:id/unlike', authenticateUser, userPostController.unlikePost);// Unlike bài viết
// router.get('/posts/:id/likes', userPostController.getPostLikes);// Lấy danh sách người đã like bài viết

// ===== ADMIN - POST MANAGEMENT =====
router.get('/admin/posts/all', authenticateAdmin, adminPostController.getAllPostsAdmin);// Lấy tất cả bài viết với filters
router.get('/admin/posts/stats', authenticateAdmin, adminPostController.getPostsStats);// Thống kê bài viết
router.delete('/admin/posts/bulk-delete', authenticateAdmin, adminPostController.deleteMultiplePosts);// Xóa nhiều bài viết
router.put('/admin/posts/bulk-soft-delete', authenticateAdmin, adminPostController.bulkSoftDeletePostsAdmin);// Xóa mềm nhiều bài viết
router.put('/admin/posts/bulk-restore', authenticateAdmin, adminPostController.bulkRestorePostsAdmin);// Khôi phục nhiều bài viết
router.put('/admin/posts/move', authenticateAdmin, adminPostController.movePosts);// Chuyển bài viết sang danh mục khác
router.put('/admin/posts/:id/pin', authenticateAdmin, adminPostController.togglePinPost);// Ghim/bỏ ghim bài viết
router.put('/admin/posts/:id/lock', authenticateAdmin, adminPostController.toggleLockPost);// Khóa/mở khóa bài viết
router.put('/admin/posts/:id/soft-delete', authenticateAdmin, adminPostController.softDeletePostAdmin);// Xóa mềm bài viết
router.put('/admin/posts/:id/restore', adminPostController.restorePostAdmin);// Khôi phục bài viết


// ===== MOD - POST MODERATION =====
router.get('/mod/posts/pending', authenticateMod, adminPostController.getPendingPosts);// Lấy bài viết chờ duyệt
router.put('/mod/posts/:id/approve', authenticateMod, adminPostController.approvePost);// Duyệt bài viết
router.put('/mod/posts/:id/reject', authenticateMod, adminPostController.rejectPost);// Từ chối bài viết
router.get('/mod/posts/stats', authenticateMod, adminPostController.getModerationStats);// Thống kê moderation

router.get('/categories', userCategoryController.getAllCategories);

// ===== PUBLIC STATS (HOMEPAGE) =====
router.get('/stats/forum', userPostController.getForumStats);// Thống kê công khai cho homepage

// ===== ADMIN - CATEGORY MANAGEMENT =====
router.post('/categories', authenticateAdmin, adminCategoryController.createCategory);
router.get('/admin/categories/summary', authenticateAdmin, adminCategoryController.getCategoriesStats);// Thống kê tổng quan danh mục
router.delete('/admin/categories/bulk-delete', authenticateAdmin, adminCategoryController.deleteMultipleCategories);// Xóa nhiều danh mục
router.get('/admin/categories/search', authenticateAdmin, adminCategoryController.searchCategories);// Tìm kiếm danh mục
router.put('/categories/:id', authenticateAdmin, adminCategoryController.updateCategory);
router.delete('/categories/:id', authenticateAdmin, adminCategoryController.deleteCategory);


// API tạo bình luận cho bài viết
router.post('/comments', upload.array('attachments'), authenticateUser, userCommentController.createComment);
router.put('/comments/:id', upload.array('attachments'), authenticateUser, userCommentController.updateComment);
router.delete('/comments/:id', authenticateUser, userCommentController.deleteComment);
router.post('/comments/:id/like', authenticateUser, userCommentController.likeComment);// Like bình luận
router.post('/comments/:id/unlike', authenticateUser, userCommentController.unlikeComment);// Unlike bình luận
// router.get('/comments/:id/likes', userCommentController.getCommentLikes);// Lấy danh sách người đã like bình luận

// ===== ADMIN - COMMENT MANAGEMENT =====
router.get('/admin/comments/all', authenticateAdmin, adminCommentController.getAllCommentsAdmin);// Lấy tất cả bình luận với filters
router.get('/admin/comments/stats', authenticateAdmin, adminCommentController.getCommentsStats);// Thống kê bình luận
router.delete('/admin/comments/bulk-delete', authenticateAdmin, adminCommentController.deleteMultipleCommentsAdmin);// Xóa nhiều bình luận
router.delete('/admin/comments/:id', authenticateAdmin, adminCommentController.deleteCommentAdmin);// Xóa bình luận (cascade)

// Notification routes
router.get('/notifications', authenticateUser, userNotificationController.getMyNotifications);// Lấy danh sách thông báo
router.put('/notifications/:id/read', authenticateUser, userNotificationController.markAsRead);// Đánh dấu thông báo đã đọc
router.put('/notifications/read-all', authenticateUser, userNotificationController.markAllAsRead);// Đánh dấu tất cả thông báo đã đọc
router.delete('/notifications/:id', authenticateUser, userNotificationController.deleteNotification);// Xóa thông báo
router.delete('/notifications', authenticateUser, userNotificationController.deleteAllNotifications);// Xóa tất cả thông báo

// ===== ADMIN - NOTIFICATION MANAGEMENT =====
router.get('/admin/notifications/all', authenticateAdmin, adminNotificationController.getAllNotificationsAdmin);// Lấy tất cả thông báo với filters
router.get('/admin/notifications/stats', authenticateAdmin, adminNotificationController.getNotificationsStats);// Thống kê thông báo
router.delete('/admin/notifications/bulk-delete', authenticateAdmin, adminNotificationController.deleteMultipleNotifications);// Xóa nhiều thông báo
router.delete('/admin/notifications/user/:userId', authenticateAdmin, adminNotificationController.deleteUserNotifications);// Xóa thông báo của user
router.post('/admin/notifications/bulk-send', authenticateAdmin, adminNotificationController.sendBulkNotifications);// Gửi thông báo hàng loạt

// ===== REPORT ROUTES =====
router.post('/reports', authenticateUser, userReportController.createReport);// Tạo báo cáo
router.get('/reports', authenticateUser, userReportController.getMyReports);// Lấy báo cáo của mình
router.delete('/reports/:id', authenticateUser, userReportController.cancelReport);// Hủy báo cáo

// ===== ADMIN - REPORT MANAGEMENT =====
router.get('/admin/reports/all', authenticateAdmin, adminReportController.getAllReportsAdmin);// Lấy tất cả báo cáo với filters
router.get('/admin/reports/stats', authenticateAdmin, adminReportController.getReportsStatsAdmin);// Thống kê báo cáo
router.delete('/admin/reports/bulk-delete', authenticateAdmin, adminReportController.deleteMultipleReportsAdmin);// Xóa nhiều báo cáo
router.post('/admin/reports/bulk-handle', authenticateAdmin, adminReportController.bulkHandleReportsAdmin);// Xử lý hàng loạt báo cáo
router.get('/admin/reports/target/:targetType/:targetId', authenticateAdmin, adminReportController.getReportsByTargetAdmin);// Lấy báo cáo theo target
router.put('/admin/reports/:id', authenticateAdmin, adminReportController.updateReportStatusAdmin);// Cập nhật trạng thái báo cáo
router.delete('/admin/reports/:id', authenticateAdmin, adminReportController.deleteReportAdmin);// Xóa báo cáo


// ===== DOCUMENT (ATTACHMENT) ROUTES =====
// Yêu cầu đăng nhập để truy cập thư viện tài liệu
router.get('/documents/categories', authenticateUser, AttchmentController.getDocumentCategories);
router.get('/documents', authenticateUser, AttchmentController.getDocuments);
// router.get('/documents/by-category/:category', authenticateUser, AttchmentController.getDocumentsByCategory);
// router.get('/documents/:id', authenticateUser, AttchmentController.getDocumentDetail);

// ===== CHAT ROUTES =====
const ChatController = require('../controllers/ChatController');
router.get('/chat/conversations', authenticateUser, ChatController.getMyConversations);// Lấy danh sách conversations
router.get('/chat/private/:peerId', authenticateUser, ChatController.getPrivateChatHistory);// Lấy lịch sử chat với peer
router.post('/chat/upload', authenticateUser, ChatController.uploadChatFiles);// Upload files cho chat

// ===== GLOBAL CHAT ROUTES =====
const GlobalChatController = require('../controllers/GlobalChatController');
router.get('/chat/global/history', authenticateUser, GlobalChatController.getGlobalChatHistory);// Lấy lịch sử chat global
router.get('/chat/global/online-count', authenticateUser, GlobalChatController.getOnlineUsersCount);// Lấy số người online

module.exports = router;