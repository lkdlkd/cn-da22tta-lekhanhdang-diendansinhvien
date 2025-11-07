const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // người sở hữu tệp
  filename: { type: String, required: true }, // tên tệp
  mime: { type: String }, // loại MIME
  size: { type: Number }, // kích thước tệp
  storageUrl: { type: String, required: true }, // URL lưu trữ tệp
  driveFileId: { type: String }, // ID tệp trên Cloudinary (public_id)
  resourceType: { type: String, enum: ['image', 'video', 'raw'], default: 'image' } // Loại resource trên Cloudinary
}, { timestamps: true });

module.exports = mongoose.model('Attachment', AttachmentSchema);
