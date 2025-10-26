const express = require('express');
const multer = require('multer');
const path = require('path');
const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path.join(__dirname, '../uploads'));
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, file.fieldname + '-' + uniqueSuffix + ext);
        }
    })
});
const router = express.Router();
const userRoutes = require('../controllers/UserController');
const { authenticateUser, authenticateAdmin } = require('../Middleware/authenticate');
const postRoutes = require('../controllers/PostController');
const categoryRoutes = require('../controllers/CategoryController');
const CommentController = require('../controllers/Comment');

router.post('/auth/login', userRoutes.login); // Đăng nhập
router.post('/auth/register', userRoutes.register);// Đăng ký

router.get('/user', authenticateUser, userRoutes.getProfile);// Lấy thông tin người dùng
router.put('/user', authenticateUser, userRoutes.updateProfile);// Cập nhật thông tin người dùng


router.get('/admin/users', authenticateAdmin, userRoutes.getAllUsers);// Lấy danh sách người dùng admin
router.delete('/admin/users/:id', authenticateAdmin, userRoutes.deleteUser);// Xóa người dùng admin 
router.post('/admin/users/:id/ban', authenticateAdmin, userRoutes.banUser);// Cấm người dùng admin
router.post('/admin/users/:id/unban', authenticateAdmin, userRoutes.unbanUser);//

router.post('/posts', upload.array('attachments'), authenticateUser, postRoutes.createPost);// Tạo bài viết mới
router.get('/posts', postRoutes.getAllPosts);// Lấy tất cả bài viết
router.get('/posts/featured', postRoutes.getFeaturedPosts);// Lấy bài viết nổi bật
router.get('/posts/:slug', postRoutes.getPostBySlug);// Lấy bài viết theo slug
router.get('/posts/category/:categoryId', postRoutes.getPostsByCategory);// Lấy bài viết theo danh mục
router.put('/posts/:id', authenticateUser, postRoutes.updatePost);// Cập nhật bài viết
router.delete('/posts/:id', authenticateUser, postRoutes.deletePost);// Xóa bài viết

router.get('/categories', categoryRoutes.getAllCategories);

router.post('/categories', authenticateAdmin, categoryRoutes.createCategory);
router.get('/categories/:id', categoryRoutes.getCategoryById);

router.put('/categories/:id', authenticateAdmin, categoryRoutes.updateCategory);
router.delete('/categories/:id', authenticateAdmin, categoryRoutes.deleteCategory);

// API tạo bình luận cho bài viết
router.post('/comments',  upload.array('attachments'), authenticateUser, CommentController.createComment);
module.exports = router;