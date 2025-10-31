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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
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
const { authenticateUser, authenticateAdmin } = require('../Middleware/authenticate');
const postRoutes = require('../controllers/PostController');
const categoryRoutes = require('../controllers/CategoryController');
const CommentController = require('../controllers/CommentController');
const NotificationController = require('../controllers/NotificationController');

router.post('/auth/login', userRoutes.login); // Đăng nhập
router.post('/auth/register', userRoutes.register);// Đăng ký

router.get('/user', authenticateUser, userRoutes.getProfile);// Lấy thông tin người dùng
router.put('/user', authenticateUser, uploadAvatar.single('avatar'), userRoutes.updateProfile);// Cập nhật thông tin người dùng
router.get('/users/active', userRoutes.getActiveUsers);// Lấy danh sách thành viên tích cực
router.get('/users/online', userRoutes.getOnlineUsers);// Lấy danh sách user đang online


router.get('/admin/users', authenticateAdmin, userRoutes.getAllUsers);// Lấy danh sách người dùng admin
router.delete('/admin/users/:id', authenticateAdmin, userRoutes.deleteUser);// Xóa người dùng admin 
router.post('/admin/users/:id/ban', authenticateAdmin, userRoutes.banUser);// Cấm người dùng admin
router.post('/admin/users/:id/unban', authenticateAdmin, userRoutes.unbanUser);//

router.post('/posts', upload.array('attachments'), authenticateUser, postRoutes.createPost);// Tạo bài viết mới
router.get('/posts', postRoutes.getAllPosts);// Lấy tất cả bài viết
router.get('/posts/featured', postRoutes.getFeaturedPosts);// Lấy bài viết nổi bật
router.get('/posts/:slug', postRoutes.getPostBySlug);// Lấy bài viết theo slug
router.get('/posts/category/:slug', postRoutes.getPostsByCategory);// Lấy bài viết theo danh mục
router.put('/posts/:id', upload.array('attachments'), authenticateUser, postRoutes.updatePost);// Cập nhật bài viết
router.delete('/posts/:id', authenticateUser, postRoutes.deletePost);// Xóa bài viết
router.post('/posts/:id/like', authenticateUser, postRoutes.likePost);// Like bài viết
router.post('/posts/:id/unlike', authenticateUser, postRoutes.unlikePost);// Unlike bài viết
router.get('/posts/:id/likes', postRoutes.getPostLikes);// Lấy danh sách người đã like bài viết

router.get('/categories', categoryRoutes.getAllCategories);

router.post('/categories', authenticateAdmin, categoryRoutes.createCategory);
router.get('/categories/:id', categoryRoutes.getCategoryById);

router.put('/categories/:id', authenticateAdmin, categoryRoutes.updateCategory);
router.delete('/categories/:id', authenticateAdmin, categoryRoutes.deleteCategory);

// API tạo bình luận cho bài viết
router.post('/comments',  upload.array('attachments'), authenticateUser, CommentController.createComment);
router.put('/comments/:id', upload.array('attachments'), authenticateUser, CommentController.updateComment);
router.delete('/comments/:id', authenticateUser, CommentController.deleteComment);
router.post('/comments/:id/like', authenticateUser, CommentController.likeComment);// Like bình luận
router.post('/comments/:id/unlike', authenticateUser, CommentController.unlikeComment);// Unlike bình luận
router.get('/comments/:id/likes', CommentController.getCommentLikes);// Lấy danh sách người đã like bình luận

// Notification routes
router.get('/notifications', authenticateUser, NotificationController.getMyNotifications);// Lấy danh sách thông báo
router.put('/notifications/:id/read', authenticateUser, NotificationController.markAsRead);// Đánh dấu thông báo đã đọc
router.put('/notifications/read-all', authenticateUser, NotificationController.markAllAsRead);// Đánh dấu tất cả thông báo đã đọc
router.delete('/notifications/:id', authenticateUser, NotificationController.deleteNotification);// Xóa thông báo
router.delete('/notifications', authenticateUser, NotificationController.deleteAllNotifications);// Xóa tất cả thông báo

module.exports = router;