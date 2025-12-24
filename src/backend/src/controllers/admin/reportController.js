const Report = require('../../models/Report');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');

// ==================== ADMIN FUNCTIONS ====================

// [ADMIN] Lấy tất cả báo cáo với phân trang và lọc
exports.getAllReportsAdmin = async (req, res) => {
	try {
		const { 
				page = 1, 
				limit = 20, 
				status,
				targetType,
				keyword,
				sortBy = 'createdAt',
				order = 'desc'
			} = req.query;

		const query = {};

		// Lọc theo status
		if (status) query.status = status;

		// Lọc theo targetType
		if (targetType) query.targetType = targetType;

		const pageNum = Math.max(parseInt(page, 10) || 1, 1);
		const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
		const skip = (pageNum - 1) * limitNum;

		// Whitelist sort fields to prevent invalid keys
		const allowedSortFields = new Set(['createdAt', 'status', 'targetType']);
		const sortField = allowedSortFields.has(String(sortBy)) ? String(sortBy) : 'createdAt';
		const sortOrder = String(order).toLowerCase() === 'asc' ? 1 : -1;

		// Áp dụng keyword server-side: tìm theo reason hoặc theo nội dung đối tượng
		if (keyword && String(keyword).trim().length > 0) {
			const kw = String(keyword).trim();
			const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
			const orConds = [{ reason: regex }];

			// Helper: push condition by type when ids found
			const pushTypeConds = (type, ids) => {
				if (ids && ids.length > 0) {
					orConds.push({ targetType: type, targetId: { $in: ids } });
				}
			};

			if (!targetType || targetType === 'post') {
				const postIds = await Post.find({
					$or: [{ title: regex }, { content: regex }]
				}).select('_id').lean();
				pushTypeConds('post', postIds.map(p => p._id));
			}

			if (!targetType || targetType === 'comment') {
				const commentIds = await Comment.find({ content: regex }).select('_id').lean();
				pushTypeConds('comment', commentIds.map(c => c._id));
			}

			if (!targetType || targetType === 'user') {
				const userIds = await User.find({
					$or: [
						{ username: regex },
						{ displayName: regex },
						{ email: regex }
					]
				}).select('_id').lean();
				pushTypeConds('user', userIds.map(u => u._id));
			}

			// Nếu không có điều kiện nào khớp keyword, đảm bảo trả về rỗng
			if (orConds.length === 0) {
				query._id = { $in: [] };
			} else {
				query.$or = orConds;
			}
		}

		// Query song song reports và total theo query cuối cùng
		const [reports, total] = await Promise.all([
			Report.find(query)
				.populate('reporterId', 'username displayName avatarUrl email')
				.populate('handledBy', 'username displayName avatarUrl')
				.skip(skip)
				.limit(limitNum)
				.sort({ [sortField]: sortOrder })
				.lean(),
			Report.countDocuments(query)
		]);

		// Populate target info (không lọc thêm ở đây để giữ đúng phân trang)
		const reportsWithTargets = await Promise.all(
			reports.map(async (report) => {
				let targetInfo = null;
				if (report.targetType === 'post') {
					targetInfo = await Post.findById(report.targetId)
						.select('title slug content authorId')
						.populate('authorId', 'username displayName avatarUrl')
						.lean();
				} else if (report.targetType === 'comment') {
					targetInfo = await Comment.findById(report.targetId)
						.select('content postId authorId')
						.populate('authorId', 'username displayName avatarUrl')
						.populate('postId', 'title slug')
						.lean();
				} else if (report.targetType === 'user') {
					targetInfo = await User.findById(report.targetId)
						.select('username displayName avatarUrl email')
						.lean();
				}
				return { ...report, targetInfo };
			})
		);

		res.json({
			success: true,
			data: reportsWithTargets,
			pagination: {
				page: pageNum,
				limit: limitNum,
				total,
				pages: Math.ceil(total / limitNum)
			}
		});
	} catch (err) {
		console.error('Error in getAllReportsAdmin:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Cập nhật trạng thái báo cáo
exports.updateReportStatusAdmin = async (req, res) => {
	try {
		const reportId = req.params.id;
		const { status, action } = req.body;
		const handledBy = req.user._id;

		// Validate status
		if (!['open', 'reviewed', 'closed'].includes(status)) {
			return res.status(400).json({ 
				success: false, 
				error: 'Status phải là open, reviewed hoặc closed' 
			});
		}

		const report = await Report.findById(reportId);
		if (!report) {
			return res.status(404).json({ 
				success: false, 
				error: 'Báo cáo không tồn tại' 
			});
		}

		// Cập nhật status
		report.status = status;
		report.handledBy = handledBy;
		await report.save();

		// Thực hiện action nếu có
		let actionResult = null;
		if (action) {
			if (action === 'delete_content') {
				// Xóa nội dung bị báo cáo
				if (report.targetType === 'post') {
					await Post.findByIdAndUpdate(report.targetId, { isDeleted: true });
					actionResult = 'Đã xóa bài viết';
				} else if (report.targetType === 'comment') {
					await Comment.findByIdAndUpdate(report.targetId, { isDeleted: true });
					actionResult = 'Đã xóa bình luận';
				}
			} else if (action === 'ban_user') {
				// Ban user bị báo cáo
				let userId = null;
				if (report.targetType === 'user') {
					userId = report.targetId;
				} else if (report.targetType === 'post') {
					const post = await Post.findById(report.targetId);
					userId = post?.authorId;
				} else if (report.targetType === 'comment') {
					const comment = await Comment.findById(report.targetId);
					userId = comment?.authorId;
				}

				if (userId) {
					await User.findByIdAndUpdate(userId, { 
						isBanned: true,
						bannedReason: `Vi phạm quy định: ${report.reason}`
					});
					actionResult = 'Đã ban user';
				}
			} else if (action === 'warn_user') {
				// Gửi cảnh báo cho user
				let userId = null;
				if (report.targetType === 'user') {
					userId = report.targetId;
				} else if (report.targetType === 'post') {
					const post = await Post.findById(report.targetId);
					userId = post?.authorId;
				} else if (report.targetType === 'comment') {
					const comment = await Comment.findById(report.targetId);
					userId = comment?.authorId;
				}

				if (userId) {
					const { createNotification } = require('../../utils/notificationService');
					await createNotification({
						userId,
						type: 'system',
						data: {
							message: `Cảnh báo: ${report.reason}`,
							reportId: report._id
						}
					});
					actionResult = 'Đã gửi cảnh báo';
				}
			}
		}

		// Populate để trả về
		await report.populate('reporterId', 'username displayName avatarUrl');
		await report.populate('handledBy', 'username displayName avatarUrl');

		res.json({ 
			success: true, 
			message: `Đã cập nhật trạng thái báo cáo${actionResult ? '. ' + actionResult : ''}`,
			report 
		});
	} catch (err) {
		console.error('Error in updateReportStatusAdmin:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Xóa báo cáo
exports.deleteReportAdmin = async (req, res) => {
	try {
		const reportId = req.params.id;

		const report = await Report.findByIdAndDelete(reportId);
		if (!report) {
			return res.status(404).json({ 
				success: false, 
				error: 'Báo cáo không tồn tại' 
			});
		}

		res.json({ 
			success: true, 
			message: 'Đã xóa báo cáo' 
		});
	} catch (err) {
		console.error('Error in deleteReportAdmin:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Xóa nhiều báo cáo cùng lúc
exports.deleteMultipleReportsAdmin = async (req, res) => {
	try {
		const { ids } = req.body;

		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return res.status(400).json({ 
				success: false, 
				error: 'Vui lòng cung cấp danh sách ID' 
			});
		}

		const result = await Report.deleteMany({ _id: { $in: ids } });

		res.json({ 
			success: true, 
			message: `Đã xóa ${result.deletedCount} báo cáo`,
			deletedCount: result.deletedCount
		});
	} catch (err) {
		console.error('Error in deleteMultipleReportsAdmin:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Xử lý hàng loạt báo cáo
exports.bulkHandleReportsAdmin = async (req, res) => {
	try {
		const { ids, status, action } = req.body;
		const handledBy = req.user._id;

		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return res.status(400).json({ 
				success: false, 
				error: 'Vui lòng cung cấp danh sách ID' 
			});
		}

		if (!['open', 'reviewed', 'closed'].includes(status)) {
			return res.status(400).json({ 
				success: false, 
				error: 'Status phải là open, reviewed hoặc closed' 
			});
		}

		// Cập nhật tất cả reports
		await Report.updateMany(
			{ _id: { $in: ids } },
			{ status, handledBy }
		);

		// Thực hiện action nếu có
		let actionResults = [];
		if (action) {
			const reports = await Report.find({ _id: { $in: ids } }).lean();

			for (const report of reports) {
				if (action === 'delete_content') {
					if (report.targetType === 'post') {
						await Post.findByIdAndUpdate(report.targetId, { isDeleted: true });
						actionResults.push('post');
					} else if (report.targetType === 'comment') {
						await Comment.findByIdAndUpdate(report.targetId, { isDeleted: true });
						actionResults.push('comment');
					}
				} else if (action === 'ban_user') {
					let userId = null;
					if (report.targetType === 'user') {
						userId = report.targetId;
					} else if (report.targetType === 'post') {
						const post = await Post.findById(report.targetId);
						userId = post?.authorId;
					} else if (report.targetType === 'comment') {
						const comment = await Comment.findById(report.targetId);
						userId = comment?.authorId;
					}

					if (userId) {
						await User.findByIdAndUpdate(userId, { 
							isBanned: true,
							bannedReason: 'Vi phạm quy định nhiều lần'
						});
						actionResults.push('user_banned');
					}
				}
			}
		}

		res.json({ 
			success: true, 
			message: `Đã xử lý ${ids.length} báo cáo`,
			processedCount: ids.length,
			actionResults: actionResults.length > 0 ? actionResults : null
		});
	} catch (err) {
		console.error('Error in bulkHandleReportsAdmin:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Thống kê báo cáo
exports.getReportsStatsAdmin = async (req, res) => {
	try {
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		// Query tất cả stats song song
		const [
			totalReports,
			openReports,
			reviewedReports,
			closedReports,
			recentReports,
			reportsByType,
			reportsByMonth,
			topReportedContent
		] = await Promise.all([
			Report.countDocuments(),
			Report.countDocuments({ status: 'open' }),
			Report.countDocuments({ status: 'reviewed' }),
			Report.countDocuments({ status: 'closed' }),
			Report.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
			Report.aggregate([
				{
					$group: {
						_id: '$targetType',
						count: { $sum: 1 }
					}
				}
			]),
			Report.aggregate([
				{ $match: { createdAt: { $gte: thirtyDaysAgo } } },
				{
					$group: {
						_id: {
							year: { $year: '$createdAt' },
							month: { $month: '$createdAt' },
							day: { $dayOfMonth: '$createdAt' }
						},
						count: { $sum: 1 }
					}
				},
				{ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
			]),
			Report.aggregate([
				{
					$group: {
						_id: { targetType: '$targetType', targetId: '$targetId' },
						count: { $sum: 1 }
					}
				},
				{ $sort: { count: -1 } },
				{ $limit: 10 }
			])
		]);

		// Populate top reported content
		const topReportedWithDetails = await Promise.all(
			topReportedContent.map(async (item) => {
				let details = null;
				if (item._id.targetType === 'post') {
					details = await Post.findById(item._id.targetId)
						.select('title slug authorId')
						.populate('authorId', 'username displayName')
						.lean();
				} else if (item._id.targetType === 'comment') {
					details = await Comment.findById(item._id.targetId)
						.select('content authorId postId')
						.populate('authorId', 'username displayName')
						.lean();
				} else if (item._id.targetType === 'user') {
					details = await User.findById(item._id.targetId)
						.select('username displayName avatarUrl')
						.lean();
				}
				return {
					targetType: item._id.targetType,
					targetId: item._id.targetId,
					reportCount: item.count,
					details
				};
			})
		);

		res.json({
			success: true,
			stats: {
				totalReports,
				byStatus: {
					open: openReports,
					reviewed: reviewedReports,
					closed: closedReports
				},
				recentReports,
				reportsByType,
				reportsByMonth,
				topReportedContent: topReportedWithDetails
			}
		});
	} catch (err) {
		console.error('Error in getReportsStatsAdmin:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Lấy báo cáo theo target (xem tất cả báo cáo của một post/comment/user)
exports.getReportsByTargetAdmin = async (req, res) => {
	try {
		const { targetType, targetId } = req.params;

		if (!['post', 'comment', 'user'].includes(targetType)) {
			return res.status(400).json({ 
				success: false, 
				error: 'targetType phải là post, comment hoặc user' 
			});
		}

		const reports = await Report.find({ targetType, targetId })
			.populate('reporterId', 'username displayName avatarUrl email')
			.populate('handledBy', 'username displayName avatarUrl')
			.sort({ createdAt: -1 })
			.lean();

		// Get target info
		let targetInfo = null;
		if (targetType === 'post') {
			targetInfo = await Post.findById(targetId)
				.populate('authorId', 'username displayName avatarUrl')
				.populate('categoryId', 'title slug')
				.lean();
		} else if (targetType === 'comment') {
			targetInfo = await Comment.findById(targetId)
				.populate('authorId', 'username displayName avatarUrl')
				.populate('postId', 'title slug')
				.lean();
		} else if (targetType === 'user') {
			targetInfo = await User.findById(targetId)
				.select('-password')
				.lean();
		}

		res.json({
			success: true,
			reports,
			targetInfo,
			totalReports: reports.length
		});
	} catch (err) {
		console.error('Error in getReportsByTargetAdmin:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};
