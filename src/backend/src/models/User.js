
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  avatarUrl: { type: String, default: 'https://avatar.iran.liara.run/public' },
  driveFileId: { type: String }, // ID file avatar trên Cloudinary
  resourceType: { type: String, enum: ['image', 'video', 'raw'], default: 'image' }, // Loại file
  email: { type: String, unique: true, required: true, trim: true },
  emailVerified: { type: Boolean, default: false },
  emailVerificationCode: { type: String, select: false },
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },
  lastVerificationEmailSentAt: { type: Date, select: false },
  passwordResetCode: { type: String, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  passwordResetRequestedAt: { type: Date, select: false },
  phone: { type: String },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'admin','mod'], default: 'student' },
  displayName: { type: String },
  avatar: { type: String },
  faculty: { type: String },
  class: { type: String },
  bio: { type: String, default: '' },
  stats: {
    postsCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    likesReceived: { type: Number, default: 0 }
  },
  settings: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true }
  },
  isBanned: { type: Boolean, default: false },
  bannedUntil: { type: Date, default: null },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  socketId: { type: String, default: null }

}, { timestamps: true });

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);