const Comment = require('../models/Comment');
const Attachment = require('../models/Attachment');

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
					mime: file.mimetype,
					size: file.size,
					storageUrl: `${backendUrl}/uploads/${file.filename}`
				});
				await attachment.save();
				return attachment._id;
			}));
		}
		const comment = await Comment.create({
			postId,
			authorId,
			content : content || '',
			parentId: parentId || null,
			attachments: attachmentIds
		});

		// Cập nhật số bình luận cho Post
		const Post = require('../models/Post');
		await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

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
		res.status(201).json({ success: true, comment });
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};
