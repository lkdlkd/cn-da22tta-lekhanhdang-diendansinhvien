
const Category = require('../models/Category');

// Lấy tất cả danh mục
exports.getAllCategories = async (req, res) => {
	try {
		const categories = await Category.find();
		res.json(categories);
	} catch (err) {
		res.status(500).json({ error: err.message });
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
		res.status(201).json(category);
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
};

// Cập nhật danh mục
exports.updateCategory = async (req, res) => {
	try {
		const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
		if (!category) return res.status(404).json({ error: 'Category not found' });
		res.json(category);
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
};

// Xóa danh mục
exports.deleteCategory = async (req, res) => {
	try {
		const category = await Category.findByIdAndDelete(req.params.id);
		if (!category) return res.status(404).json({ error: 'Category not found' });
		res.json({ message: 'Category deleted' });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Lấy bài viết theo danh mục
exports.getPostsByCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const posts = await Post.find({ categoryId }).populate('authorId categoryId');
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};