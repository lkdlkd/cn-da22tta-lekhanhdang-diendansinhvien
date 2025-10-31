const Comment = require('../models/Comment');
const Attachment = require('../models/Attachment');
const Like = require('../models/Like');
const fs = require('fs');
const path = require('path');

// Tạo bình luận mới cho bài viết
exports.createComment = async (req, res) => {
	try {
		const { postId, content, parentId } = req.body;
		const authorId = req.user._id;
		let attachmentIds = [];
		if (req.files?.length > 0) {
			const backendUrl = `${req.protocol}://${req.get('host')}`;
			attachmentIds = await Promise.all(req.files.map(async (file) => {
				const attachment = new Attachment({
					ownerId: authorId,
					filename: file.filename,
					mime: file.mimetype || 'application/octet-stream',
					size: file.size || 0,
					storageUrl: `${backendUrl}/uploads/${file.filename}`
				});
				await attachment.save();
				return attachment._id;
			}));
		}
		const comment = await Comment.create({
			postId,
			authorId,
			content: content || " ",
			parentId: parentId || null,
			attachments: attachmentIds
		});

		// Cập nhật số bình luận cho Post
		const Post = require('../models/Post');
		const post = await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } }, { new: true }).populate('authorId');

		// Cập nhật số bình luận cho User
		const User = require('../models/User');
		await User.findByIdAndUpdate(authorId, { $inc: { "stats.commentsCount": 1 } });

		// Emit socket event cho tất cả client (gửi full comment object đã populate)
		if (req.app.get('io')) {
			// Populate comment
			const populatedComment = await Comment.findById(comment._id)
				.populate('authorId attachments')
				.lean();
			// Build authorName, parentAuthorName
			let authorName = populatedComment.authorId?.displayName || populatedComment.authorId?.username || 'Ẩn danh';
			let parentAuthorName = null;
			if (populatedComment.parentId) {
				const parentComment = await Comment.findById(populatedComment.parentId).populate('authorId').lean();
				if (parentComment) {
					parentAuthorName = parentComment.authorId?.displayName || parentComment.authorId?.username || 'Ẩn danh';
				}
			}
			populatedComment.authorName = authorName;
			populatedComment.parentAuthorName = parentAuthorName;
			req.app.get('io').emit('comment:new', {
				postId,
				comment: populatedComment
			});
		}

		// Gửi thông báo cho chủ bài viết (nếu không phải tự comment bài của mình)
		if (post && String(post.authorId._id) !== String(authorId)) {
			const Notification = require('../models/Notification');
			
			// Kiểm tra xem đã có thông báo chưa đọc về comment của user này cho bài viết này chưa
			const existingNotification = await Notification.findOne({
				userId: post.authorId._id,
				type: 'comment',
				'data.actorId': authorId,
				'data.postId': post._id,
				'data.commentId': comment._id, // Kiểm tra theo commentId cụ thể
				read: false
			});

			// Chỉ tạo thông báo mới nếu chưa có
			if (!existingNotification) {
				const { createNotification } = require('../utils/notificationService');
				await createNotification({
					userId: post.authorId._id,
					type: 'comment',
					data: {
						actorId: authorId,
						actorName: req.user.displayName || req.user.username,
						postId: post._id,
						postTitle: post.title,
						postSlug: post.slug,
						commentId: comment._id,
						commentContent: content?.substring(0, 100) || '',
						message: `${req.user.displayName || req.user.username} đã bình luận về bài viết của bạn`
					}
				}, req.app.get('io'));
			}
		}

		// Nếu là reply, gửi thông báo cho người được reply (nếu không phải chính mình)
		if (parentId) {
			const parentComment = await Comment.findById(parentId).populate('authorId');
			if (parentComment && String(parentComment.authorId._id) !== String(authorId)) {
				const Notification = require('../models/Notification');
				
				// Kiểm tra xem đã có thông báo chưa đọc về reply của user này cho comment này chưa
				const existingNotification = await Notification.findOne({
					userId: parentComment.authorId._id,
					type: 'comment',
					'data.actorId': authorId,
					'data.commentId': comment._id, // Kiểm tra theo commentId cụ thể (reply)
					read: false
				});

				// Chỉ tạo thông báo mới nếu chưa có
				if (!existingNotification) {
					const { createNotification } = require('../utils/notificationService');
					await createNotification({
						userId: parentComment.authorId._id,
						type: 'comment',
						data: {
							actorId: authorId,
							actorName: req.user.displayName || req.user.username,
							postId: post._id,
							postTitle: post.title,
							postSlug: post.slug,
							commentId: comment._id,
							commentContent: content?.substring(0, 100) || '',
							message: `${req.user.displayName || req.user.username} đã trả lời bình luận của bạn`
						}
					}, req.app.get('io'));
				}
			}
		}

		// Populate đầy đủ thông tin để trả về
		await comment.populate('authorId', 'username displayName avatarUrl faculty class');
		await comment.populate('attachments');

		res.status(201).json({ success: true, comment });
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// Xóa comment
exports.deleteComment = async (req, res) => {
	try {
		const authorId = req.user._id;
		const comment = await Comment.findById(req.params.id);

		if (!comment) return res.status(404).json({ success: false, error: 'Comment not found' });

		if (authorId.toString() !== comment.authorId.toString() && !req.user.isAdmin) {
			return res.status(403).json({ success: false, error: 'Bạn không có quyền xóa comment này' });
		}

		// Mảng chứa tất cả comment IDs cần xóa (bao gồm comment chính và replies)
		const commentIdsToDelete = [comment._id];

		// Xóa tất cả file đính kèm vật lý của comment chính
		if (comment.attachments && comment.attachments.length > 0) {
			// Lấy thông tin đầy đủ của attachments
			const attachmentsToDelete = await Attachment.find({ _id: { $in: comment.attachments } });
			
			for (const attachment of attachmentsToDelete) {
				try {
					const filePath = path.join(__dirname, '../../src/uploads', attachment.filename);
					if (fs.existsSync(filePath)) {
						fs.unlinkSync(filePath);
						console.log(`✅ Đã xóa file comment: ${attachment.filename}`);
					} else {
						console.log(`⚠️ File không tồn tại: ${attachment.filename}`);
					}
				} catch (err) {
					console.error(`❌ Lỗi xóa file ${attachment.filename}:`, err);
				}
			}

			// Xóa attachments khỏi database
			await Attachment.deleteMany({ _id: { $in: comment.attachments } });
		}

		// Đếm tổng số comment sẽ bị xóa (bao gồm cả replies)
		const countReplies = async (commentId) => {
			const replies = await Comment.find({ parentId: commentId });
			let count = replies.length;
			for (const reply of replies) {
				count += await countReplies(reply._id);
			}
			return count;
		};
		const totalCommentsToDelete = 1 + await countReplies(comment._id);

		// Xóa tất cả replies của comment này (recursive)
		const deleteRepliesRecursive = async (commentId) => {
			const replies = await Comment.find({ parentId: commentId });
			for (const reply of replies) {
				// Thêm reply ID vào danh sách
				commentIdsToDelete.push(reply._id);

				// Xóa file đính kèm của reply
				if (reply.attachments && reply.attachments.length > 0) {
					// Lấy thông tin đầy đủ của attachments
					const replyAttachments = await Attachment.find({ _id: { $in: reply.attachments } });
					
					for (const attachment of replyAttachments) {
						try {
							const filePath = path.join(__dirname, '../../src/uploads', attachment.filename);
							if (fs.existsSync(filePath)) {
								fs.unlinkSync(filePath);
								console.log(`✅ Đã xóa file reply: ${attachment.filename}`);
							} else {
								console.log(`⚠️ File reply không tồn tại: ${attachment.filename}`);
							}
						} catch (err) {
							console.error(`❌ Lỗi xóa file ${attachment.filename}:`, err);
						}
					}
					await Attachment.deleteMany({ _id: { $in: reply.attachments } });
				}
				// Xóa replies của reply này (recursive)
				await deleteRepliesRecursive(reply._id);
			}
			// Xóa tất cả replies
			await Comment.deleteMany({ parentId: commentId });
		};

		await deleteRepliesRecursive(comment._id);

		// Xóa tất cả likes của comment và replies
		const commentLikesCount = await Like.countDocuments({ targetType: 'comment', targetId: { $in: commentIdsToDelete } });
		await Like.deleteMany({ targetType: 'comment', targetId: { $in: commentIdsToDelete } });
		console.log(`✅ Đã xóa ${commentLikesCount} like(s) của comment`);

		// Xóa tất cả thông báo liên quan đến comments này
		const Notification = require('../models/Notification');
		const notificationCount = await Notification.countDocuments({ 'data.commentId': { $in: commentIdsToDelete } });
		await Notification.deleteMany({
			'data.commentId': { $in: commentIdsToDelete }
		});
		console.log(`✅ Đã xóa ${notificationCount} thông báo liên quan`);

		// Xóa comment chính
		await Comment.findByIdAndDelete(req.params.id);

		// Cập nhật số comment của Post
		const Post = require('../models/Post');
		await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -totalCommentsToDelete } });

		// Cập nhật số comment của User
		const User = require('../models/User');
		await User.findByIdAndUpdate(comment.authorId, { $inc: { "stats.commentsCount": -totalCommentsToDelete } });

		console.log(`✅ Đã xóa hoàn toàn ${totalCommentsToDelete} comment(s) và tất cả dữ liệu liên quan`);
		
		// Emit socket event để cập nhật realtime
		if (req.app.get('io')) {
			req.app.get('io').emit('comment:deleted', {
				commentId: comment._id,
				postId: comment.postId,
				parentId: comment.parentId
			});
		}
		
		res.json({ success: true, message: 'Đã xóa comment và tất cả dữ liệu liên quan' });
	} catch (err) {
		console.error('❌ Lỗi khi xóa comment:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// Cập nhật comment
exports.updateComment = async (req, res) => {
	try {
		const { content, removeAttachments } = req.body;
		const authorId = req.user._id;

		let comment = await Comment.findById(req.params.id);
		if (!comment) return res.status(404).json({ success: false, error: 'Comment not found' });

		if (authorId.toString() !== comment.authorId.toString() && !req.user.isAdmin) {
			return res.status(403).json({ success: false, error: 'Bạn không có quyền chỉnh sửa comment này' });
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
					}
				} catch (err) {
					console.error(`❌ Lỗi xóa file ${attachment.filename}:`, err);
				}
			}

			// Xóa khỏi database
			await Attachment.deleteMany({ _id: { $in: removeList } });

			// Loại file bị xóa khỏi danh sách
			comment.attachments = comment.attachments.filter(
				id => !removeList.includes(id.toString())
			);
		}

		// Xử lý thêm file mới (nếu có upload)
		if (req.files && req.files.length > 0) {
			const backendUrl = `${req.protocol}://${req.get('host')}`;
			const newFiles = await Promise.all(req.files.map(async file => {
				const attachment = new Attachment({
					ownerId: comment.authorId,
					filename: file.filename,
					mime: file.mimetype || 'application/octet-stream',
					size: file.size || 0,
					storageUrl: `${backendUrl}/uploads/${file.filename}`
				});
				await attachment.save();
				return attachment._id;
			}));

			comment.attachments.push(...newFiles);
		}

		// Cập nhật content
		if (content !== undefined) {
			comment.content = content;
		}

		await comment.save();

		// Populate đầy đủ thông tin để trả về
		await comment.populate('authorId', 'username displayName avatarUrl faculty class');
		await comment.populate('attachments');

		// Emit socket event để cập nhật realtime
		if (req.app.get('io')) {
			req.app.get('io').emit('comment:updated', {
				commentId: comment._id,
				postId: comment.postId,
				comment: comment.toObject()
			});
		}

		res.json({ success: true, comment });
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// Like bình luận
exports.likeComment = async (req, res) => {
	try {
		const commentId = req.params.id;
		const userId = req.user._id;

		// Kiểm tra comment có tồn tại không
		const comment = await Comment.findById(commentId).populate('authorId');
		if (!comment) {
			return res.status(404).json({ success: false, error: 'Comment not found' });
		}

		// Kiểm tra đã like chưa
		const existingLike = await Like.findOne({
			userId,
			targetType: 'comment',
			targetId: commentId
		});

		if (existingLike) {
			return res.status(400).json({ success: false, error: 'Bạn đã thích bình luận này rồi' });
		}

		// Tạo like mới
		const like = await Like.create({
			userId,
			targetType: 'comment',
			targetId: commentId,
			type: 'like'
		});

		// Populate user info cho like
		await like.populate('userId', 'username displayName avatarUrl faculty class');

		// Cập nhật likesCount (nếu Comment model có field này)
		// await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: 1 } });

		// Emit socket event với đầy đủ thông tin like
		if (req.app.get('io')) {
			req.app.get('io').emit('comment:liked', { commentId, postId: comment.postId, like });
		}

		// Gửi thông báo cho chủ bình luận (nếu không phải tự like comment của mình)
		if (String(comment.authorId._id) !== String(userId)) {
			const Post = require('../models/Post');
			const post = await Post.findById(comment.postId);
			const Notification = require('../models/Notification');
			
			// Kiểm tra xem đã có thông báo chưa đọc về like của user này cho comment này chưa
			const existingNotification = await Notification.findOne({
				userId: comment.authorId._id,
				type: 'like',
				'data.actorId': userId,
				'data.commentId': comment._id,
				read: false
			});

			// Chỉ tạo thông báo mới nếu chưa có thông báo chưa đọc
			if (!existingNotification) {
				const { createNotification } = require('../utils/notificationService');
				await createNotification({
					userId: comment.authorId._id,
					type: 'like',
					data: {
						actorId: userId,
						actorName: req.user.displayName || req.user.username,
						postId: comment.postId,
						postTitle: post?.title || 'Bài viết',
						postSlug: post?.slug || '',
						commentId: comment._id,
						commentContent: comment.content?.substring(0, 100) || '',
						message: `${req.user.displayName || req.user.username} đã thích bình luận của bạn`
					}
				}, req.app.get('io'));
			}
		}

		res.json({ success: true, like, message: 'Đã thích bình luận' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// Unlike bình luận
exports.unlikeComment = async (req, res) => {
	try {
		const commentId = req.params.id;
		const userId = req.user._id;

		// Kiểm tra comment có tồn tại không
		const comment = await Comment.findById(commentId);
		if (!comment) {
			return res.status(404).json({ success: false, error: 'Comment not found' });
		}

		// Tìm và xóa like
		const like = await Like.findOneAndDelete({
			userId,
			targetType: 'comment',
			targetId: commentId
		});

		if (!like) {
			return res.status(400).json({ success: false, error: 'Bạn chưa thích bình luận này' });
		}

		// Cập nhật likesCount (nếu Comment model có field này)
		// await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: -1 } });

		// Emit socket event với thông tin like đã xóa
		if (req.app.get('io')) {
			req.app.get('io').emit('comment:unliked', { commentId, postId: comment.postId, likeId: like._id, userId });
		}

		// Xóa thông báo liên quan nếu có (nếu chưa đọc)
		const Notification = require('../models/Notification');
		await Notification.deleteOne({
			userId: comment.authorId,
			type: 'like',
			'data.actorId': userId,
			'data.commentId': commentId,
			read: false
		});

		res.json({ success: true, like, message: 'Đã bỏ thích bình luận' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// Lấy danh sách người đã like bình luận
exports.getCommentLikes = async (req, res) => {
	try {
		const commentId = req.params.id;
		const likes = await Like.find({ targetType: 'comment', targetId: commentId })
			.populate('userId', 'username displayName avatarUrl')
			.sort({ createdAt: -1 });

		res.json({ success: true, likes });
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// ==================== ADMIN FUNCTIONS ====================

// [ADMIN] Lấy tất cả comments với phân trang và lọc
exports.getAllCommentsAdmin = async (req, res) => {
	try {
		const { 
			page = 1, 
			limit = 20, 
			postId, 
			userId, 
			keyword,
			sortBy = 'createdAt',
			order = 'desc'
		} = req.query;

		const query = {};
		
		// Lọc theo bài viết
		if (postId) query.postId = postId;
		
		// Lọc theo user
		if (userId) query.authorId = userId;
		
		// Tìm kiếm theo nội dung
		if (keyword) {
			query.content = { $regex: keyword, $options: 'i' };
		}

		const skip = (page - 1) * limit;
		const sortOrder = order === 'desc' ? -1 : 1;

		const comments = await Comment.find(query)
			.populate('authorId', 'username displayName avatarUrl email')
			.populate('postId', 'title slug')
			.populate('attachments')
			.skip(skip)
			.limit(parseInt(limit))
			.sort({ [sortBy]: sortOrder })
			.lean();

		// Thêm thông tin likes count
		const commentsWithStats = await Promise.all(
			comments.map(async (comment) => {
				const likesCount = await Like.countDocuments({ 
					targetType: 'comment', 
					targetId: comment._id 
				});
				const repliesCount = await Comment.countDocuments({ 
					parentId: comment._id 
				});
				return {
					...comment,
					likesCount,
					repliesCount
				};
			})
		);

		const total = await Comment.countDocuments(query);

		res.json({
			success: true,
			data: commentsWithStats,
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

// [ADMIN] Xóa comment (kèm replies và attachments)
exports.deleteCommentAdmin = async (req, res) => {
	try {
		const commentId = req.params.id;
		const comment = await Comment.findById(commentId);

		if (!comment) {
			return res.status(404).json({ success: false, error: 'Comment không tồn tại' });
		}

		// Xóa tất cả replies
		const replies = await Comment.find({ parentId: commentId });
		for (const reply of replies) {
			// Xóa attachments của replies
			if (reply.attachments?.length > 0) {
				await Attachment.deleteMany({ _id: { $in: reply.attachments } });
			}
			// Xóa likes của replies
			await Like.deleteMany({ targetType: 'comment', targetId: reply._id });
		}
		await Comment.deleteMany({ parentId: commentId });

		// Xóa attachments của comment chính
		if (comment.attachments?.length > 0) {
			await Attachment.deleteMany({ _id: { $in: comment.attachments } });
		}

		// Xóa likes của comment
		await Like.deleteMany({ targetType: 'comment', targetId: commentId });

		// Xóa comment
		await Comment.findByIdAndDelete(commentId);

		// Cập nhật post comments count
		const Post = require('../models/Post');
		await Post.findByIdAndUpdate(comment.postId, { 
			$inc: { commentsCount: -(1 + replies.length) } 
		});

		// Cập nhật user stats
		const User = require('../models/User');
		await User.findByIdAndUpdate(comment.authorId, { 
			$inc: { "stats.commentsCount": -(1 + replies.length) } 
		});

		res.json({ 
			success: true, 
			message: `Đã xóa comment và ${replies.length} replies` 
		});
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Xóa nhiều comments cùng lúc
exports.deleteMultipleCommentsAdmin = async (req, res) => {
	try {
		const { ids } = req.body;

		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return res.status(400).json({ 
				success: false, 
				error: 'Vui lòng cung cấp danh sách ID' 
			});
		}

		let totalDeleted = 0;
		let postUpdates = {};

		for (const commentId of ids) {
			const comment = await Comment.findById(commentId);
			if (!comment) continue;

			// Đếm replies
			const repliesCount = await Comment.countDocuments({ parentId: commentId });
			
			// Xóa replies
			await Comment.deleteMany({ parentId: commentId });
			
			// Xóa attachments
			if (comment.attachments?.length > 0) {
				await Attachment.deleteMany({ _id: { $in: comment.attachments } });
			}
			
			// Xóa likes
			await Like.deleteMany({ targetType: 'comment', targetId: commentId });
			
			// Xóa comment
			await Comment.findByIdAndDelete(commentId);

			// Track post updates
			const postId = String(comment.postId);
			postUpdates[postId] = (postUpdates[postId] || 0) + (1 + repliesCount);

			totalDeleted += (1 + repliesCount);
		}

		// Cập nhật posts
		const Post = require('../models/Post');
		for (const [postId, count] of Object.entries(postUpdates)) {
			await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: -count } });
		}

		res.json({ 
			success: true, 
			message: `Đã xóa ${totalDeleted} comments`,
			deletedCount: totalDeleted
		});
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Thống kê comments
exports.getCommentsStats = async (req, res) => {
	try {
		const totalComments = await Comment.countDocuments();
		const totalReplies = await Comment.countDocuments({ parentId: { $ne: null } });
		const totalRootComments = totalComments - totalReplies;

		// Comments trong 7 ngày qua
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		const recentComments = await Comment.countDocuments({ 
			createdAt: { $gte: sevenDaysAgo } 
		});

		// Top users có nhiều comments nhất
		const topCommenters = await Comment.aggregate([
			{
				$group: {
					_id: '$authorId',
					count: { $sum: 1 }
				}
			},
			{ $sort: { count: -1 } },
			{ $limit: 10 },
			{
				$lookup: {
					from: 'users',
					localField: '_id',
					foreignField: '_id',
					as: 'user'
				}
			},
			{ $unwind: '$user' },
			{
				$project: {
					userId: '$_id',
					username: '$user.username',
					displayName: '$user.displayName',
					avatarUrl: '$user.avatarUrl',
					commentsCount: '$count'
				}
			}
		]);

		// Comments theo tháng (12 tháng gần nhất)
		const twelveMonthsAgo = new Date();
		twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
		
		const commentsByMonth = await Comment.aggregate([
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
				totalComments,
				totalRootComments,
				totalReplies,
				recentComments,
				topCommenters,
				commentsByMonth
			}
		});
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};
