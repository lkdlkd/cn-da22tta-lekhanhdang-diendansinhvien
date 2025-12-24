const Category = require('../../models/Category');
const Post = require('../../models/Post');

// Lấy tất cả danh mục
exports.getAllCategories = async (req, res) => {
	try {
		// const categories = await Category.find();

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
		// res.json(categories);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};
