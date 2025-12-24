const Report = require('../../models/Report');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');

// ==================== USER FUNCTIONS ====================

// Tạo báo cáo mới
exports.createReport = async (req, res) => {
	try {
		const { targetType, targetId, reason } = req.body;
		const reporterId = req.user._id;

		// Validate targetType
		if (!['post', 'comment', 'user'].includes(targetType)) {
			return res.status(400).json({ 
				success: false, 
				error: 'targetType phải là post, comment hoặc user' 
			});
		}

		// Validate reason
		if (!reason || reason.trim().length === 0) {
			return res.status(400).json({ 
				success: false, 
				error: 'Vui lòng cung cấp lý do báo cáo' 
			});
		}

		// Kiểm tra target có tồn tại không
		let target;
		if (targetType === 'post') {
			target = await Post.findById(targetId);
		} else if (targetType === 'comment') {
			target = await Comment.findById(targetId);
		} else if (targetType === 'user') {
			target = await User.findById(targetId);
		}

		if (!target) {
			return res.status(404).json({ 
				success: false, 
				error: `${targetType} không tồn tại` 
			});
		}

		// Không cho phép tự báo cáo chính mình
		if (targetType === 'user' && String(targetId) === String(reporterId)) {
			return res.status(400).json({ 
				success: false, 
				error: 'Bạn không thể báo cáo chính mình' 
			});
		}

		// Kiểm tra xem đã báo cáo chưa
		const existingReport = await Report.findOne({
			reporterId,
			targetType,
			targetId,
			status: { $in: ['open', 'reviewed'] }
		});

		if (existingReport) {
			return res.status(400).json({ 
				success: false, 
				error: 'Bạn đã báo cáo nội dung này rồi' 
			});
		}

		// Tạo report mới
		const report = await Report.create({
			reporterId,
			targetType,
			targetId,
			reason: reason.trim()
		});

		// Populate thông tin
		await report.populate('reporterId', 'username displayName avatarUrl');

		res.status(201).json({ 
			success: true, 
			message: 'Đã gửi báo cáo thành công',
			report 
		});
	} catch (err) {
		console.error('Error in createReport:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// Lấy danh sách báo cáo của user (báo cáo mà user đã tạo)
exports.getMyReports = async (req, res) => {
	try {
		const { page = 1, limit = 20, status } = req.query;
		const reporterId = req.user._id;

		const query = { reporterId };
		if (status) query.status = status;

		const pageNum = Math.max(parseInt(page, 10) || 1, 1);
		const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
		const skip = (pageNum - 1) * limitNum;

		const [reports, total] = await Promise.all([
			Report.find(query)
				.populate('reporterId', 'username displayName avatarUrl')
				.populate('handledBy', 'username displayName avatarUrl')
				.skip(skip)
				.limit(limitNum)
				.sort({ createdAt: -1 })
				.lean(),
			Report.countDocuments(query)
		]);

		// Populate target info
		const reportsWithTargets = await Promise.all(
			reports.map(async (report) => {
				let targetInfo = null;
				if (report.targetType === 'post') {
					const post = await Post.findById(report.targetId)
						.select('title slug authorId')
						.populate('authorId', 'username displayName')
						.lean();
					targetInfo = post;
				} else if (report.targetType === 'comment') {
					const comment = await Comment.findById(report.targetId)
						.select('content postId authorId')
						.populate('authorId', 'username displayName')
						.lean();
					targetInfo = comment;
				} else if (report.targetType === 'user') {
					const user = await User.findById(report.targetId)
						.select('username displayName avatarUrl')
						.lean();
					targetInfo = user;
				}
				return {
					...report,
					targetInfo
				};
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
		console.error('Error in getMyReports:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// Hủy báo cáo của mình (chỉ khi chưa được xử lý)
exports.cancelReport = async (req, res) => {
	try {
		const reportId = req.params.id;
		const reporterId = req.user._id;

		const report = await Report.findOne({ 
			_id: reportId, 
			reporterId 
		});

		if (!report) {
			return res.status(404).json({ 
				success: false, 
				error: 'Báo cáo không tồn tại' 
			});
		}

		if (report.status !== 'open') {
			return res.status(400).json({ 
				success: false, 
				error: 'Chỉ có thể hủy báo cáo chưa được xử lý' 
			});
		}

		await Report.findByIdAndDelete(reportId);

		res.json({ 
			success: true, 
			message: 'Đã hủy báo cáo' 
		});
	} catch (err) {
		console.error('Error in cancelReport:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};
