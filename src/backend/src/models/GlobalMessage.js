const mongoose = require('mongoose');

const globalMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    default: ''
  },
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attachment'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
globalMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('GlobalMessage', globalMessageSchema);
