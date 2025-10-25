const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // người nhận thông báo
  type: { type: String, enum: ['comment', 'like', 'mention', 'system'], required: true }, // loại thông báo
  data: { type: Object }, // dữ liệu thông báo
  read: { type: Boolean, default: false } // đã đọc
}, { timestamps: true });

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 }); // chỉ mục để truy vấn thông báo theo người dùng, trạng thái đọc và thời gian tạo

module.exports = mongoose.model('Notification', NotificationSchema);