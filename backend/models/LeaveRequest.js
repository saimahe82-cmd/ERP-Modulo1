const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true, lowercase: true },
    requesterRole: { type: String, enum: ['student', 'faculty'], default: 'student' },
    registerNo: { type: String, default: '' },
    type: { type: String, default: 'Leave Request' },
    leaveType: { type: String, default: 'personal' },
    fromDate: { type: String },
    toDate: { type: String },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    proctorEmail: { type: String, default: null },
    classFacultyEmail: { type: String, default: null },
    proctorStatus: { type: String, default: 'pending' },
    classFacultyStatus: { type: String, default: 'pending' },
    hodStatus: { type: String, default: 'pending' },
    facultyStatus: { type: String, default: 'pending' },
    checkerStatus: { type: String, default: 'not_required' },
    odType: { type: String, default: null },
    odTypeLabel: { type: String, default: null },
    paperTitle: { type: String, default: null },
    teamMembers: { type: String, default: null },
    file: { type: String, default: null },
    eventName: { type: String, default: null },
    collegeName: { type: String, default: null },
    activityType: { type: String, default: null },
    title: { type: String, default: null },
    domain: { type: String, default: null },
    abstract: { type: String, default: null },
    document: { type: String, default: null },
    alterations: [{ type: mongoose.Schema.Types.Mixed }],
    medicalCertificate: { type: String, default: null },
    medicalCertificateUploadedAt: { type: String, default: null },
    odProof: { type: String, default: null },
    odProofLocation: { type: String, default: null },
    odProofUploadedAt: { type: String, default: null },
    odCertificate: { type: String, default: null },
    odPrize: { type: String, default: null },
    appliedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
}, { timestamps: true });

leaveRequestSchema.index({ studentEmail: 1, status: 1 });
leaveRequestSchema.index({ studentEmail: 1, appliedAt: -1 });
leaveRequestSchema.index({ status: 1 });
leaveRequestSchema.index({ proctorEmail: 1 });
leaveRequestSchema.index({ classFacultyEmail: 1 });
leaveRequestSchema.index({ appliedAt: -1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
