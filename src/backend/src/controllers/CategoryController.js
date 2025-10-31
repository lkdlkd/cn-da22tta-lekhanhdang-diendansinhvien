
const Category = require('../models/Category');
const Post = require('../models/Post');

// Lấy tất cả danh mục
exports.getAllCategories = async (req, res) => {
	try {
		const categories = await Category.find();
		res.json(categories);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// [ADMIN] Lấy tất cả danh mục với thống kê
exports.getAllCategoriesWithStats = async (req, res) => {
	try {
		const categories = await Category.find().lean();
		
		// Thêm thống kê số lượng bài viết cho mỗi category
		const categoriesWithStats = await Promise.all(
			categories.map(async (category) => {
				const postCount = await Post.countDocuments({ categoryId: category._id });
				return {
					...category,
					postCount
				};
			})
		);

		res.json({
			success: true,
			data: categoriesWithStats,
			total: categoriesWithStats.length
		});
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// Lấy danh mục theo id
exports.getCategoryById = async (req, res) => {
	try {
		const category = await Category.findById(req.params.id);
		if (!category) return res.status(404).json({ error: 'Category not found' });
		res.json(category);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Tạo danh mục mới
exports.createCategory = async (req, res) => {
	try {
		const category = new Category(req.body);
		await category.save();
		res.status(201).json({ success: true, data: category });
	} catch (err) {
		res.status(400).json({ success: false, error: err.message });
	}
};

// Cập nhật danh mục
exports.updateCategory = async (req, res) => {
	try {
		const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
		if (!category) return res.status(404).json({ success: false, error: 'Category not found' });
		res.json({ success: true, data: category });
	} catch (err) {
		res.status(400).json({ success: false, error: err.message });
	}
};

// Xóa danh mục
exports.deleteCategory = async (req, res) => {
	try {
		const category = await Category.findByIdAndDelete(req.params.id);
		if (!category) return res.status(404).json({ success: false, error: 'Category not found' });
		res.json({ success: true, message: 'Category deleted' });
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Xóa nhiều danh mục cùng lúc
exports.deleteMultipleCategories = async (req, res) => {
	try {
		const { ids } = req.body;
		
		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return res.status(400).json({ 
				success: false, 
				error: 'Vui lòng cung cấp danh sách ID' 
			});
		}

		// Kiểm tra xem có bài viết nào đang dùng categories này không
		const postsUsingCategories = await Post.countDocuments({ 
			categoryId: { $in: ids } 
		});

		if (postsUsingCategories > 0) {
			return res.status(400).json({
				success: false,
				error: `Không thể xóa. Có ${postsUsingCategories} bài viết đang sử dụng các danh mục này.`
			});
		}

		const result = await Category.deleteMany({ _id: { $in: ids } });
		
		res.json({ 
			success: true, 
			message: `Đã xóa ${result.deletedCount} danh mục`,
			deletedCount: result.deletedCount
		});
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};

// [ADMIN] Tìm kiếm danh mục
exports.searchCategories = async (req, res) => {
	try {
		const { keyword, page = 1, limit = 20 } = req.query;
		
		const query = {};
		if (keyword) {
			query.$or = [
				{ title: { $regex: keyword, $options: 'i' } },
				{ description: { $regex: keyword, $options: 'i' } },
				{ slug: { $regex: keyword, $options: 'i' } }
			];
		}

		const skip = (page - 1) * limit;
		const categories = await Category.find(query)
			.skip(skip)
			.limit(parseInt(limit))
			.sort({ createdAt: -1 });

		const total = await Category.countDocuments(query);

		res.json({
			success: true,
			data: categories,
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

