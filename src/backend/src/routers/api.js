const express = require('express');
const router = express.Router();
const userRoutes = require('../controllers/UserController');
const { authenticateUser ,authenticateAdmin } = require('../Middleware/authenticate');
const postRoutes = require('../controllers/PostController');
const categoryRoutes = require('../controllers/CategoryController');
router.post('/auth/login', userRoutes.login);
router.post('/auth/register', userRoutes.register);

router.get('/user', authenticateUser, userRoutes.getProfile);
router.put('/user', authenticateUser, userRoutes.updateProfile);


router.get('/admin/users', authenticateAdmin, userRoutes.getAllUsers);
router.delete('/admin/users/:id', authenticateAdmin, userRoutes.deleteUser);


router.post('/posts', authenticateUser, postRoutes.createPost);
router.get('/posts', postRoutes.getAllPosts);
router.get('/posts/featured', postRoutes.getFeaturedPosts);
router.get('/posts/:slug', postRoutes.getPostBySlug);

router.put('/posts/:id', authenticateUser, postRoutes.updatePost);
router.delete('/posts/:id', authenticateUser, postRoutes.deletePost);

router.get('/categories', categoryRoutes.getAllCategories);
router.get('/categories/:id/posts', categoryRoutes.getPostsByCategory);

router.post('/categories', authenticateAdmin, categoryRoutes.createCategory);
router.get('/categories/:id', categoryRoutes.getCategoryById);

router.put('/categories/:id', authenticateAdmin, categoryRoutes.updateCategory);
router.delete('/categories/:id', authenticateAdmin, categoryRoutes.deleteCategory);


module.exports = router;