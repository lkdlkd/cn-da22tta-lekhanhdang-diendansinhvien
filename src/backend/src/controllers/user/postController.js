const Post = require('../../models/Post');
const User = require('../../models/User');
const Category = require('../../models/Category');
const Attachment = require('../../models/Attachment');
const Like = require('../../models/Like');
const slugify = require('slugify');
const comment = require('../../models/Comment');
const fs = require('fs');
const path = require('path');
const { uploadToDrive, deleteFromDrive } = require('../../utils/fileUpload');

// HÀM XỬ LÝ TAGS
function processTags(tags) {
	if (!tags) return [];

	if (Array.isArray(tags)) {
		return tags
			.filter(tag => tag && typeof tag === 'string')
			.map(tag => tag.trim())
			.filter(tag => tag.length > 0);
	}

	if (typeof tags === 'string') {
		return tags
			.split(',')
			.map(tag => tag.trim())
			.filter(tag => tag.length > 0);
	}

	return [];
}

// HÀM TẠO SLUG DUY NHẤT
async function generateUniqueSlug(title) {
	const MAX_SLUG_LENGTH = 60; // Giới hạn độ dài slug

	// Tạo slug cơ bản
	let slugBase = slugify(title, { lower: true, strict: true });

	// Nếu slug quá dài, cắt ngắn lại
	if (slugBase.length > MAX_SLUG_LENGTH) {
		// Cắt tại vị trí MAX_SLUG_LENGTH
		let truncated = slugBase.substring(0, MAX_SLUG_LENGTH);
		// Tìm dấu gạch ngang cuối cùng để cắt ở ranh giới từ
		const lastDashIndex = truncated.lastIndexOf('-');
		if (lastDashIndex > MAX_SLUG_LENGTH * 0.7) {
			// Nếu có dấu gạch ngang gần cuối, cắt tại đó
			truncated = truncated.substring(0, lastDashIndex);
		}
		slugBase = truncated;
	}

	// Kiểm tra trùng lặp và thêm số đếm nếu cần
	let slug = slugBase;
	let counter = 1;

	while (await Post.findOne({ slug })) {
		// Tạo suffix với số đếm
		const suffix = `-${counter++}`;
		// Đảm bảo slug + suffix không vượt quá MAX_SLUG_LENGTH
		const maxBaseLength = MAX_SLUG_LENGTH - suffix.length;
		const base = slugBase.length > maxBaseLength
			? slugBase.substring(0, maxBaseLength)
			: slugBase;
		slug = `${base}${suffix}`;
	}

	return slug;
}

