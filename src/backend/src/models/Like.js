const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // người thích
  targetType: { type: String, enum: ['post', 'comment'], required: true }, // loại đối tượng
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true }, // id đối tượng
  type: { type: String, enum: ['like', 'dislike'], default: 'like' } // loại thích hay không thích
}, { timestamps: true });

LikeSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true }); // mỗi người dùng chỉ được thích hoặc không thích một lần trên mỗi đối tượng

module.exports = mongoose.model('Like', LikeSchema);