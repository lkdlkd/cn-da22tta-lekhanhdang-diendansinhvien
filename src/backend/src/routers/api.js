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
const userRoutes = require('../controllers/UserController');
const { authenticateUser, authenticateAdmin, authenticateMod } = require('../Middleware/authenticate');
const postRoutes = require('../controllers/PostController');
const categoryRoutes = require('../controllers/CategoryController');
const CommentController = require('../controllers/CommentController');
const NotificationController = require('../controllers/NotificationController');
const ReportController = require('../controllers/ReportController');
const AttchmentController = require('../controllers/AttchmentController');

router.post('/auth/login', userRoutes.login); // Đăng nhập
router.post('/auth/register', userRoutes.register);// Đăng ký
router.get('/auth/verify-email', userRoutes.verifyEmailByToken);// Xác thực email bằng token từ link
router.post('/auth/verify-email', userRoutes.verifyEmail);// Xác thực email bằng mã OTP
router.post('/auth/resend-verification', userRoutes.resendVerificationEmail);// Gửi lại mã xác thực
router.post('/auth/forgot-password', userRoutes.forgotPassword);// Quên mật khẩu - gửi mã reset
router.post('/auth/verify-reset-code', userRoutes.verifyResetCode);// Xác thực mã reset password
router.post('/auth/reset-password', userRoutes.resetPassword);// Đặt lại mật khẩu

router.get('/user', authenticateUser, userRoutes.getProfile);// Lấy thông tin người dùng
router.put('/user', authenticateUser, uploadAvatar.single('avatar'), userRoutes.updateProfile);// Cập nhật thông tin người dùng
router.get('/users/online', userRoutes.getOnlineUsers);// Lấy danh sách user đang online
router.get('/users/active', userRoutes.getActiveUsers);// Lấy danh sách thành viên tích cực
router.get('/users/:username', userRoutes.getUserByUsername);// Lấy thông tin user theo username (public profile)
router.get('/users/:username/posts', userRoutes.getUserPosts);// Lấy bài viết của user theo username


// ===== ADMIN - USER MANAGEMENT =====
router.get('/admin/users/all', authenticateAdmin, userRoutes.getAllUsersAdmin);// Lấy danh sách người dùng admin với filters
router.get('/admin/users/stats', authenticateAdmin, userRoutes.getUsersStats);// Thống kê người dùng
router.delete('/admin/users/:id', authenticateAdmin, userRoutes.deleteUser);// Xóa người dùng admin 
router.put('/admin/users/:id/role', authenticateAdmin, userRoutes.updateUserRole);// Cập nhật vai trò người dùng
router.post('/admin/users/:id/ban', authenticateAdmin, userRoutes.banUser);// Cấm người dùng admin
router.post('/admin/users/:id/unban', authenticateAdmin, userRoutes.unbanUser);// Bỏ cấm người dùng
router.post('/admin/users/bulk-ban', authenticateAdmin, userRoutes.banMultipleUsers);// Cấm nhiều người dùng
router.post('/admin/users/bulk-unban', authenticateAdmin, userRoutes.unbanMultipleUsers);// Bỏ cấm nhiều người dùng
router.delete('/admin/users/bulk-delete', authenticateAdmin, userRoutes.deleteMultipleUsers);// Xóa nhiều người dùng

router.post('/posts', upload.array('attachments'), authenticateUser, postRoutes.createPost);// Tạo bài viết mới
router.get('/posts', postRoutes.getAllPosts);// Lấy tất cả bài viết
// router.get('/posts/featured', postRoutes.getFeaturedPosts);// Lấy bài viết nổi bật // chưa dùng đến
router.get('/posts/:slug', postRoutes.getPostBySlug);// Lấy bài viết theo slug
router.get('/posts/category/:slug', postRoutes.getPostsByCategory);// Lấy bài viết theo danh mục
router.put('/posts/:id', upload.array('attachments'), authenticateUser, postRoutes.updatePost);// Cập nhật bài viết
router.delete('/posts/:id', authenticateUser, postRoutes.deletePost);// Xóa bài viết
router.post('/posts/:id/like', authenticateUser, postRoutes.likePost);// Like bài viết
router.post('/posts/:id/unlike', authenticateUser, postRoutes.unlikePost);// Unlike bài viết
// router.get('/posts/:id/likes', postRoutes.getPostLikes);// Lấy danh sách người đã like bài viết

