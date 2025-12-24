const Comment = require('../../models/Comment');
const Attachment = require('../../models/Attachment');
const Like = require('../../models/Like');

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
		const limitNum = parseInt(limit);

		// Query song song comments và total
		const [comments, total] = await Promise.all([
			Comment.find(query)
				.populate('authorId', 'username displayName avatarUrl email')
				.populate('postId', 'title slug')
				.populate('attachments')
				.skip(skip)
				.limit(limitNum)
				.sort({ [sortBy]: sortOrder })
				.lean(),
			Comment.countDocuments(query)
		]);

		// Lấy stats cho tất cả comments trong 1 aggregation
		const commentIds = comments.map(c => c._id);
		const [likesStats, repliesStats] = await Promise.all([
			Like.aggregate([
				{ $match: { targetType: 'comment', targetId: { $in: commentIds } } },
				{ $group: { _id: '$targetId', count: { $sum: 1 } } }
			]),
			Comment.aggregate([
				{ $match: { parentId: { $in: commentIds } } },
				{ $group: { _id: '$parentId', count: { $sum: 1 } } }
			])
		]);

		// Tạo maps cho O(1) lookup
		const likesMap = new Map(likesStats.map(s => [String(s._id), s.count]));
		const repliesMap = new Map(repliesStats.map(s => [String(s._id), s.count]));

		// Gắn stats vào comments
		const commentsWithStats = comments.map(comment => ({
			...comment,
			likesCount: likesMap.get(String(comment._id)) || 0,
			repliesCount: repliesMap.get(String(comment._id)) || 0
		}));

		res.json({
			success: true,
			data: commentsWithStats,
			pagination: {
				page: parseInt(page),
				limit: limitNum,
				total,
				pages: Math.ceil(total / limitNum)
			}
		});
	} catch (err) {
		console.error('Error in getAllCommentsAdmin:', err);
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
		const Post = require('../../models/Post');
		await Post.findByIdAndUpdate(comment.postId, { 
			$inc: { commentsCount: -(1 + replies.length) } 
		});

		// Cập nhật user stats
		const User = require('../../models/User');
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
		const postUpdates = {};
		const userUpdates = {};

		// Lấy tất cả comments cần xóa
		const comments = await Comment.find({ _id: { $in: ids } }).lean();

		if (comments.length === 0) {
			return res.json({ 
				success: true, 
				message: 'Không có comment nào để xóa',
				deletedCount: 0
			});
		}

		// Tính toán replies và thu thập dữ liệu cần xóa
		const allCommentIds = [...ids];
		for (const comment of comments) {
			const replies = await Comment.find({ parentId: comment._id }).lean();
			allCommentIds.push(...replies.map(r => r._id));
			
			const postId = String(comment.postId);
			const userId = String(comment.authorId);
			
			postUpdates[postId] = (postUpdates[postId] || 0) + (1 + replies.length);
			userUpdates[userId] = (userUpdates[userId] || 0) + (1 + replies.length);
		}

		// Xóa song song: attachments, likes, comments
		await Promise.all([
			Attachment.deleteMany({ 
				_id: { 
					$in: (await Comment.find({ _id: { $in: allCommentIds } })
						.distinct('attachments'))
				} 
			}),
			Like.deleteMany({ 
				targetType: 'comment', 
				targetId: { $in: allCommentIds } 
			}),
			Comment.deleteMany({ _id: { $in: allCommentIds } })
		]);

		totalDeleted = allCommentIds.length;

		// Cập nhật posts và users song song
		const Post = require('../../models/Post');
		const User = require('../../models/User');
		
		await Promise.all([
			...Object.entries(postUpdates).map(([postId, count]) =>
				Post.findByIdAndUpdate(postId, { $inc: { commentsCount: -count } })
			),
			...Object.entries(userUpdates).map(([userId, count]) =>
				User.findByIdAndUpdate(userId, { $inc: { "stats.commentsCount": -count } })
			)
		]);

		res.json({ 
			success: true, 
			message: `Đã xóa ${totalDeleted} comments`,
			deletedCount: totalDeleted
		});
	} catch (err) {
		console.error('Error in deleteMultipleCommentsAdmin:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Thống kê comments
exports.getCommentsStats = async (req, res) => {
	try {
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		
		const twelveMonthsAgo = new Date();
		twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

		// Query tất cả stats song song
		const [
			totalComments,
			totalReplies,
			recentComments,
			topCommenters,
			commentsByMonth
		] = await Promise.all([
			Comment.countDocuments(),
			Comment.countDocuments({ parentId: { $ne: null } }),
			Comment.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
			Comment.aggregate([
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
			]),
			Comment.aggregate([
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

		const totalRootComments = totalComments - totalReplies;

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
		console.error('Error in getCommentsStats:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

module.exports = exports;
