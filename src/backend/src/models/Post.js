const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  title: { type: String, required: true }, // tiêu đề
  slug: { type: String, unique: true }, // đường dẫn
  content: { type: String, required: true }, // nội dung
  tags: [{ type: String }], // thẻ
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attachment' }], // tệp đính kèm
  pinned: { type: Boolean, default: false }, // ghim
  locked: { type: Boolean, default: false }, // khóa
  views: { type: Number, default: 0 }, // lượt xem
  commentsCount: { type: Number, default: 0 }, // số bình luận
  likesCount: { type: Number, default: 0 }, // số lượt thích
  dislikesCount: { type: Number, default: 0 }, // số lượt không thích
  isDraft: { type: Boolean, default: false }, // bản nháp
  isDeleted: { type: Boolean, default: false } // đã xóa
}, { timestamps: true });

PostSchema.index({ categoryId: 1, pinned: -1, updatedAt: -1 }); // chỉ mục để truy vấn bài viết theo danh mục, ghim và thời gian cập nhật
PostSchema.index({ title: 'text', content: 'text', tags: 'text' }); // chỉ mục tìm kiếm toàn văn

module.exports = mongoose.model('Post', PostSchema);