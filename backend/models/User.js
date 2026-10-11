const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 255 },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'faculty', 'hod', 'od_checker'], required: true },
    registerNo: { type: String, default: '' },
    department: { type: String, default: '' },
    year: { type: String, default: '' },
    phone: { type: String, default: '' },
    parentPhone: { type: String, default: '' },
    accommodation: { type: String, default: '' },
    vertical: { type: String, default: '' },
    address: { type: String, default: '' },
    guardianName: { type: String, default: '' },
    guardianPhone: { type: String, default: '' },
    subject: { type: String, default: '' },
    leaveBalance: { type: Number, default: 12 },
    proctees: [{ type: String }],
    students: [{ type: String }],
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    refreshToken: { type: String, default: null },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
}, { timestamps: true });

userSchema.index({ email: 1, role: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
