const Post = require('../../models/Post');
const User = require('../../models/User');
const Category = require('../../models/Category');
const Attachment = require('../../models/Attachment');
const Like = require('../../models/Like');
const comment = require('../../models/Comment');
const fs = require('fs');
const path = require('path');
const { deleteFromDrive } = require('../../utils/fileUpload');

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
					{
						authorId: await User.find({
							$or: [
								{ username: { $regex: kw, $options: 'i' } },
								{ displayName: { $regex: kw, $options: 'i' } }
							]
						}).distinct('_id')
					}

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
			? await Attachment.find({ _id: { $in: allAttachmentIds } }).select('filename storageUrl driveFileId resourceType').lean()
			: [];

		// 4) Xoá file vật lý của toàn bộ attachments (post + comment) từ Cloudinary
		for (const att of attachmentsToDelete) {
			try {
				if (att.driveFileId) {
					await deleteFromDrive(att.driveFileId, att.resourceType);
					console.log(`✅ Đã xóa file từ Cloudinary [${att.resourceType}]: ${att.filename}`);
				} else {
					console.log(`⚠️ File không có driveFileId: ${att.filename}`);
				}
			} catch (err) {
				console.error(`❌ Lỗi xóa file từ Cloudinary:`, err);
			}
		}

		// 5) Xoá likes của posts và comments, thông báo liên quan, attachments (DB), comments và cuối cùng posts
		const Notification = require('../../models/Notification');

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

		// Lọc theo trạng thái duyệt
		if (['pending', 'approved', 'rejected'].includes(moderationStatus)) {
			query.moderationStatus = moderationStatus;
		}

		// Tìm kiếm theo keyword
		if (keyword) {
			const keywordStr = String(keyword).trim();
			if (keywordStr) {
				query.$or = [
					{ title: { $regex: keywordStr, $options: 'i' } },
					{ content: { $regex: keywordStr, $options: 'i' } }
				];
			}
		}

		// Lọc theo category
		if (categoryId) {
			query.categoryId = categoryId;
		}

		const skip = (parseInt(page) - 1) * parseInt(limit);
		const sortOrder = order === 'desc' ? -1 : 1;
		const limitNum = parseInt(limit);

		// Query với phân trang
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

		await post.populate('authorId', 'username displayName avatarUrl faculty class');
		await post.populate('categoryId', 'title slug');
		await post.populate('attachments');

		// Gửi thông báo cho tác giả
		const { createNotification } = require('../../utils/notificationService');
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
		const { createNotification } = require('../../utils/notificationService');
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

module.exports = exports;
