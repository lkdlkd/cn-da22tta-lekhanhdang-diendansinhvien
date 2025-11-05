const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // người tham gia
  messages: [{ 
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // người gửi
    text: { type: String }, // nội dung tin nhắn
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attachment' }], // tệp đính kèm
    createdAt: { type: Date, default: Date.now } // thời gian gửi
  }],
  lastMessageAt: { type: Date, default: Date.now }, // thời gian tin nhắn cuối cùng
  readMarks: { type: Map, of: Object, default: {} } // đánh dấu đã đọc { userId: { userId, lastReadAt } }
}, { timestamps: true }); 

MessageSchema.index({ participants: 1, lastMessageAt: -1 }); // chỉ mục để truy vấn cuộc trò chuyện theo người tham gia và thời gian tin nhắn cuối cùng

module.exports = mongoose.model('Message', MessageSchema);