// Lấy tất cả bài viết (hỗ trợ phân trang qua query: page, limit)
exports.getAllPosts = async (req, res) => {
	try {
		// Đọc tham số phân trang, mặc định 1/20
		const page = Math.max(parseInt(req.query.page) || 1, 1);
		const limit = Math.max(parseInt(req.query.limit) || 20, 1);
		const skip = (page - 1) * limit;

		// Đọc tham số sắp xếp
		const sortBy = req.query.sortBy || 'createdAt';
		const order = req.query.order === 'asc' ? 1 : -1;

		// Danh sách các trường được phép sắp xếp
		const allowedSortFields = ['createdAt', 'views', 'likesCount', 'commentsCount', 'updatedAt'];
		const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

		// Tạo object sort động
		const sortObject = { [sortField]: order };

		// Lọc theo từ khóa nếu có
		const keyword = (req.query.keyword || '').toString().trim();
		// Chỉ hiển thị bài viết chưa xóa và đã xuất bản
		// HOẶC bài viết của chính user (bao gồm pending/rejected)
		const baseQuery = {
			isDeleted: false,
			isDraft: false,
			$or: [
				{ moderationStatus: 'approved' },
				// Cho phép tác giả xem bài pending/rejected của mình
				...(req.user ? [{ authorId: req.user._id }] : [])
			]
		};
		if (keyword) {
			baseQuery.$and = [
				{
					$or: [
						{ title: { $regex: keyword, $options: 'i' } },
						{ content: { $regex: keyword, $options: 'i' } }
					]
				}
			];
		}

		// Lấy danh sách bài viết theo trang
		const posts = await Post.find(baseQuery)
			.populate('authorId', 'username displayName avatarUrl faculty class bio stats')
			.populate('categoryId', 'title slug description')
			.populate('attachments')
			.sort(sortObject)
			.skip(skip)
			.limit(limit)
			.lean();

		if (posts.length === 0) {
			return res.json([]);
		}

		const postIds = posts.map(p => p._id);

		// Query song song tất cả data cần thiết
		const [commentsRaw, likes, commentIds] = await Promise.all([
			comment.find({ postId: { $in: postIds } })
				.populate('authorId', 'username displayName avatarUrl')
				.populate('attachments')
				.sort({ createdAt: -1 })
				.lean(),
			Like.find({ targetType: 'post', targetId: { $in: postIds } })
				.populate('userId', 'username displayName avatarUrl')
				.sort({ createdAt: -1 })
				.lean(),
			comment.find({ postId: { $in: postIds } }).distinct('_id')
		]);

		// Lấy likes cho comments trong 1 query
		const likescmt = commentIds.length > 0
			? await Like.find({ targetType: 'comment', targetId: { $in: commentIds } })
				.populate('userId', 'username displayName avatarUrl')
				.sort({ createdAt: -1 })
				.lean()
			: [];

		// Tạo maps để tra cứu nhanh O(1)
		const commentMap = new Map();
		const likesMap = new Map();
		const commentLikesMap = new Map();

		commentsRaw.forEach(c => commentMap.set(String(c._id), c));
		likes.forEach(l => {
			const key = String(l.targetId);
			if (!likesMap.has(key)) likesMap.set(key, []);
			likesMap.get(key).push(l);
		});
		likescmt.forEach(l => {
			const key = String(l.targetId);
			if (!commentLikesMap.has(key)) commentLikesMap.set(key, []);
			commentLikesMap.get(key).push(l);
		});

		// Xử lý comments với O(n) complexity
		const comments = commentsRaw.map(c => {
			const cId = String(c._id);
			const parentId = c.parentId ? String(c.parentId) : null;
			const parent = parentId ? commentMap.get(parentId) : null;

			return {
				...c,
				authorName: c.authorId?.displayName || c.authorId?.username || 'Ẩn danh',
				parentAuthorName: parent
					? (parent.authorId?.displayName || parent.authorId?.username || 'Ẩn danh')
					: null,
				likes: commentLikesMap.get(cId) || []
			};
		});

		// Tạo comment map theo postId
		const commentsByPost = new Map();
		comments.forEach(c => {
			const key = String(c.postId);
			if (!commentsByPost.has(key)) commentsByPost.set(key, []);
			commentsByPost.get(key).push(c);
		});

		// Gắn data vào posts
		const postsWithComments = posts.map(post => {
			const pId = String(post._id);
			return {
				...post,
				likes: likesMap.get(pId) || [],
				comments: commentsByPost.get(pId) || []
			};
		});

		res.json(postsWithComments);
	} catch (err) {
		console.error('Error in getAllPosts:', err);
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

		if (!post) {
			return res.status(404).json({ success: false, error: 'Post not found' });
		}

		// Query song song: cập nhật views và lấy data
		const [commentsRaw, likes] = await Promise.all([
			comment.find({ postId: post._id })
				.populate('authorId', 'username displayName avatarUrl faculty class')
				.populate('attachments')
				.sort({ createdAt: -1 })
				.lean(),
			Like.find({ targetType: 'post', targetId: post._id })
				.populate('userId', 'username displayName avatarUrl faculty class')
				.sort({ createdAt: -1 })
				.lean(),
			Post.findByIdAndUpdate(post._id, { $inc: { views: 1 } })
		]);

		// Lấy likes cho comments nếu có comments
		const likescmt = commentsRaw.length > 0
			? await Like.find({
				targetType: 'comment',
				targetId: { $in: commentsRaw.map(c => c._id) }
			})
				.populate('userId', 'username displayName avatarUrl faculty class')
				.sort({ createdAt: -1 })
				.lean()
			: [];

		// Tạo maps để tra cứu O(1)
		const commentMap = new Map(commentsRaw.map(c => [String(c._id), c]));
		const commentLikesMap = new Map();

		likescmt.forEach(l => {
			const key = String(l.targetId);
			if (!commentLikesMap.has(key)) commentLikesMap.set(key, []);
			commentLikesMap.get(key).push(l);
		});

		// Xử lý comments
		const comments = commentsRaw.map(c => {
			const cId = String(c._id);
			const parentId = c.parentId ? String(c.parentId) : null;
			const parent = parentId ? commentMap.get(parentId) : null;

			return {
				...c,
				authorName: c.authorId?.displayName || c.authorId?.username || 'Ẩn danh',
				parentAuthorName: parent
					? (parent.authorId?.displayName || parent.authorId?.username || 'Ẩn danh')
					: null,
				likes: commentLikesMap.get(cId) || []
			};
		});

		res.json({
			...post,
			likes,
			comments
		});
	} catch (err) {
		console.error('Error in getPostBySlug:', err);
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

		// Lưu file upload → Attachment (Upload lên Cloudinary)
		let attachmentIds = [];
		if (req.files?.length > 0) {
			attachmentIds = await Promise.all(req.files.map(async (file) => {
				// Upload lên Cloudinary vào folder documents
				const { fileId, link, resourceType } = await uploadToDrive(file, 'post');

				const attachment = new Attachment({
					ownerId: authorId,
					filename: file.originalname, // LƯU TÊN GỐC để hiển thị
					mime: file.mimetype || 'application/octet-stream',
					size: file.size || 0,
					storageUrl: link, // Link từ Cloudinary
					driveFileId: fileId, // ID file trên Cloudinary
					resourceType: resourceType // Loại file (image/video/raw)
				});
				await attachment.save();
				return attachment._id;
			}));
		}

		// Xử lý tags - có thể là array hoặc string
		const processedTags = processTags(tags);

		// Tạo Post
		const post = await Post.create({
			authorId,
			categoryId,
			title,
			slug,
			content,
			tags: processedTags,
			attachments: attachmentIds
		});

		// Populate đầy đủ thông tin
		await post.populate('authorId', 'username displayName avatarUrl faculty class');
		await post.populate('categoryId', 'title slug');
		await post.populate('attachments');

		// Cập nhật số bài viết của User
		await User.findByIdAndUpdate(authorId, { $inc: { "stats.postsCount": 1 } });

		// Emit socket event - chỉ cho người đăng bài (chưa duyệt nên chỉ họ thấy)
		if (req.app.get('io')) {
			req.app.get('io').emit('post:created', {
				post,
				createdBy: authorId.toString()
			});
		}

		res.status(201).json({ success: true, post });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, error: "Lỗi tạo bài viết" });
	}
};

