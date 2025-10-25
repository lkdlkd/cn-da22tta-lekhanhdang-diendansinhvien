
const Post = require('../models/Post');
const User = require('../models/User');
const Category = require('../models/Category');
const slugify = require('slugify');
// Lấy tất cả bài viết
exports.getAllPosts = async (req, res) => {
	try {
		const posts = await Post.find().populate('authorId categoryId');
		res.json(posts);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Lấy bài viết theo slug
exports.getPostBySlug = async (req, res) => {
	try {
		const post = await Post.findOne({ slug: req.params.slug }).populate('authorId categoryId');
		if (!post) return res.status(404).json({ error: 'Post not found' });
		res.json(post);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};


// Hàm tạo slug không trùng
async function generateUniqueSlug(title) {
	let slug = slugify(title, { lower: true, strict: true });
	let exists = await Post.findOne({ slug });

	let suffix = 1;
	while (exists) {
		let newSlug = `${slug}-${suffix}`;
		exists = await Post.findOne({ slug: newSlug });
		if (!exists) return newSlug;
		suffix++;
	}
	return slug;
}

exports.createPost = async (req, res) => {
	try {
		const { categoryId, title, content, tags, isDraft } = req.body;
		const authorId = req.user._id; // Lấy từ middleware xác thực

		// Kiểm tra danh mục tồn tại
		const category = await Category.findById(categoryId);
		if (!category) return res.status(400).json({ message: "Danh mục không tồn tại" });

		// Tạo slug tự động
		const slug = await generateUniqueSlug(title);

		// Tạo bài viết
		const post = new Post({
			authorId,
			categoryId,
			title,
			slug,
			content,
			tags,
			isDraft: isDraft || false
		});

		await post.save();

		// Cập nhật thống kê bài viết của user
		await User.findByIdAndUpdate(authorId, { $inc: { 'stats.postsCount': 1 } });

		return res.status(201).json({
			message: "Đăng bài thành công",
			post
		});

	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Lỗi server" });
	}
};

// Cập nhật bài viết
exports.updatePost = async (req, res) => {
	try {
		const post = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true });
		if (!post) return res.status(404).json({ error: 'Post not found' });
		res.json(post);
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
};

// Xóa bài viết
exports.deletePost = async (req, res) => {
	try {
		const post = await Post.findByIdAndDelete(req.params.id);
		if (!post) return res.status(404).json({ error: 'Post not found' });
		res.json({ message: 'Post deleted' });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Lấy bài viết nổi bật (pinned)
exports.getFeaturedPosts = async (req, res) => {
	try {
		const posts = await Post.find({ pinned: true }).sort({ updatedAt: -1 }).limit(5).populate('authorId categoryId');
		res.json(posts);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Lấy bài viết theo chuyên mục
exports.getPostsByCategory = async (req, res) => {
	try {
		const categoryId = req.params.categoryId;
		const posts = await Post.find({ categoryId }).populate('authorId categoryId');
		res.json(posts);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};