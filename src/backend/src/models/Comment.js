const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true }, // bài viết
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // người viết
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }, // bình luận cha
  content: { type: String, required: true }, // nội dung
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attachment' }], // tệp đính kèm
  likes: { type: Number, default: 0 }, // số lượt thích
  isDeleted: { type: Boolean, default: false } // đã xóa
}, { timestamps: true });

CommentSchema.index({ postId: 1, createdAt: 1 }); // chỉ mục để truy vấn bình luận theo bài viết và thời gian tạo

module.exports = mongoose.model('Comment', CommentSchema);