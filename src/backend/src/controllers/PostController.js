const Post = require('../models/Post');
const User = require('../models/User');
const Category = require('../models/Category');
const Attachment = require('../models/Attachment');
const Like = require('../models/Like');
const slugify = require('slugify');
const comment = require('../models/Comment');
const fs = require('fs');
const path = require('path');
const { uploadToDrive, deleteFromDrive } = require('../utils/fileUpload');

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
				{ $or: [
					{ title: { $regex: keyword, $options: 'i' } },
					{ content: { $regex: keyword, $options: 'i' } }
				]}
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

// Lấy bài viết nổi bật (pinned)// chưa dùng đến
// exports.getFeaturedPosts = async (req, res) => {
// 	try {
// 		const posts = await Post.find({ pinned: true })
// 			.sort({ updatedAt: -1 })
// 			.populate('authorId', 'username displayName avatarUrl faculty class bio stats')
// 			.populate('categoryId', 'title slug description')
// 			.populate('attachments')
// 			.lean();

// 		if (posts.length === 0) {
// 			return res.json([]);
// 		}

// 		const postIds = posts.map(p => p._id);

// 		// Query song song
// 		const [commentsRaw, likes, commentIds] = await Promise.all([
// 			comment.find({ postId: { $in: postIds } })
// 				.populate('authorId', 'username displayName avatarUrl faculty class')
// 				.populate('attachments')
// 				.lean(),
// 			Like.find({ targetType: 'post', targetId: { $in: postIds } })
// 				.populate('userId', 'username displayName avatarUrl faculty class')
// 				.sort({ createdAt: -1 })
// 				.lean(),
// 			comment.find({ postId: { $in: postIds } }).distinct('_id')
// 		]);

// 		const likescmt = commentIds.length > 0
// 			? await Like.find({ targetType: 'comment', targetId: { $in: commentIds } })
// 				.populate('userId', 'username displayName avatarUrl faculty class')
// 				.sort({ createdAt: -1 })
// 				.lean()
// 			: [];

// 		// Tạo maps
// 		const commentMap = new Map(commentsRaw.map(c => [String(c._id), c]));
// 		const likesMap = new Map();
// 		const commentLikesMap = new Map();

// 		likes.forEach(l => {
// 			const key = String(l.targetId);
// 			if (!likesMap.has(key)) likesMap.set(key, []);
// 			likesMap.get(key).push(l);
// 		});

// 		likescmt.forEach(l => {
// 			const key = String(l.targetId);
// 			if (!commentLikesMap.has(key)) commentLikesMap.set(key, []);
// 			commentLikesMap.get(key).push(l);
// 		});

// 		// Xử lý comments
// 		const comments = commentsRaw.map(c => {
// 			const cId = String(c._id);
// 			const parentId = c.parentId ? String(c.parentId) : null;
// 			const parent = parentId ? commentMap.get(parentId) : null;

// 			return {
// 				...c,
// 				authorName: c.authorId?.displayName || c.authorId?.username || 'Ẩn danh',
// 				parentAuthorName: parent 
// 					? (parent.authorId?.displayName || parent.authorId?.username || 'Ẩn danh')
// 					: null,
// 				likes: commentLikesMap.get(cId) || []
// 			};
// 		});

// 		// Tạo comment map theo postId
// 		const commentsByPost = new Map();
// 		comments.forEach(c => {
// 			const key = String(c.postId);
// 			if (!commentsByPost.has(key)) commentsByPost.set(key, []);
// 			commentsByPost.get(key).push(c);
// 		});

// 		// Gắn data vào posts
// 		const postsWithDetails = posts.map(post => {
// 			const pId = String(post._id);
// 			return {
// 				...post,
// 				likes: likesMap.get(pId) || [],
// 				comments: commentsByPost.get(pId) || []
// 			};
// 		});

