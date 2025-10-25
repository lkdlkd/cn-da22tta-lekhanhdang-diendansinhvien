const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // người báo cáo
  targetType: { type: String, enum: ['post', 'comment', 'user'], required: true }, // loại đối tượng bị báo cáo
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true }, // id đối tượng bị báo cáo
  reason: { type: String, required: true }, // lý do báo cáo
  status: { type: String, enum: ['open', 'reviewed', 'closed'], default: 'open' }, // trạng thái báo cáo
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // người xử lý báo cáo
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);