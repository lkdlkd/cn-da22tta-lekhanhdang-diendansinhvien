const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  slug: { type: String, unique: true, required: true }, // đường dẫn
  title: { type: String, required: true }, // tiêu đề
  description: { type: String }, // mô tả
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null }, // danh mục cha
  order: { type: Number, default: 0 } // thứ tự hiển thị
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);