// 		res.json(postsWithDetails);
// 	} catch (err) {
// 		console.error('Error in getFeaturedPosts:', err);
// 		res.status(500).json({ success: false, error: err.message });
// 	}
// };

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

		// Giảm số lượt like nhận được cho chủ bài viết
		await User.findByIdAndUpdate(post.authorId, { 
			$inc: { "stats.likesReceived": -1 } 
		});

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
// exports.getPostLikes = async (req, res) => {
// 	try {
// 		const postId = req.params.id;
// 		const likes = await Like.find({ targetType: 'post', targetId: postId })
// 			.populate('userId', 'username displayName avatarUrl')
// 			.sort({ createdAt: -1 });

// 		res.json({ success: true, likes });
// 	} catch (err) {
// 		res.status(500).json({ success: false, error: err.message });
// 	}
// };

// ==================== ADMIN FUNCTIONS ====================

// [ADMIN] Lấy tất cả posts với phân trang và tìm kiếm nâng cao
exports.getAllPostsAdmin = async (req, res) => {
	try {
		const {
			page = 1,
			limit = 20,
			keyword,
			categoryId,
			username,
			pinned,
			locked,
			isDeleted,
			moderationStatus,
			sortBy = 'createdAt',
			order = 'desc'
		} = req.query;

		const query = {};

		// Tìm kiếm theo keyword
		if (keyword) {
			const kw = String(keyword).trim();
			if (kw) {
				query.$or = [
					{ title: { $regex: kw, $options: 'i' } },
					{ content: { $regex: kw, $options: 'i' } },
					{ slug: { $regex: kw, $options: 'i' } },
					{ authorId: await User.find({
						$or: [
							{ username: { $regex: kw, $options: 'i' } },	
							{ displayName: { $regex: kw, $options: 'i' } }
						]
					}).distinct('_id') }

				];
			}
		}

		// Lọc theo category
		if (categoryId) query.categoryId = categoryId;
		
		// Lọc theo username
		if (username) {
			const uname = String(username).trim();
			if (uname) {
				const users = await User.find({ username: { $regex: uname, $options: 'i' } }).distinct('_id');
				if (users.length > 0) {
					query.authorId = { $in: users };
				} else {
					// Nếu không tìm thấy user nào, trả về query không thể match
					query.authorId = null;
				}
			}
		}

		// Lọc theo trạng thái
		if (pinned !== undefined && pinned !== '') query.pinned = String(pinned) === 'true';
		if (locked !== undefined && locked !== '') query.locked = String(locked) === 'true';
		if (isDeleted !== undefined && isDeleted !== '') query.isDeleted = String(isDeleted) === 'true';
		if (moderationStatus && ['pending', 'approved', 'rejected'].includes(String(moderationStatus))) {
			query.moderationStatus = moderationStatus;
		}

		const skip = (parseInt(page) - 1) * parseInt(limit);
		const sortOrder = order === 'desc' ? -1 : 1;
		const limitNum = parseInt(limit);

		// Query song song
		const [posts, total] = await Promise.all([
			Post.find(query)
				.populate('authorId', 'username displayName avatarUrl email')
				.populate('categoryId', 'title slug')
				.populate('moderatedBy', 'username displayName email')
				.populate('attachments')
				.skip(skip)
				.limit(limitNum)
				.sort({ [sortBy]: sortOrder })
				.lean(),
			Post.countDocuments(query)
		]);

		res.json({
			success: true,
			data: posts,
			pagination: {
				page: parseInt(page),
				limit: limitNum,
				total,
				pages: Math.ceil(total / limitNum)
			}
		});
	} catch (err) {
		console.error('Error in getAllPostsAdmin:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Đánh dấu xóa mềm (soft-delete) 1 bài viết
exports.softDeletePostAdmin = async (req, res) => {
	try {
		const { id } = req.params;
		const post = await Post.findById(id);
		if (!post) {
			return res.status(404).json({ success: false, error: 'Post không tồn tại' });
		}

		if (post.isDeleted) {
			return res.json({ success: true, data: post, message: 'Bài viết đã ở trạng thái đã xóa' });
		}

		post.isDeleted = true;
		await post.save();
		return res.json({ success: true, data: post, message: 'Đã chuyển bài viết sang trạng thái đã xóa (soft-delete)' });
	} catch (err) {
		console.error('Error in softDeletePostAdmin:', err);
		return res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Khôi phục 1 bài viết (bỏ trạng thái isDeleted)
exports.restorePostAdmin = async (req, res) => {
	try {
		const { id } = req.params;
		const post = await Post.findById(id);
		if (!post) {
			return res.status(404).json({ success: false, error: 'Post không tồn tại' });
		}

		if (!post.isDeleted) {
			return res.json({ success: true, data: post, message: 'Bài viết đã ở trạng thái hoạt động' });
		}

		post.isDeleted = false;
		await post.save();
		return res.json({ success: true, data: post, message: 'Đã khôi phục bài viết' });
	} catch (err) {
		console.error('Error in restorePostAdmin:', err);
		return res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Xóa mềm nhiều bài viết
exports.bulkSoftDeletePostsAdmin = async (req, res) => {
	try {
		const { ids } = req.body;
		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return res.status(400).json({ success: false, error: 'Vui lòng cung cấp danh sách ID' });
		}
		const result = await Post.updateMany({ _id: { $in: ids } }, { $set: { isDeleted: true } });
		return res.json({ success: true, modifiedCount: result.modifiedCount, message: `Đã xóa mềm ${result.modifiedCount} bài viết` });
	} catch (err) {
		console.error('Error in bulkSoftDeletePostsAdmin:', err);
		return res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Khôi phục nhiều bài viết
exports.bulkRestorePostsAdmin = async (req, res) => {
	try {
		const { ids } = req.body;
		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return res.status(400).json({ success: false, error: 'Vui lòng cung cấp danh sách ID' });
		}
		const result = await Post.updateMany({ _id: { $in: ids } }, { $set: { isDeleted: false } });
		return res.json({ success: true, modifiedCount: result.modifiedCount, message: `Đã khôi phục ${result.modifiedCount} bài viết` });
	} catch (err) {
		console.error('Error in bulkRestorePostsAdmin:', err);
		return res.status(500).json({ success: false, error: err.message });
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

		// 1) Lấy posts (bao gồm attachments và authorId)
		const posts = await Post.find({ _id: { $in: ids } }).select('_id attachments authorId').lean();
		const postAttachmentIds = posts.flatMap(p => p.attachments || []);

		// 2) Lấy tất cả comments của các bài viết và attachments của chúng
		const allComments = await comment.find({ postId: { $in: ids } }).select('_id attachments authorId').lean();
		const commentIds = allComments.map(c => c._id);
		const commentAttachmentIds = allComments.flatMap(c => c.attachments || []);

		// 3) Lấy thông tin attachment để xoá file vật lý
		const allAttachmentIds = Array.from(new Set([
			...postAttachmentIds.map(id => String(id)),
			...commentAttachmentIds.map(id => String(id))
		]));

		const attachmentsToDelete = allAttachmentIds.length > 0
			? await Attachment.find({ _id: { $in: allAttachmentIds } }).select('filename storageUrl').lean()
			: [];

		// 4) Xoá file vật lý của toàn bộ attachments (post + comment)
		for (const att of attachmentsToDelete) {
			try {
				const uploadsDir = path.join(__dirname, '../uploads');
				const urlPath = String(att.storageUrl || '').replace(/^https?:\/\/[^/]+/i, '');
				let filePath = path.join(uploadsDir, att.filename);
				if (urlPath.startsWith('/uploads/')) {
					const rel = urlPath.replace(/^\/uploads\//, '');
					filePath = path.join(uploadsDir, rel);
				}
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
					console.log(`✅ Đã xóa file: ${filePath}`);
				} else {
					console.log(`⚠️ File không tồn tại (có thể đã bị xóa): ${filePath}`);
				}
			} catch (err) {
				console.error(`❌ Lỗi xóa file vật lý:`, err);
			}
		}

		// 5) Xoá likes của posts và comments, thông báo liên quan, attachments (DB), comments và cuối cùng posts
		const Notification = require('../models/Notification');

		const [
			postLikesDeleted,
			commentLikesDeleted,
			notificationsDeleted,
			commentAttachmentsDeleted,
			postAttachmentsDeleted,
			commentsDeleted,
			postsResult
		] = await Promise.all([
			Like.deleteMany({ targetType: 'post', targetId: { $in: ids } }),
			commentIds.length > 0 ? Like.deleteMany({ targetType: 'comment', targetId: { $in: commentIds } }) : { deletedCount: 0 },
			Notification.deleteMany({ 'data.postId': { $in: ids } }),
			commentAttachmentIds.length > 0 ? Attachment.deleteMany({ _id: { $in: commentAttachmentIds } }) : { deletedCount: 0 },
			postAttachmentIds.length > 0 ? Attachment.deleteMany({ _id: { $in: postAttachmentIds } }) : { deletedCount: 0 },
			comment.deleteMany({ postId: { $in: ids } }),
			Post.deleteMany({ _id: { $in: ids } })
		]);

		// 6) Cập nhật user stats song song (giảm postsCount theo số bài bị xóa)
		await Promise.all(
			posts.map(post =>
				User.findByIdAndUpdate(post.authorId, {
					$inc: { 'stats.postsCount': -1 }
				})
			)
		);

		// 7) Emit socket events cho từng bài đã xóa (nếu cần realtime)
		if (req.app.get('io')) {
			const io = req.app.get('io');
			ids.forEach(postId => io.emit('post:deleted', { postId }));
		}

		res.json({
			success: true,
			message: `Đã xóa ${postsResult.deletedCount} bài viết và toàn bộ dữ liệu liên quan`,
			deletedCount: postsResult.deletedCount
		});
	} catch (err) {
		console.error('Error in deleteMultiplePosts:', err);
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
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const twelveMonthsAgo = new Date();
		twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

		// Query song song tất cả stats
		const [
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
		] = await Promise.all([
			Post.countDocuments(),
			Post.countDocuments({ isDraft: false }),
			Post.countDocuments({ isDraft: true }),
			Post.countDocuments({ pinned: true }),
			Post.countDocuments({ locked: true }),
			Post.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
			// Posts theo category với aggregation
			Post.aggregate([
				{ $group: { _id: '$categoryId', count: { $sum: 1 } } },
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
			]),
			// Top posts theo views
			Post.find({ isDraft: false })
				.sort({ views: -1 })
				.limit(10)
				.select('title slug views likesCount commentsCount authorId')
				.populate('authorId', 'username displayName')
				.lean(),
			// Top posts theo likes
			Post.find({ isDraft: false })
				.sort({ likesCount: -1 })
				.limit(10)
				.select('title slug views likesCount commentsCount authorId')
				.populate('authorId', 'username displayName')
				.lean(),
			// Posts theo tháng
			Post.aggregate([
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
			])
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
		console.error('Error in getPostsStats:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// [MOD] Lấy danh sách bài viết đang chờ duyệt
exports.getPendingPosts = async (req, res) => {
	try {
		const {
			page = 1,
			limit = 10,
			moderationStatus = 'pending',
			keyword,
			categoryId,
			sortBy = 'createdAt',
			order = 'desc'
		} = req.query;

		const query = {
			isDeleted: false
		};

		// Filter by moderation status
		if (['pending', 'approved', 'rejected'].includes(moderationStatus)) {
			query.moderationStatus = moderationStatus;
		}

		// Search by keyword
		if (keyword) {
			const keywordStr = String(keyword).trim();
			if (keywordStr) {
				query.$or = [
					{ title: { $regex: keywordStr, $options: 'i' } },
					{ content: { $regex: keywordStr, $options: 'i' } }
				];
			}
		}

		// Filter by category
		if (categoryId) {
			query.categoryId = categoryId;
		}

		const skip = (parseInt(page) - 1) * parseInt(limit);
		const sortOrder = order === 'desc' ? -1 : 1;
		const limitNum = parseInt(limit);

		// Query with pagination
		const [posts, total] = await Promise.all([
			Post.find(query)
				.populate('authorId', 'username displayName avatarUrl email')
				.populate('categoryId', 'title slug')
				.populate('moderatedBy', 'username displayName email')
				.sort({ [sortBy]: sortOrder })
				.skip(skip)
				.limit(limitNum)
				.lean(),
			Post.countDocuments(query)
		]);

		res.json({
			success: true,
			data: posts,
			pagination: {
				page: parseInt(page),
				limit: limitNum,
				total,
				pages: Math.ceil(total / limitNum)
			}
		});
	} catch (err) {
		console.error('Error in getPendingPosts:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// [MOD] Duyệt bài viết
exports.approvePost = async (req, res) => {
	try {
		const { id } = req.params;

		const post = await Post.findById(id);
		if (!post) {
			return res.status(404).json({
				success: false,
				error: 'Không tìm thấy bài viết'
			});
		}

		if (post.moderationStatus === 'approved') {
			return res.status(400).json({
				success: false,
				error: 'Bài viết đã được duyệt trước đó'
			});
		}

		post.moderationStatus = 'approved';
		post.moderatedBy = req.user._id;
		post.moderatedAt = new Date();
		post.rejectionReason = undefined;

		await post.save();

		await post.populate('authorId', 'username displayName avatarUrl');
		await post.populate('categoryId', 'title slug');

		// Gửi thông báo cho tác giả
		const { createNotification } = require('../utils/notificationService');
		await createNotification({
			userId: post.authorId._id,
			type: 'system',
			data: {
				actorId: req.user._id,
				postId: post._id,
				postTitle: post.title,
				postSlug: post.slug,
				message: `Bài viết "${post.title}" của bạn đã được duyệt và công khai.`
			}
		}, req.app.get('io'));

		// Emit socket event for realtime update
		if (req.app.get('io')) {
			req.app.get('io').emit('post:new', post);
		}

		res.json({
			success: true,
			message: 'Đã duyệt bài viết thành công',
			data: post
		});
	} catch (err) {
		console.error('Error in approvePost:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// [MOD] Từ chối bài viết
exports.rejectPost = async (req, res) => {
	try {
		const { id } = req.params;
		const { reason } = req.body;

		if (!reason || reason.trim().length === 0) {
			return res.status(400).json({
				success: false,
				error: 'Vui lòng cung cấp lý do từ chối'
			});
		}

		const post = await Post.findById(id);
		if (!post) {
			return res.status(404).json({
				success: false,
				error: 'Không tìm thấy bài viết'
			});
		}

		post.moderationStatus = 'rejected';
		post.moderatedBy = req.user._id;
		post.moderatedAt = new Date();
		post.rejectionReason = reason;

		await post.save();

		await post.populate('authorId', 'username displayName avatarUrl');
		await post.populate('categoryId', 'title slug');

		// Gửi thông báo cho tác giả
		const { createNotification } = require('../utils/notificationService');
		await createNotification({
			userId: post.authorId._id,
			type: 'system',
			data: {
				actorId: req.user._id,
				postId: post._id,
				postTitle: post.title,
				postSlug: post.slug,
				rejectionReason: reason,
				message: `Bài viết "${post.title}" của bạn đã bị từ chối. Lý do: ${reason}`
			}
		}, req.app.get('io'));

		res.json({
			success: true,
			message: 'Đã từ chối bài viết',
			data: post
		});
	} catch (err) {
		console.error('Error in rejectPost:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// [MOD] Lấy thống kê moderation
exports.getModerationStats = async (req, res) => {
	try {
		const pending = await Post.countDocuments({
			moderationStatus: 'pending',
			isDeleted: false
		});

		const approved = await Post.countDocuments({
			moderationStatus: 'approved',
			isDeleted: false
		});

		const rejected = await Post.countDocuments({
			moderationStatus: 'rejected',
			isDeleted: false
		});

		const recentActions = await Post.find({
			moderatedAt: { $exists: true }
		})
			.populate('moderatedBy', 'username displayName')
			.populate('authorId', 'username displayName')
			.sort({ moderatedAt: -1 })
			.limit(10);

		res.json({
			success: true,
			data: {
				pending,
				approved,
				rejected,
				total: pending + approved + rejected,
				recentActions
			}
		});
	} catch (err) {
		console.error('Error in getModerationStats:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// ===== PUBLIC FORUM STATS (FOR HOMEPAGE) =====
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
