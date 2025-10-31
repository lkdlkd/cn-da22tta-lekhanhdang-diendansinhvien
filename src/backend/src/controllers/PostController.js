const Post = require('../models/Post');
const User = require('../models/User');
const Category = require('../models/Category');
const Attachment = require('../models/Attachment');
const Like = require('../models/Like');
const slugify = require('slugify');
const comment = require('../models/Comment');
const fs = require('fs');
const path = require('path');
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
			.populate('authorId', 'username displayName avatarUrl faculty class bio stats')
			.populate('categoryId', 'title slug description')
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
		const likes = await Like.find({ targetType: 'post', targetId: { $in: posts.map(p => p._id) } })
			.populate('userId', 'username displayName avatarUrl')
			.sort({ createdAt: -1 });
		const likescmt = await Like.find({ targetType: 'comment', targetId: { $in: commentsRaw.map(c => c._id) } })
			.populate('userId', 'username displayName avatarUrl')
			.sort({ createdAt: -1 });
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
				likes: likescmt.filter(like => String(like.targetId) === String(c._id)),
				parentAuthorName
			};
		});

		// Gắn comment vào từng post
		const postsWithComments = posts.map(post => ({
			...post,
			likes: likes.filter(like => String(like.targetId) === String(post._id)),
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
			.populate('authorId', 'username displayName avatarUrl faculty class bio stats')
			.populate('categoryId', 'title slug description')
			.populate('attachments')
			.lean();

		if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

		// Cập nhật lượt xem
		await Post.findByIdAndUpdate(post._id, { $inc: { views: 1 } });

		// Lấy danh sách likes cho bài viết
		const likes = await Like.find({ targetType: 'post', targetId: post._id })
			.populate('userId', 'username displayName avatarUrl faculty class')
			.sort({ createdAt: -1 });

		// Lấy tất cả comments cho bài viết
		const commentsRaw = await comment.find({ postId: post._id })
			.populate('authorId', 'username displayName avatarUrl faculty class')
			.populate('attachments')
			.lean();

		// Tạo map commentId -> comment để tra cứu parent nhanh
		const commentMap = {};
		commentsRaw.forEach(c => {
			commentMap[String(c._id)] = c;
		});

		// Lấy likes cho comments
		const likescmt = await Like.find({ targetType: 'comment', targetId: { $in: commentsRaw.map(c => c._id) } })
			.populate('userId', 'username displayName avatarUrl faculty class')
			.sort({ createdAt: -1 });

		// Thêm displayName cho author và parentAuthor, và thêm likes
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
				parentAuthorName,
				likes: likescmt.filter(like => String(like.targetId) === String(c._id))
			};
		});		// Gắn likes và comments vào post
		const postWithDetails = {
			...post,
			likes,
			comments
		};

		res.json(postWithDetails);
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
		if (req.files?.length > 0) {
			const backendUrl = `${req.protocol}://${req.get('host')}`;
			attachmentIds = await Promise.all(req.files.map(async (file) => {
				const attachment = new Attachment({
					ownerId: authorId,
					filename: file.filename, // dùng tên file thực tế đã lưu
					mime: file.mimetype || 'application/octet-stream',
					size: file.size || 0,
					storageUrl: `${backendUrl}/uploads/${file.filename}`
				});
				await attachment.save();
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
			attachments: attachmentIds
		});

		// Populate đầy đủ thông tin
		await post.populate('authorId', 'username displayName avatarUrl faculty class');
		await post.populate('categoryId', 'title slug');
		await post.populate('attachments');

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

			// Lấy thông tin file để xóa vật lý
			const attachmentsToRemove = await Attachment.find({ _id: { $in: removeList } });

			// Xóa file vật lý khỏi server
			for (const attachment of attachmentsToRemove) {
				try {
					const filePath = path.join(__dirname, '../../src/uploads', attachment.filename);
					if (fs.existsSync(filePath)) {
						fs.unlinkSync(filePath);
						console.log(`✅ Đã xóa file: ${attachment.filename}`);
					} else {
						console.log(`⚠️ File không tồn tại: ${attachment.filename}`);
					}
				} catch (err) {
					console.error(`❌ Lỗi xóa file ${attachment.filename}:`, err);
				}
			}

			// Xóa khỏi database
			await Attachment.deleteMany({ _id: { $in: removeList } });

			// Loại file bị xóa khỏi danh sách
			post.attachments = post.attachments.filter(
				id => !removeList.includes(id.toString())
			);
		}

		// Xử lý thêm file mới (nếu có upload)
		if (req.files && req.files.length > 0) {
			const backendUrl = `${req.protocol}://${req.get('host')}`;
			const newFiles = await Promise.all(req.files.map(async file => {
				const attachment = new Attachment({
					ownerId: post.authorId,
					filename: file.filename,
					mime: file.mimetype || 'application/octet-stream',
					size: file.size || 0,
					storageUrl: `${backendUrl}/uploads/${file.filename}`
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

		// Populate đầy đủ thông tin
		await post.populate('authorId', 'username displayName avatarUrl faculty class');
		await post.populate('categoryId', 'title slug');
		await post.populate('attachments');
		
		// Emit socket event for realtime update (sự kiện riêng cho update)
		if (req.app.get('io')) {
			req.app.get('io').emit('post:updated', {
				postId: post._id,
				post: post
			});
		}
		
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
		const post = await Post.findById(req.params.id);

		if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

		if (authorId.toString() !== post.authorId.toString() && !req.user.role=== 'admin') {
			return res.status(403).json({ success: false, error: 'Bạn không có quyền xóa bài viết này' });
		}

		// 1. Xóa tất cả file đính kèm vật lý và database
		if (post.attachments && post.attachments.length > 0) {
			// Lấy thông tin đầy đủ của attachments
			const attachmentsToDelete = await Attachment.find({ _id: { $in: post.attachments } });

			if (attachmentsToDelete.length > 0) {
				for (const attachment of attachmentsToDelete) {
					try {
						const filePath = path.join(__dirname, '../../src/uploads', attachment.filename);
						if (fs.existsSync(filePath)) {
							fs.unlinkSync(filePath);
							console.log(`✅ Đã xóa file bài viết: ${attachment.filename}`);
						} else {
							console.log(`⚠️ File không tồn tại (có thể đã bị xóa): ${attachment.filename}`);
						}
					} catch (err) {
						console.error(`❌ Lỗi xóa file ${attachment.filename}:`, err);
					}
				}

				// Xóa attachments khỏi database
				await Attachment.deleteMany({ _id: { $in: post.attachments } });
				console.log(`✅ Đã xóa ${attachmentsToDelete.length} attachment record(s) của bài viết`);
			} else {
				console.log(`⚠️ Không tìm thấy attachment records trong DB`);
			}
		}

		// 2. Lấy tất cả comments của bài viết (bao gồm cả replies)
		const allComments = await comment.find({ postId: post._id });

		// 3. Xóa file đính kèm của tất cả comments
		if (allComments.length > 0) {
			const commentIds = allComments.map(c => c._id);

			// Lấy tất cả attachments của comments
			const commentAttachments = await Attachment.find({
				ownerId: { $in: allComments.map(c => c.authorId) },
				_id: { $in: allComments.flatMap(c => c.attachments || []) }
			});

			// Xóa file vật lý của comment attachments
			if (commentAttachments.length > 0) {
				for (const attachment of commentAttachments) {
					try {
						const filePath = path.join(__dirname, '../../src/uploads', attachment.filename);
						if (fs.existsSync(filePath)) {
							fs.unlinkSync(filePath);
							console.log(`✅ Đã xóa file comment: ${attachment.filename}`);
						} else {
							console.log(`⚠️ File comment không tồn tại (có thể đã bị xóa): ${attachment.filename}`);
						}
					} catch (err) {
						console.error(`❌ Lỗi xóa file comment ${attachment.filename}:`, err);
					}
				}

				// Xóa attachments của comments khỏi database
				await Attachment.deleteMany({ _id: { $in: commentAttachments.map(a => a._id) } });
				console.log(`✅ Đã xóa ${commentAttachments.length} attachment record(s) của comment`);
			}

			// 4. Xóa tất cả likes của bài viết
			const postLikesCount = await Like.countDocuments({ targetType: 'post', targetId: post._id });
			await Like.deleteMany({ targetType: 'post', targetId: post._id });
			console.log(`✅ Đã xóa ${postLikesCount} like(s) của bài viết`);

			// 5. Xóa tất cả likes của comments trong bài viết
			const commentLikesCount = await Like.countDocuments({ targetType: 'comment', targetId: { $in: commentIds } });
			await Like.deleteMany({ targetType: 'comment', targetId: { $in: commentIds } });
			console.log(`✅ Đã xóa ${commentLikesCount} like(s) của comment`);

			// 6. Xóa tất cả thông báo liên quan đến bài viết này
			const Notification = require('../models/Notification');
			const notificationCount = await Notification.countDocuments({ 'data.postId': post._id });
			await Notification.deleteMany({ 'data.postId': post._id });
			console.log(`✅ Đã xóa ${notificationCount} thông báo liên quan`);

			// 7. Xóa tất cả comments của bài viết
			await comment.deleteMany({ postId: post._id });
			console.log(`✅ Đã xóa ${allComments.length} comment(s)`);
		}

		// 8. Xóa bài viết
		await Post.findByIdAndDelete(req.params.id);

		// 9. Cập nhật số bài viết của User
		await User.findByIdAndUpdate(post.authorId, { $inc: { "stats.postsCount": -1 } });

		// Emit socket event for realtime delete
		if (req.app.get('io')) {
			req.app.get('io').emit('post:deleted', { postId: post._id });
		}

		console.log(`✅ Đã xóa hoàn toàn bài viết ${post._id} và tất cả dữ liệu liên quan`);
		res.json({ success: true, message: 'Đã xóa bài viết và tất cả dữ liệu liên quan' });
	} catch (err) {
		console.error('❌ Lỗi khi xóa bài viết:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// Lấy bài viết nổi bật (pinned)
exports.getFeaturedPosts = async (req, res) => {
	try {
		const posts = await Post.find({ pinned: true })
			.sort({ updatedAt: -1 })
			.populate('authorId', 'username displayName avatarUrl faculty class bio stats')
			.populate('categoryId', 'title slug description')
			.populate('attachments')
			.lean();

		// Lấy tất cả comments cho các bài viết nổi bật
		const commentsRaw = await comment.find({ postId: { $in: posts.map(p => p._id) } })
			.populate('authorId', 'username displayName avatarUrl faculty class')
			.populate('attachments')
			.lean();

		// Tạo map commentId -> comment để tra cứu parent nhanh
		const commentMap = {};
		commentsRaw.forEach(c => {
			commentMap[String(c._id)] = c;
		});

		// Lấy likes cho các bài viết
		const likes = await Like.find({ targetType: 'post', targetId: { $in: posts.map(p => p._id) } })
			.populate('userId', 'username displayName avatarUrl faculty class')
			.sort({ createdAt: -1 });

		// Lấy likes cho comments
		const likescmt = await Like.find({ targetType: 'comment', targetId: { $in: commentsRaw.map(c => c._id) } })
			.populate('userId', 'username displayName avatarUrl faculty class')
			.sort({ createdAt: -1 });

		// Thêm displayName cho author và parentAuthor, và thêm likes
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
				parentAuthorName,
				likes: likescmt.filter(like => String(like.targetId) === String(c._id))
			};
		});

		// Gắn likes và comments vào từng post
		const postsWithDetails = posts.map(post => ({
			...post,
			likes: likes.filter(like => String(like.targetId) === String(post._id)),
			comments: comments.filter(c => String(c.postId) === String(post._id))
		}));

		res.json(postsWithDetails);
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// Lấy bài viết theo chuyên mục
exports.getPostsByCategory = async (req, res) => {
	try {
		console.log('🔍 Searching for category with slug:', req.params.slug);

		const category = await Category.findOne({ slug: req.params.slug });
		
		if (!category) {
			console.log('❌ Category not found with slug:', req.params.slug);
			return res.status(404).json({ success: false, error: 'Category not found' });
		}
		
		console.log('✅ Found category:', { _id: category._id, title: category.title, slug: category.slug });
		
		const posts = await Post.find({ categoryId: category._id })
			.sort({ createdAt: -1 })
			.populate('authorId', 'username displayName avatarUrl faculty class bio stats')
			.populate('categoryId', 'title slug description')
			.populate('attachments')
			.lean();
		
		console.log(`📝 Found ${posts.length} posts for category ${category.title}`);
		
		if (posts.length > 0) {
			console.log('First post categoryId:', posts[0].categoryId);
		}

		// Lấy tất cả comments cho các bài viết trong chuyên mục
		const commentsRaw = await comment.find({ postId: { $in: posts.map(p => p._id) } })
			.populate('authorId', 'username displayName avatarUrl faculty class')
			.populate('attachments')
			.lean();

		// Tạo map commentId -> comment để tra cứu parent nhanh
		const commentMap = {};
		commentsRaw.forEach(c => {
			commentMap[String(c._id)] = c;
		});

		// Lấy likes cho các bài viết
		const likes = await Like.find({ targetType: 'post', targetId: { $in: posts.map(p => p._id) } })
			.populate('userId', 'username displayName avatarUrl faculty class')
			.sort({ createdAt: -1 });

		// Lấy likes cho comments
		const likescmt = await Like.find({ targetType: 'comment', targetId: { $in: commentsRaw.map(c => c._id) } })
			.populate('userId', 'username displayName avatarUrl faculty class')
			.sort({ createdAt: -1 });

		// Thêm displayName cho author và parentAuthor, và thêm likes
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
				parentAuthorName,
				likes: likescmt.filter(like => String(like.targetId) === String(c._id))
			};
		});		// Gắn likes và comments vào từng post
		const postsWithDetails = posts.map(post => ({
			...post,
			likes: likes.filter(like => String(like.targetId) === String(post._id)),
			comments: comments.filter(c => String(c.postId) === String(post._id))
		}));

		res.json(postsWithDetails);
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// Like bài viết
exports.likePost = async (req, res) => {
	try {
		const postId = req.params.id;
		const userId = req.user._id;

		// Kiểm tra post có tồn tại không
		const post = await Post.findById(postId).populate('authorId');
		if (!post) {
			return res.status(404).json({ success: false, error: 'Post not found' });
		}

		// Kiểm tra đã like chưa
		const existingLike = await Like.findOne({
			userId,
			targetType: 'post',
			targetId: postId
		});

		if (existingLike) {
			return res.status(400).json({ success: false, error: 'Bạn đã thích bài viết này rồi' });
		}

		// Tạo like mới
		const like = await Like.create({
			userId,
			targetType: 'post',
			targetId: postId,
			type: 'like'
		});

		// Populate user info cho like
		await like.populate('userId', 'username displayName avatarUrl faculty class');

		// Cập nhật likesCount
		await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });

		// Emit socket event với đầy đủ thông tin like
		if (req.app.get('io')) {
			req.app.get('io').emit('post:liked', { postId, like });
		}

		// Gửi thông báo cho chủ bài viết (nếu không phải tự like bài của mình)
		if (String(post.authorId._id) !== String(userId)) {
			const Notification = require('../models/Notification');

			// Kiểm tra xem đã có thông báo chưa đọc về like của user này cho bài viết này chưa
			const existingNotification = await Notification.findOne({
				userId: post.authorId._id,
				type: 'like',
				'data.actorId': userId,
				'data.postId': post._id,
				'data.commentId': { $exists: false }, // Chỉ kiểm tra thông báo like bài viết, không phải comment
				read: false
			});

			// Chỉ tạo thông báo mới nếu chưa có thông báo chưa đọc
			if (!existingNotification) {
				const { createNotification } = require('../utils/notificationService');
				await createNotification({
					userId: post.authorId._id,
					type: 'like',
					data: {
						actorId: userId,
						actorName: req.user.displayName || req.user.username,
						postId: post._id,
						postTitle: post.title,
						postSlug: post.slug,
						message: `${req.user.displayName || req.user.username} đã thích bài viết của bạn`
					}
				}, req.app.get('io'));
			}
		}

		res.json({ success: true, like, message: 'Đã thích bài viết' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// Unlike bài viết
exports.unlikePost = async (req, res) => {
	try {
		const postId = req.params.id;
		const userId = req.user._id;

		// Kiểm tra post có tồn tại không
		const post = await Post.findById(postId);
		if (!post) {
			return res.status(404).json({ success: false, error: 'Post not found' });
		}

		// Tìm và xóa like
		const like = await Like.findOneAndDelete({
			userId,
			targetType: 'post',
			targetId: postId
		});

		if (!like) {
			return res.status(400).json({ success: false, error: 'Bạn chưa thích bài viết này' });
		}

		// Cập nhật likesCount
		await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });

		// Emit socket event với thông tin like đã xóa
		if (req.app.get('io')) {
			req.app.get('io').emit('post:unliked', { postId, likeId: like._id, userId });
		}

		// Xóa thông báo liên quan nếu có (nếu chưa đọc)
		const Notification = require('../models/Notification');
		await Notification.deleteOne({
			userId: post.authorId,
			type: 'like',
			'data.actorId': userId,
			'data.postId': postId,
			'data.commentId': { $exists: false },
			read: false
		});

		res.json({ success: true, like, message: 'Đã bỏ thích bài viết' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// Lấy danh sách người đã like bài viết
exports.getPostLikes = async (req, res) => {
	try {
		const postId = req.params.id;
		const likes = await Like.find({ targetType: 'post', targetId: postId })
			.populate('userId', 'username displayName avatarUrl')
			.sort({ createdAt: -1 });

		res.json({ success: true, likes });
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// ==================== ADMIN FUNCTIONS ====================

// [ADMIN] Lấy tất cả posts với phân trang và tìm kiếm nâng cao
exports.getAllPostsAdmin = async (req, res) => {
	try {
		const { 
			page = 1, 
			limit = 20, 
			keyword,
			categoryId,
			authorId,
			pinned,
			locked,
			isDraft,
			sortBy = 'createdAt',
			order = 'desc'
		} = req.query;

		const query = {};
		
		// Tìm kiếm theo keyword
		if (keyword) {
			query.$or = [
				{ title: { $regex: keyword, $options: 'i' } },
				{ content: { $regex: keyword, $options: 'i' } },
				{ slug: { $regex: keyword, $options: 'i' } }
			];
		}

		// Lọc theo category
		if (categoryId) query.categoryId = categoryId;
		
		// Lọc theo author
		if (authorId) query.authorId = authorId;
		
		// Lọc theo trạng thái
		if (pinned !== undefined) query.pinned = pinned === 'true';
		if (locked !== undefined) query.locked = locked === 'true';
		if (isDraft !== undefined) query.isDraft = isDraft === 'true';

		const skip = (page - 1) * limit;
		const sortOrder = order === 'desc' ? -1 : 1;

		const posts = await Post.find(query)
			.populate('authorId', 'username displayName avatarUrl email')
			.populate('categoryId', 'title slug')
			.populate('attachments')
			.skip(skip)
			.limit(parseInt(limit))
			.sort({ [sortBy]: sortOrder })
			.lean();

		const total = await Post.countDocuments(query);

		res.json({
			success: true,
			data: posts,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Pin/Unpin post
exports.togglePinPost = async (req, res) => {
	try {
		const postId = req.params.id;
		const post = await Post.findById(postId);

		if (!post) {
			return res.status(404).json({ success: false, error: 'Post không tồn tại' });
		}

		post.pinned = !post.pinned;
		await post.save();

		res.json({ 
			success: true, 
			data: post,
			message: post.pinned ? 'Đã ghim bài viết' : 'Đã bỏ ghim bài viết'
		});
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Lock/Unlock post
exports.toggleLockPost = async (req, res) => {
	try {
		const postId = req.params.id;
		const post = await Post.findById(postId);

		if (!post) {
			return res.status(404).json({ success: false, error: 'Post không tồn tại' });
		}

		post.locked = !post.locked;
		await post.save();

		res.json({ 
			success: true, 
			data: post,
			message: post.locked ? 'Đã khóa bài viết' : 'Đã mở khóa bài viết'
		});
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Xóa nhiều posts cùng lúc
exports.deleteMultiplePosts = async (req, res) => {
	try {
		const { ids } = req.body;

		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return res.status(400).json({ 
				success: false, 
				error: 'Vui lòng cung cấp danh sách ID' 
			});
		}

		// Xóa related data cho tất cả posts
		await Comment.deleteMany({ postId: { $in: ids } });
		await Like.deleteMany({ targetType: 'post', targetId: { $in: ids } });
		await Report.deleteMany({ targetType: 'post', targetId: { $in: ids } });

		// Xóa attachments
		const posts = await Post.find({ _id: { $in: ids } });
		const attachmentIds = posts.flatMap(post => post.attachments || []);
		if (attachmentIds.length > 0) {
			await Attachment.deleteMany({ _id: { $in: attachmentIds } });
		}

		const result = await Post.deleteMany({ _id: { $in: ids } });

		// Cập nhật user stats
		const User = require('../models/User');
		for (const post of posts) {
			await User.findByIdAndUpdate(post.authorId, { 
				$inc: { "stats.postsCount": -1 } 
			});
		}

		res.json({ 
			success: true, 
			message: `Đã xóa ${result.deletedCount} bài viết`,
			deletedCount: result.deletedCount
		});
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Chuyển bài viết sang category khác
exports.movePosts = async (req, res) => {
	try {
		const { postIds, categoryId } = req.body;

		if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
			return res.status(400).json({ 
				success: false, 
				error: 'Vui lòng cung cấp danh sách post IDs' 
			});
		}

		if (!categoryId) {
			return res.status(400).json({ 
				success: false, 
				error: 'Vui lòng cung cấp category ID' 
			});
		}

		// Kiểm tra category tồn tại
		const Category = require('../models/Category');
		const category = await Category.findById(categoryId);
		if (!category) {
			return res.status(404).json({ 
				success: false, 
				error: 'Category không tồn tại' 
			});
		}

		const result = await Post.updateMany(
			{ _id: { $in: postIds } },
			{ categoryId }
		);

		res.json({ 
			success: true, 
			message: `Đã chuyển ${result.modifiedCount} bài viết sang ${category.title}`,
			modifiedCount: result.modifiedCount
		});
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Thống kê posts
exports.getPostsStats = async (req, res) => {
	try {
		const totalPosts = await Post.countDocuments();
		const publishedPosts = await Post.countDocuments({ isDraft: false });
		const draftPosts = await Post.countDocuments({ isDraft: true });
		const pinnedPosts = await Post.countDocuments({ pinned: true });
		const lockedPosts = await Post.countDocuments({ locked: true });

		// Posts trong 7 ngày qua
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		const recentPosts = await Post.countDocuments({ 
			createdAt: { $gte: sevenDaysAgo } 
		});

		// Posts theo category
		const postsByCategory = await Post.aggregate([
			{
				$group: {
					_id: '$categoryId',
					count: { $sum: 1 }
				}
			},
			{ $sort: { count: -1 } },
			{
				$lookup: {
					from: 'categories',
					localField: '_id',
					foreignField: '_id',
					as: 'category'
				}
			},
			{ $unwind: '$category' },
			{
				$project: {
					categoryId: '$_id',
					categoryTitle: '$category.title',
					categorySlug: '$category.slug',
					postsCount: '$count'
				}
			}
		]);

		// Top posts (theo views, likes, comments)
		const topPostsByViews = await Post.find({ isDraft: false })
			.sort({ views: -1 })
			.limit(10)
			.select('title slug views likesCount commentsCount authorId')
			.populate('authorId', 'username displayName')
			.lean();

		const topPostsByLikes = await Post.find({ isDraft: false })
			.sort({ likesCount: -1 })
			.limit(10)
			.select('title slug views likesCount commentsCount authorId')
			.populate('authorId', 'username displayName')
			.lean();

		// Posts theo tháng (12 tháng gần nhất)
		const twelveMonthsAgo = new Date();
		twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
		
		const postsByMonth = await Post.aggregate([
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
		]);

		res.json({
			success: true,
			stats: {
				totalPosts,
				publishedPosts,
				draftPosts,
				pinnedPosts,
				lockedPosts,
				recentPosts,
				postsByCategory,
				topPostsByViews,
				topPostsByLikes,
				postsByMonth
			}
		});
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};