// Cập nhật bài viết
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

			// Lấy thông tin file để xóa từ Cloudinary
			const attachmentsToRemove = await Attachment.find({ _id: { $in: removeList } });

			// Xóa file từ Cloudinary
			for (const attachment of attachmentsToRemove) {
				try {
					if (attachment.driveFileId) {
						await deleteFromDrive(attachment.driveFileId, attachment.resourceType);
						console.log(`✅ Đã xóa file từ Cloudinary [${attachment.resourceType}]: ${attachment.filename}`);
					} else {
						console.log(`⚠️ File không có driveFileId: ${attachment.filename}`);
					}
				} catch (err) {
					console.error(`❌ Lỗi xóa file từ Cloudinary:`, err);
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
			const newFiles = await Promise.all(req.files.map(async file => {
				// Upload lên Cloudinary vào folder documents
				const { fileId, link, resourceType } = await uploadToDrive(file, 'post');

				const attachment = new Attachment({
					ownerId: post.authorId,
					filename: file.originalname, // LƯU TÊN GỐC
					mime: file.mimetype || 'application/octet-stream',
					size: file.size || 0,
					storageUrl: link, // Link từ Cloudinary
					driveFileId: fileId, // ID file trên Cloudinary
					resourceType: resourceType // Loại file (image/video/raw)
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

		// Xử lý tags - sử dụng helper function
		if (req.body.tags !== undefined) {
			post.tags = processTags(req.body.tags);
		}

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

		if (authorId.toString() !== post.authorId.toString() && !req.user.role === 'admin') {
			return res.status(403).json({ success: false, error: 'Bạn không có quyền xóa bài viết này' });
		}

		// 1. Xóa tất cả file đính kèm từ Cloudinary và database
		if (post.attachments && post.attachments.length > 0) {
			// Lấy thông tin đầy đủ của attachments
			const attachmentsToDelete = await Attachment.find({ _id: { $in: post.attachments } });

			if (attachmentsToDelete.length > 0) {
				for (const attachment of attachmentsToDelete) {
					try {
						if (attachment.driveFileId) {
							await deleteFromDrive(attachment.driveFileId, attachment.resourceType);
							console.log(`✅ Đã xóa file bài viết từ Cloudinary [${attachment.resourceType}]: ${attachment.filename}`);
						} else {
							console.log(`⚠️ File không có driveFileId: ${attachment.filename}`);
						}
					} catch (err) {
						console.error(`❌ Lỗi xóa file từ Cloudinary:`, err);
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

			// Xóa file từ Cloudinary của comment attachments
			if (commentAttachments.length > 0) {
				for (const attachment of commentAttachments) {
					try {
						if (attachment.driveFileId) {
							await deleteFromDrive(attachment.driveFileId, attachment.resourceType);
							console.log(`✅ Đã xóa file comment từ Cloudinary [${attachment.resourceType}]: ${attachment.filename}`);
						} else {
							console.log(`⚠️ File comment không có driveFileId: ${attachment.filename}`);
						}
					} catch (err) {
						console.error(`❌ Lỗi xóa file comment từ Cloudinary:`, err);
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
			const Notification = require('../../models/Notification');
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

// Lấy bài viết theo chuyên mục
exports.getPostsByCategory = async (req, res) => {
	try {
		const category = await Category.findOne({ slug: req.params.slug }).lean();

		if (!category) {
			return res.status(404).json({ success: false, error: 'Không tìm thấy chuyên mục' });
		}
		// Phân trang qua query: page, limit
		const page = Math.max(parseInt(req.query.page) || 1, 1);
		const limit = Math.max(parseInt(req.query.limit) || 20, 1);
		const skip = (page - 1) * limit;

		const keyword = (req.query.keyword || '').toString().trim();
		// Chỉ hiển thị bài viết chưa xóa và đã xuất bản
		const query = { categoryId: category._id, isDeleted: false, isDraft: false, moderationStatus: 'approved' };
		if (keyword) {
			query.$or = [
				{ title: { $regex: keyword, $options: 'i' } },
				{ content: { $regex: keyword, $options: 'i' } }
			];
		}

		const posts = await Post.find(query)
			.sort({ createdAt: -1 })
			.populate('authorId', 'username displayName avatarUrl faculty class bio stats')
			.populate('categoryId', 'title slug description')
			.populate('attachments')
			.skip(skip)
			.limit(limit)
			.lean();

		if (posts.length === 0) {
			return res.json([]);
		}

		const postIds = posts.map(p => p._id);

		// Query song song
		const [commentsRaw, likes, commentIds] = await Promise.all([
			comment.find({ postId: { $in: postIds } })
				.populate('authorId', 'username displayName avatarUrl faculty class')
				.populate('attachments')
				.lean(),
			Like.find({ targetType: 'post', targetId: { $in: postIds } })
				.populate('userId', 'username displayName avatarUrl faculty class')
				.sort({ createdAt: -1 })
				.lean(),
			comment.find({ postId: { $in: postIds } }).distinct('_id')
		]);

		const likescmt = commentIds.length > 0
			? await Like.find({ targetType: 'comment', targetId: { $in: commentIds } })
				.populate('userId', 'username displayName avatarUrl faculty class')
				.sort({ createdAt: -1 })
				.lean()
			: [];

		// Tạo maps
		const commentMap = new Map(commentsRaw.map(c => [String(c._id), c]));
		const likesMap = new Map();
		const commentLikesMap = new Map();

		likes.forEach(l => {
			const key = String(l.targetId);
			if (!likesMap.has(key)) likesMap.set(key, []);
			likesMap.get(key).push(l);
		});

		likescmt.forEach(l => {
			const key = String(l.targetId);
			if (!commentLikesMap.has(key)) commentLikesMap.set(key, []);
			commentLikesMap.get(key).push(l);
		});

		// Xử lý comments
		const comments = commentsRaw.map(c => {
			const cId = String(c._id);
			const parentId = c.parentId ? String(c.parentId) : null;
			const parent = parentId ? commentMap.get(parentId) : null;

			return {
				...c,
				authorName: c.authorId?.displayName || c.authorId?.username || 'Ẩn danh',
				parentAuthorName: parent
					? (parent.authorId?.displayName || parent.authorId?.username || 'Ẩn danh')
					: null,
				likes: commentLikesMap.get(cId) || []
			};
		});

		// Tạo comment map theo postId
		const commentsByPost = new Map();
		comments.forEach(c => {
			const key = String(c.postId);
			if (!commentsByPost.has(key)) commentsByPost.set(key, []);
			commentsByPost.get(key).push(c);
		});

		// Gắn data vào posts
		const postsWithDetails = posts.map(post => {
			const pId = String(post._id);
			return {
				...post,
				likes: likesMap.get(pId) || [],
				comments: commentsByPost.get(pId) || []
			};
		});
		res.json(postsWithDetails);
	} catch (err) {
		console.error('Error in getPostsByCategory:', err);
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

		// Kiểm tra bài viết có bị khóa không
		if (post.locked) {
			return res.status(403).json({ success: false, error: 'Bài viết đã bị khóa, không thể thích' });
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

		// Tăng số lượt like nhận được cho chủ bài viết
		await User.findByIdAndUpdate(post.authorId._id, {
			$inc: { "stats.likesReceived": 1 }
		});

		// Gửi thông báo cho chủ bài viết (nếu không phải tự like bài của mình)
		if (String(post.authorId._id) !== String(userId)) {
			const Notification = require('../../models/Notification');

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
				const { createNotification } = require('../../utils/notificationService');
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

		// Giảm số lượt like nhận được cho chủ bài viết
		await User.findByIdAndUpdate(post.authorId, {
			$inc: { "stats.likesReceived": -1 }
		});

		// Emit socket event với thông tin like đã xóa
		if (req.app.get('io')) {
			req.app.get('io').emit('post:unliked', { postId, likeId: like._id, userId });
		}

		// Xóa thông báo liên quan nếu có (nếu chưa đọc)
		const Notification = require('../../models/Notification');
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

// Lấy thống kê forum công khai (cho trang chủ)
exports.getForumStats = async (req, res) => {
	try {
		// Đếm số user (chỉ đếm user đã xác thực và không bị cấm)
		const totalUsers = await User.countDocuments({
			emailVerified: true,
			isBanned: { $ne: true }
		});
		console.log('Total Users:', totalUsers);

		// Đếm số bài viết đã duyệt và không bị xóa
		const totalPosts = await Post.countDocuments({
			moderationStatus: 'approved',
			isDeleted: { $ne: true }
		});

		// Đếm số danh mục
		const totalCategories = await Category.countDocuments({});

		res.json({
			success: true,
			stats: {
				totalUsers,
				totalPosts,
				totalCategories
			}
		});
	} catch (err) {
		console.error('Error in getForumStats:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

module.exports = exports;
