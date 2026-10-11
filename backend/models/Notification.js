const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    message: { type: String, required: true, maxlength: 500 },
    type: { type: String, enum: ['info', 'success', 'error', 'warning'], default: 'info' },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 7776000 },
});

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
