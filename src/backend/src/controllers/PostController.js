const Post = require('../models/Post');
const User = require('../models/User');
const Category = require('../models/Category');
const Attachment = require('../models/Attachment');
const slugify = require('slugify');
const comment = require('../models/Comment');
// HÀM TẠO SLUG DUY NHẤT
async function generateUniqueSlug(title) {
	let slugBase = slugify(title, { lower: true, strict: true });
	let slug = slugBase;
	let counter = 1;

	while (await Post.findOne({ slug })) {
		slug = `${slugBase}-${counter++}`;
	}
	return slug;
}

// Lấy tất cả bài viết
exports.getAllPosts = async (req, res) => {
	try {
		let posts = await Post.find()
			.populate('authorId categoryId')
			.populate('attachments')
			.sort({ createdAt: -1 })
			.lean();

		// Lấy tất cả comments, populate authorId và attachments
		const commentsRaw = await comment.find({ postId: { $in: posts.map(p => p._id) } })
			.populate('authorId attachments')
			.lean();

		// Tạo map commentId -> comment để tra cứu parent nhanh
		const commentMap = {};
		commentsRaw.forEach(c => {
			commentMap[String(c._id)] = c;
		});

		// Thêm displayName cho author và parentAuthor
		const comments = commentsRaw.map(c => {
			let authorName = c.authorId?.displayName || c.authorId?.username || 'Ẩn danh';
			let parentAuthorName = null;
			if (c.parentId && commentMap[String(c.parentId)]) {
				const parent = commentMap[String(c.parentId)];
				parentAuthorName = parent.authorId?.displayName || parent.authorId?.username || 'Ẩn danh';
			}
			return {
				...c,
				authorName,
				parentAuthorName
			};
		});

		// Gắn comment vào từng post
		const postsWithComments = posts.map(post => ({
			...post,
			comments: comments.filter(c => String(c.postId) === String(post._id))
		}));

		res.json(postsWithComments);
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// Lấy bài viết theo slug
exports.getPostBySlug = async (req, res) => {
	try {
		const post = await Post.findOne({ slug: req.params.slug })
			.populate('authorId categoryId')
			.populate('attachments'); // ✅ trả về cả files

		if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
		res.json(post);
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// Tạo bài viết
exports.createPost = async (req, res) => {
	try {
		const { categoryId, title, content, tags } = req.body;
		const authorId = req.user._id;
		// Tạo slug duy nhất
		const slug = await generateUniqueSlug(title);

		// Lưu file upload → Attachment
		let attachmentIds = [];
		let att = [];
		if (req.files?.length > 0) {
			const backendUrl = `${req.protocol}://${req.get('host')}`;
			attachmentIds = await Promise.all(req.files.map(async (file) => {
				const attachment = new Attachment({
					ownerId: authorId,
					filename: file.filename, // dùng tên file thực tế đã lưu
					mime: file.mimetype,
					size: file.size,
					storageUrl: `${backendUrl}/uploads/${file.filename}`
				});
				await attachment.save();
				att.push(attachment);
				
				return attachment._id;
			}));
		}

		// Tạo Post
		const post = await Post.create({
			authorId,
			categoryId,
			title,
			slug,
			content,
			tags: Array.isArray(tags) ? tags : (tags ? tags.split(',') : []),
			attachments: att
		});

		// Cập nhật số bài viết của User
		await User.findByIdAndUpdate(authorId, { $inc: { "stats.postsCount": 1 } });

		// Emit socket event for realtime update
		if (req.app.get('io')) {
			req.app.get('io').emit('post:new', post);
		}

		res.status(201).json({ success: true, post });

	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, error: "Lỗi tạo bài viết" });
	}
};

exports.updatePost = async (req, res) => {
	try {
		const { title, removeAttachments } = req.body;
		const authorId = req.user._id;
		// Nếu đổi tiêu đề thì cập nhật slug mới
		if (title) {
			req.body.slug = await generateUniqueSlug(title);
		}

		// Lấy bài viết hiện tại
		let post = await Post.findById(req.params.id);
		if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
		if (authorId.toString() !== post.authorId.toString() && !req.user.isAdmin) {
			return res.status(403).json({ success: false, error: 'Bạn không có quyền chỉnh sửa bài viết này' });
		}
		// Xử lý xóa file đính kèm cũ (nếu có)
		if (removeAttachments && removeAttachments.length > 0) {
			const removeList = Array.isArray(removeAttachments)
				? removeAttachments
				: [removeAttachments];

			await Attachment.deleteMany({ _id: { $in: removeList } });

			// Loại file bị xóa khỏi danh sách
			post.attachments = post.attachments.filter(
				id => !removeList.includes(id.toString())
			);
		}

		// Xử lý thêm file mới (nếu có upload)
		if (req.files && req.files.length > 0) {
			const newFiles = await Promise.all(req.files.map(async file => {
				const attachment = new Attachment({
					ownerId: post.authorId,
					filename: file.originalname,
					mime: file.mimetype,
					size: file.size,
					storageUrl: `/uploads/${file.originalname}`
				});
				await attachment.save();
				return attachment._id;
			}));

			post.attachments.push(...newFiles);
		}

		// Cập nhật các trường khác
		post.title = req.body.title ?? post.title;
		post.slug = req.body.slug ?? post.slug;
		post.content = req.body.content ?? post.content;
		post.tags = req.body.tags ? req.body.tags.split(',') : post.tags;
		post.categoryId = req.body.categoryId ?? post.categoryId;

		await post.save();

		res.json({ success: true, post });

	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, error: err.message });
	}
};


// Xóa bài viết
exports.deletePost = async (req, res) => {
	try {
		const authorId = req.user._id;
		const post = await Post.findByIdAndDelete(req.params.id);
		if (authorId.toString() !== post.authorId.toString() && !req.user.isAdmin) {
			return res.status(403).json({ success: false, error: 'Bạn không có quyền xóa bài viết này' });
		}
		// Cập nhật số bài viết của User
		if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
		res.json({ success: true, message: 'Post deleted' });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Lấy bài viết nổi bật (pinned)
exports.getFeaturedPosts = async (req, res) => {
	try {
		const posts = await Post.find({ pinned: true })
			.sort({ updatedAt: -1 })
			.populate('authorId categoryId')
			.populate('attachments');
		res.json(posts);
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// Lấy bài viết theo chuyên mục
exports.getPostsByCategory = async (req, res) => {
	try {
		const posts = await Post.find({ categoryId: req.params.categoryId })
			.populate('authorId categoryId')
			.populate('attachments');
		res.json(posts);
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};
