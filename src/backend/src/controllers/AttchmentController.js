const path = require('path');
const fs = require('fs');
const Attachment = require('../models/Attachment');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { isValidObjectId } = require('mongoose');

// Document category definitions
const CATEGORY_DEFS = {
	pdf: {
		key: 'pdf',
		label: 'PDF',
		mime: [/^application\/pdf$/i],
		ext: ['pdf']
	},
	word: {
		key: 'word',
		label: 'Word',
		mime: [/msword/i, /vnd\.openxmlformats-officedocument\.wordprocessingml\.document/i],
		ext: ['doc', 'docx']
	},
	excel: {
		key: 'excel',
		label: 'Excel',
		mime: [/vnd\.ms-excel/i, /vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i, /text\/csv/i],
		ext: ['xls', 'xlsx', 'csv']
	},
	ppt: {
		key: 'ppt',
		label: 'PowerPoint',
		mime: [/vnd\.ms-powerpoint/i, /vnd\.openxmlformats-officedocument\.presentationml\.presentation/i],
		ext: ['ppt', 'pptx']
	},
	text: {
		key: 'text',
		label: 'Text',
		mime: [/^text\/plain$/i],
		ext: ['txt', 'md']
	},
	image: {
		key: 'image',
		label: 'Ảnh',
		mime: [/^image\//i],
		ext: ['jpg','jpeg','png','gif','webp','bmp','svg']
	},
	archive: {
		key: 'archive',
		label: 'Lưu trữ',
		mime: [/zip/i, /x-7z/i, /x-rar/i, /gzip/i, /x-tar/i],
		ext: ['zip', '7z', 'rar', 'gz', 'tar']
	},
	other: {
		key: 'other',
		label: 'Khác',
		mime: [],
		ext: []
	}
};

const DOC_CATEGORY_ORDER = ['pdf', 'word', 'excel', 'ppt', 'text', 'image', 'archive', 'other'];

const getExt = (filename = '') => {
	const ext = path.extname(filename || '').toLowerCase().replace(/^\./, '');
	return ext;
};

const matchCategoryKey = (mime = '', filename = '') => {
	const ext = getExt(filename);
	// Try exact categories first
	for (const key of DOC_CATEGORY_ORDER) {
		const def = CATEGORY_DEFS[key];
		if (!def) continue;
		const mimeMatched = Array.isArray(def.mime) && def.mime.some((re) => re.test(mime || ''));
		const extMatched = Array.isArray(def.ext) && def.ext.includes(ext);
		if (mimeMatched || extMatched) {
			return key;
		}
	}
	return 'other';
};

const isDocumentLike = (mime = '', filename = '') => {
	const m = String(mime || '').toLowerCase();
	// Include images; still exclude video/audio from library
	if (m.startsWith('video/') || m.startsWith('audio/')) return false;
	// Consider common document mimes, text/plain, images, or recognized extensions
	const ext = getExt(filename);
	const knownExts = new Set(['pdf','doc','docx','xls','xlsx','csv','ppt','pptx','txt','md','zip','7z','rar','gz','tar','jpg','jpeg','png','gif','webp','bmp','svg']);
	return m.startsWith('application/') || m === 'text/plain' || m.startsWith('image/') || knownExts.has(ext);
};

// Helpers to work with physical uploads folder that posts/comments saved
const uploadsRoot = path.join(__dirname, '../uploads');

const storageUrlToLocalPath = (storageUrl = '') => {
	if (!storageUrl) return null;
	// remove domain if full URL
	let urlPath = String(storageUrl).replace(/^https?:\/\/[^/]+/i, '');
	// ensure starts with /uploads or is relative filename
	if (urlPath.startsWith('/uploads/')) {
		urlPath = urlPath.replace(/^\/uploads\//, '');
	}
	return path.join(uploadsRoot, urlPath);
};

const fileExistsForAttachment = (att) => {
	try {
		const localPath = storageUrlToLocalPath(att.storageUrl || att.filename);
		if (!localPath) return false;
		return fs.existsSync(localPath);
	} catch {
		return false;
	}
};

const getReferencedAttachmentIds = async () => {
	const [postIds, commentIds] = await Promise.all([
		Post.distinct('attachments'),
		Comment.distinct('attachments')
	]);
	// Merge unique ids
	const set = new Set();
	postIds.forEach(id => id && set.add(String(id)));
	commentIds.forEach(id => id && set.add(String(id)));
	return Array.from(set);
};

// GET /documents/categories
exports.getDocumentCategories = async (req, res) => {
		try {
			const refIds = await getReferencedAttachmentIds();
			if (refIds.length === 0) {
				const categories = DOC_CATEGORY_ORDER.map((key) => ({ key, label: CATEGORY_DEFS[key].label, count: 0 }));
				return res.json({ success: true, total: 0, categories });
			}

			// Fetch only attachments referenced by posts/comments
			const items = await Attachment.find({ _id: { $in: refIds } }, { filename: 1, mime: 1, storageUrl: 1 }).lean();

			const counts = Object.fromEntries(DOC_CATEGORY_ORDER.map(k => [k, 0]));
			let totalDocs = 0;

			for (const a of items) {
				if (!fileExistsForAttachment(a)) continue;
				if (!isDocumentLike(a.mime, a.filename)) continue;
				const key = matchCategoryKey(a.mime, a.filename);
				counts[key] = (counts[key] || 0) + 1;
				totalDocs += 1;
			}

			const categories = DOC_CATEGORY_ORDER.map((key) => ({
				key,
				label: CATEGORY_DEFS[key].label,
				count: counts[key] || 0
			}));

			res.json({ success: true, total: totalDocs, categories });
		} catch (err) {
		console.error('Error in getDocumentCategories:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// GET /documents
// Query: page, limit, keyword, category
exports.getDocuments = async (req, res) => {
		try {
			const { page = 1, limit = 20, keyword = '', category = '' } = req.query;
			const pageNum = Math.max(parseInt(page, 10) || 1, 1);
			const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
			const skip = (pageNum - 1) * limitNum;

			const refIds = await getReferencedAttachmentIds();
			if (refIds.length === 0) {
				return res.json({ success: true, data: [], pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 } });
			}

			// Base query restricted to referenced attachments
			const baseQuery = { _id: { $in: refIds } };
			if (keyword && String(keyword).trim().length > 0) {
				const kw = String(keyword).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				baseQuery.filename = { $regex: kw, $options: 'i' };
			}

			const projection = { filename: 1, mime: 1, size: 1, storageUrl: 1, ownerId: 1, createdAt: 1 };
			const all = await Attachment.find(baseQuery, projection)
				.populate('ownerId', 'username displayName avatarUrl')
				.sort({ createdAt: -1 })
				.lean();

			// Ensure file exists and is document-like
			let docsOnly = all.filter(a => fileExistsForAttachment(a) && isDocumentLike(a.mime, a.filename));

			// Filter by category if provided
			const catKey = category ? String(category).toLowerCase() : '';
			if (catKey && catKey !== 'all') {
				docsOnly = docsOnly.filter(a => matchCategoryKey(a.mime, a.filename) === catKey);
			}

			const total = docsOnly.length;
			const data = docsOnly.slice(skip, skip + limitNum);

			res.json({
				success: true,
				data,
				pagination: {
					page: pageNum,
					limit: limitNum,
					total,
					pages: Math.ceil(total / limitNum)
				}
			});
		} catch (err) {
		console.error('Error in getDocuments:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

// GET /documents/by-category/:category
exports.getDocumentsByCategory = async (req, res) => {
	req.query.category = req.params.category || '';
	return exports.getDocuments(req, res);
};

// GET /documents/:id
exports.getDocumentDetail = async (req, res) => {
	try {
		const { id } = req.params;
		if (!isValidObjectId(id)) {
			return res.status(400).json({ success: false, error: 'ID không hợp lệ' });
		}
		// Ensure this attachment is referenced by any post/comment
		const refIds = await getReferencedAttachmentIds();
		if (!refIds.includes(String(id))) {
			return res.status(404).json({ success: false, error: 'Tài liệu không tồn tại hoặc không được tham chiếu' });
		}

		const doc = await Attachment.findById(id)
			.populate('ownerId', 'username displayName avatarUrl email')
			.lean();
		if (!doc) {
			return res.status(404).json({ success: false, error: 'Tài liệu không tồn tại' });
		}
		if (!fileExistsForAttachment(doc)) {
			return res.status(404).json({ success: false, error: 'Tệp không tồn tại trên hệ thống' });
		}
		// Provide computed category
		const category = matchCategoryKey(doc.mime, doc.filename);
		res.json({ success: true, document: { ...doc, category } });
	} catch (err) {
		console.error('Error in getDocumentDetail:', err);
		res.status(500).json({ success: false, error: err.message });
	}
};