// ===== ADMIN - POST MANAGEMENT =====
router.get('/admin/posts/all', authenticateAdmin, postRoutes.getAllPostsAdmin);// Lấy tất cả bài viết với filters
router.get('/admin/posts/stats', authenticateAdmin, postRoutes.getPostsStats);// Thống kê bài viết
router.put('/admin/posts/:id/pin', authenticateAdmin, postRoutes.togglePinPost);// Ghim/bỏ ghim bài viết
router.put('/admin/posts/:id/lock', authenticateAdmin, postRoutes.toggleLockPost);// Khóa/mở khóa bài viết
router.put('/admin/posts/:id/soft-delete', authenticateAdmin, postRoutes.softDeletePostAdmin);// Xóa mềm bài viết
router.put('/admin/posts/:id/restore', authenticateAdmin, postRoutes.restorePostAdmin);// Khôi phục bài viết
router.delete('/admin/posts/bulk-delete', authenticateAdmin, postRoutes.deleteMultiplePosts);// Xóa nhiều bài viết
router.put('/admin/posts/bulk-soft-delete', authenticateAdmin, postRoutes.bulkSoftDeletePostsAdmin);// Xóa mềm nhiều bài viết
router.put('/admin/posts/bulk-restore', authenticateAdmin, postRoutes.bulkRestorePostsAdmin);// Khôi phục nhiều bài viết
router.put('/admin/posts/move', authenticateAdmin, postRoutes.movePosts);// Chuyển bài viết sang danh mục khác

// ===== MOD - POST MODERATION =====
router.get('/mod/posts/pending', authenticateMod, postRoutes.getPendingPosts);// Lấy bài viết chờ duyệt
router.put('/mod/posts/:id/approve', authenticateMod, postRoutes.approvePost);// Duyệt bài viết
router.put('/mod/posts/:id/reject', authenticateMod, postRoutes.rejectPost);// Từ chối bài viết
router.get('/mod/posts/stats', authenticateMod, postRoutes.getModerationStats);// Thống kê moderation

router.get('/categories', categoryRoutes.getAllCategories);

// ===== ADMIN - CATEGORY MANAGEMENT =====
router.post('/categories', authenticateAdmin, categoryRoutes.createCategory);
router.get('/categories/:id', categoryRoutes.getCategoryById);
router.put('/categories/:id', authenticateAdmin, categoryRoutes.updateCategory);
router.delete('/categories/:id', authenticateAdmin, categoryRoutes.deleteCategory);
router.get('/admin/categories/stats', authenticateAdmin, categoryRoutes.getAllCategoriesWithStats);// Lấy danh mục với thống kê (postCount từng danh mục)
router.get('/admin/categories/summary', authenticateAdmin, categoryRoutes.getCategoriesStats);// Thống kê tổng quan danh mục
router.delete('/admin/categories/bulk-delete', authenticateAdmin, categoryRoutes.deleteMultipleCategories);// Xóa nhiều danh mục
router.get('/admin/categories/search', authenticateAdmin, categoryRoutes.searchCategories);// Tìm kiếm danh mục

// API tạo bình luận cho bài viết
router.post('/comments',  upload.array('attachments'), authenticateUser, CommentController.createComment);
router.put('/comments/:id', upload.array('attachments'), authenticateUser, CommentController.updateComment);
router.delete('/comments/:id', authenticateUser, CommentController.deleteComment);
router.post('/comments/:id/like', authenticateUser, CommentController.likeComment);// Like bình luận
router.post('/comments/:id/unlike', authenticateUser, CommentController.unlikeComment);// Unlike bình luận
// router.get('/comments/:id/likes', CommentController.getCommentLikes);// Lấy danh sách người đã like bình luận

