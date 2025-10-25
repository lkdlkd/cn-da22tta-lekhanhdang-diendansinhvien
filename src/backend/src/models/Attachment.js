const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // người sở hữu tệp
  filename: { type: String, required: true }, // tên tệp
  mime: { type: String }, // loại MIME
  size: { type: Number }, // kích thước tệp
  storageUrl: { type: String, required: true } // URL lưu trữ tệp
}, { timestamps: true });

module.exports = mongoose.model('Attachment', AttachmentSchema);