// ===== ADMIN - COMMENT MANAGEMENT =====
router.get('/admin/comments/all', authenticateAdmin, CommentController.getAllCommentsAdmin);// Lấy tất cả bình luận với filters
router.get('/admin/comments/stats', authenticateAdmin, CommentController.getCommentsStats);// Thống kê bình luận
router.delete('/admin/comments/:id', authenticateAdmin, CommentController.deleteCommentAdmin);// Xóa bình luận (cascade)
router.delete('/admin/comments/bulk-delete', authenticateAdmin, CommentController.deleteMultipleCommentsAdmin);// Xóa nhiều bình luận

// Notification routes
router.get('/notifications', authenticateUser, NotificationController.getMyNotifications);// Lấy danh sách thông báo
router.put('/notifications/:id/read', authenticateUser, NotificationController.markAsRead);// Đánh dấu thông báo đã đọc
router.put('/notifications/read-all', authenticateUser, NotificationController.markAllAsRead);// Đánh dấu tất cả thông báo đã đọc
router.delete('/notifications/:id', authenticateUser, NotificationController.deleteNotification);// Xóa thông báo
router.delete('/notifications', authenticateUser, NotificationController.deleteAllNotifications);// Xóa tất cả thông báo

// ===== ADMIN - NOTIFICATION MANAGEMENT =====
router.get('/admin/notifications/all', authenticateAdmin, NotificationController.getAllNotificationsAdmin);// Lấy tất cả thông báo với filters
router.get('/admin/notifications/stats', authenticateAdmin, NotificationController.getNotificationsStats);// Thống kê thông báo
router.delete('/admin/notifications/bulk-delete', authenticateAdmin, NotificationController.deleteMultipleNotifications);// Xóa nhiều thông báo
router.delete('/admin/notifications/user/:userId', authenticateAdmin, NotificationController.deleteUserNotifications);// Xóa thông báo của user
router.post('/admin/notifications/bulk-send', authenticateAdmin, NotificationController.sendBulkNotifications);// Gửi thông báo hàng loạt

// ===== REPORT ROUTES =====
router.post('/reports', authenticateUser, ReportController.createReport);// Tạo báo cáo
router.get('/reports', authenticateUser, ReportController.getMyReports);// Lấy báo cáo của mình
router.delete('/reports/:id', authenticateUser, ReportController.cancelReport);// Hủy báo cáo

// ===== ADMIN - REPORT MANAGEMENT =====
router.get('/admin/reports/all', authenticateAdmin, ReportController.getAllReportsAdmin);// Lấy tất cả báo cáo với filters
router.get('/admin/reports/stats', authenticateAdmin, ReportController.getReportsStatsAdmin);// Thống kê báo cáo
router.get('/admin/reports/:id', authenticateAdmin, ReportController.getReportDetailAdmin);// Lấy chi tiết báo cáo
router.get('/admin/reports/target/:targetType/:targetId', authenticateAdmin, ReportController.getReportsByTargetAdmin);// Lấy báo cáo theo target
router.put('/admin/reports/:id', authenticateAdmin, ReportController.updateReportStatusAdmin);// Cập nhật trạng thái báo cáo
router.delete('/admin/reports/:id', authenticateAdmin, ReportController.deleteReportAdmin);// Xóa báo cáo
router.delete('/admin/reports/bulk-delete', authenticateAdmin, ReportController.deleteMultipleReportsAdmin);// Xóa nhiều báo cáo
router.post('/admin/reports/bulk-handle', authenticateAdmin, ReportController.bulkHandleReportsAdmin);// Xử lý hàng loạt báo cáo

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