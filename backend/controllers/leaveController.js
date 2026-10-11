const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const fs = require('fs');
const path = require('path');

function computeStatus(r) {
    const isRejected = r.proctorStatus === 'rejected' ||
        r.classFacultyStatus === 'rejected' ||
        r.hodStatus === 'rejected' ||
        r.facultyStatus === 'rejected';
    const isApproved = r.hodStatus === 'approved';
    if (isRejected) return 'rejected';
    if (isApproved) return 'approved';
    return 'pending';
}

function getPagination(req) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    return { page, limit, skip: (page - 1) * limit };
}

function auditLog(action, requestId, userEmail, details) {
    console.log(`[AUDIT] ${new Date().toISOString()} | Action: ${action} | Request: ${RequestId} | User: ${userEmail} | Details: ${details || 'none'}`);
}

exports.addRequest = async (req, res) => {
    try {
        const data = req.body;
        const user = req.user;

        if (!data.studentName || !data.studentEmail) {
            return res.status(400).json({ success: false, message: 'Student name and email are required.' });
        }
        if (!data.fromDate || !data.toDate) {
            return res.status(400).json({ success: false, message: 'From date and to date are required.' });
        }
        if (new Date(data.fromDate) > new Date(data.toDate)) {
            return res.status(400).json({ success: false, message: 'From date cannot be after to date.' });
        }

        const sanitize = (str) => (typeof str === 'string' ? str.trim() : str);

        const studentEmail = sanitize(data.studentEmail || user.email || '').toLowerCase();

        const proctor = await User.findOne({
            role: 'faculty',
            proctees: { $elemMatch: { $regex: new RegExp(`^${studentEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
        });
        const classFaculty = await User.findOne({
            role: 'faculty',
            students: { $elemMatch: { $regex: new RegExp(`^${studentEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
        });

        const isEvent = (data.odType || data.odTypeLabel || '').toLowerCase().includes('event');

        const newReq = await LeaveRequest.create({
            studentName: sanitize(data.studentName || user.name),
            studentEmail: studentEmail,
            requesterRole: user.role === 'faculty' ? 'faculty' : 'student',
            registerNo: sanitize(data.registerNo || user.registerNo || user.email),
            type: sanitize(data.type || 'Leave Request'),
            leaveType: data.leaveType || 'personal',
            fromDate: data.fromDate,
            toDate: data.toDate,
            reason: sanitize(data.reason || ''),
            status: 'pending',
            proctorEmail: proctor?.email || null,
            classFacultyEmail: classFaculty?.email || null,
            proctorStatus: data.proctorStatus || 'pending',
            classFacultyStatus: data.classFacultyStatus || 'pending',
            hodStatus: data.hodStatus || 'pending',
            facultyStatus: data.facultyStatus || 'pending',
            checkerStatus: isEvent ? 'pending' : 'not_required',
            odType: data.odType || null,
            odTypeLabel: data.odTypeLabel || null,
            paperTitle: data.paperTitle || null,
            teamMembers: data.teamMembers || null,
            file: data.file || null,
            eventName: sanitize(data.eventName || null),
            collegeName: sanitize(data.collegeName || null),
            activityType: data.activityType || null,
            title: sanitize(data.title || null),
            domain: sanitize(data.domain || null),
            abstract: sanitize(data.abstract || null),
            document: data.document || null,
            alterations: data.alterations || [],
            medicalCertificate: data.medicalCertificate || null,
            odProof: null,
            odProofLocation: null,
            odProofUploadedAt: null,
            odCertificate: null,
            odPrize: null,
            appliedAt: new Date(),
        });

        await Notification.create({
            userId: studentEmail,
            message: `Your ${newReq.type} request from ${data.fromDate} to ${data.toDate} has been submitted.`,
            type: 'info',
        });

        auditLog('CREATE', newReq.id, user.email, `Created ${newReq.type} request`);
        res.status(201).json({ success: true, request: newReq });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getRequestsByStudent = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req);
        let email = req.query.email || req.user.email;

        if (req.user.role === 'student' && email !== req.user.email) {
            return res.status(403).json({ success: false, message: 'Access denied. You can only view your own requests.' });
        }

        email = email.toLowerCase();
        const total = await LeaveRequest.countDocuments({ studentEmail: email, deletedAt: null });
        const requests = await LeaveRequest.find({ studentEmail: email, deletedAt: null })
            .sort({ appliedAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({ success: true, requests, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMyStats = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        const requests = await LeaveRequest.find({ studentEmail: user.email, deletedAt: null });
        const approved = requests.filter(r => r.status === 'approved').length;
        const approvedLeaves = requests.filter(r => r.status === 'approved' && r.leaveType !== 'od').length;
        const pending = requests.filter(r => r.status === 'pending').length;
        const rejected = requests.filter(r => r.status === 'rejected').length;

        res.json({
            success: true,
            stats: {
                balance: (user.leaveBalance || 12) - approvedLeaves,
                approved,
                pending,
                rejected,
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPendingFacultyRequests = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req);
        const facultyEmail = req.user.email.toLowerCase();
        const query = {
            $or: [
                { proctorEmail: facultyEmail, proctorStatus: 'pending' },
                { classFacultyEmail: facultyEmail, classFacultyStatus: 'pending', $or: [{ proctorStatus: 'approved' }, { proctorEmail: null }] },
                { proctorEmail: null, classFacultyEmail: null, facultyStatus: 'pending' },
            ],
            deletedAt: null,
        };
        const total = await LeaveRequest.countDocuments(query);
        const requests = await LeaveRequest.find(query).sort({ appliedAt: -1 }).skip(skip).limit(limit);
        res.json({ success: true, requests, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPendingHodRequests = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req);
        const hod = await User.findById(req.user.id);
        const hodDepartment = hod?.department?.toLowerCase();
        const query = {
            hodStatus: 'pending',
            $or: [
                { classFacultyStatus: 'approved' },
                { classFacultyEmail: null, facultyStatus: 'approved' }
            ],
            deletedAt: null,
        };
        if (hodDepartment) {
            const departmentUsers = await User.find({ department: hodDepartment }).distinct('email');
            query.studentEmail = { $in: departmentUsers };
        }
        const requests = await LeaveRequest.find(query).sort({ appliedAt: -1 });
        const filtered = requests.filter(r => {
            if (r.leaveType === 'od' && (r.odType || r.odTypeLabel || '').toLowerCase().includes('event')) {
                return r.checkerStatus === 'approved';
            }
            return true;
        });
        const total = filtered.length;
        const paginated = filtered.slice(skip, skip + limit);
        res.json({ success: true, requests: paginated, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllRequests = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req);
        const { requesterRole, status, type } = req.query;
        const hod = await User.findById(req.user.id);
        const hodDepartment = hod?.department?.toLowerCase();
        const query = { deletedAt: null };

        // If requesterRole filter is provided, use it; otherwise default to department-based filtering
        if (requesterRole && ['student', 'faculty'].includes(requesterRole)) {
            query.requesterRole = requesterRole;
        }

        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            query.status = status;
        }
        if (type) {
            query.leaveType = type;
        }

        // Department-based filtering for HOD - find all users in the same department
        if (hodDepartment) {
            const departmentUsers = await User.find({ department: hodDepartment }).distinct('email');
            // Also include users without department or with empty department for backward compatibility
            const noDepartmentUsers = await User.find({ $or: [{ department: '' }, { department: null }] }).distinct('email');
            query.studentEmail = { $in: [...departmentUsers, ...noDepartmentUsers] };
        }

        const total = await LeaveRequest.countDocuments(query);
        const requests = await LeaveRequest.find(query).sort({ appliedAt: -1 }).skip(skip).limit(limit);
        res.json({ success: true, requests, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.facultyApproveLocal = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const existing = await LeaveRequest.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: 'Request not found.' });

        const isProctor = existing.proctorEmail?.toLowerCase() === user.email.toLowerCase();
        const isClassFaculty = existing.classFacultyEmail?.toLowerCase() === user.email.toLowerCase();
        if (!isProctor && !isClassFaculty) {
            return res.status(403).json({ success: false, message: 'Access denied. You are not the proctor or class faculty for this request.' });
        }

        const updated = await LeaveRequest.findByIdAndUpdate(id, {
            proctorStatus: 'approved',
            classFacultyStatus: 'approved',
            facultyStatus: 'approved',
            hodStatus: 'approved',
        }, { new: true });

        const status = computeStatus(updated);
        updated.status = status;
        await updated.save();

        await Notification.create({
            userId: updated.studentEmail,
            message: `Your ${updated.type} request has been fully APPROVED by faculty.`,
            type: 'success',
        });

        auditLog('APPROVE_LOCAL', id, user.email, 'Fully approved by faculty');
        res.json({ success: true, request: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.facultyForwardToHod = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const existing = await LeaveRequest.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: 'Request not found.' });

        const isProctor = existing.proctorEmail?.toLowerCase() === user.email.toLowerCase();
        const isClassFaculty = existing.classFacultyEmail?.toLowerCase() === user.email.toLowerCase();
        if (!isProctor && !isClassFaculty) {
            return res.status(403).json({ success: false, message: 'Access denied. You are not the proctor or class faculty for this request.' });
        }

        let updates = {};
        let message = '';

        if (isProctor && existing.proctorStatus === 'pending') {
            updates.proctorStatus = 'approved';
            if (!existing.classFacultyEmail || isClassFaculty) {
                updates.classFacultyStatus = 'approved';
                updates.facultyStatus = 'approved';
                message = `Your ${existing.type} request approved by Proctor and moved to HOD.`;
            } else {
                message = `Your ${existing.type} request approved by Proctor and moved to Class Faculty.`;
            }
        } else if (isClassFaculty && existing.classFacultyStatus === 'pending') {
            updates.classFacultyStatus = 'approved';
            updates.facultyStatus = 'approved';
            message = `Your ${existing.type} request approved by Class Faculty and moved to HOD.`;
        } else if (!existing.proctorEmail) {
            updates.facultyStatus = 'approved';
            message = `Your ${existing.type} request approved by faculty and moved to HOD.`;
        }

        const updated = await LeaveRequest.findByIdAndUpdate(id, updates, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Request not found.' });

        updated.status = computeStatus(updated);
        await updated.save();

        if (message) {
            await Notification.create({
                userId: updated.studentEmail,
                message,
                type: 'info',
            });
        }

        auditLog('FORWARD_TO_HOD', id, user.email, message);
        res.json({ success: true, request: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.facultyReject = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const user = req.user;
        const existing = await LeaveRequest.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: 'Request not found.' });

        const isProctor = existing.proctorEmail?.toLowerCase() === user.email.toLowerCase();
        const isClassFaculty = existing.classFacultyEmail?.toLowerCase() === user.email.toLowerCase();
        if (!isProctor && !isClassFaculty) {
            return res.status(403).json({ success: false, message: 'Access denied. You are not the proctor or class faculty for this request.' });
        }

        let updates = {};
        if (isProctor) {
            updates.proctorStatus = 'rejected';
        } else if (isClassFaculty) {
            updates.classFacultyStatus = 'rejected';
        }
        updates.facultyStatus = 'rejected';
        if (reason) updates.rejectionReason = reason.trim();

        const updated = await LeaveRequest.findByIdAndUpdate(id, updates, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Request not found.' });

        updated.status = computeStatus(updated);
        await updated.save();

        const rejectMessage = reason?.trim()
            ? `Your ${updated.type} request has been REJECTED by faculty. Reason: ${reason.trim()}`
            : `Your ${updated.type} request has been REJECTED by faculty.`;

        await Notification.create({
            userId: updated.studentEmail,
            message: rejectMessage,
            type: 'error',
        });

        auditLog('REJECT', id, user.email, reason?.trim() || 'Rejected by faculty');
        res.json({ success: true, request: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.hodAction = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;

        if (!['approved', 'rejected'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Action must be either "approved" or "rejected".' });
        }

        const updated = await LeaveRequest.findByIdAndUpdate(id, { hodStatus: action }, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Request not found.' });

        updated.status = computeStatus(updated);
        await updated.save();

        await Notification.create({
            userId: updated.studentEmail,
            message: `Your ${updated.type} request has been ${action} by HOD.`,
            type: action === 'approved' ? 'success' : 'error',
        });

        auditLog('HOD_ACTION', id, req.user.email, `HOD ${action} request`);
        res.json({ success: true, request: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.uploadOdProof = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const existing = await LeaveRequest.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: 'Request not found.' });

        if (existing.studentEmail.toLowerCase() !== user.email.toLowerCase()) {
            return res.status(403).json({ success: false, message: 'Access denied. You can only upload proof for your own requests.' });
        }

        let filePath = null;
        if (req.file) {
            filePath = `/uploads/od-proofs/${req.file.filename}`;
        }

        const updates = {
            odProof: filePath || req.body.file || null,
            odProofLocation: req.body.location || null,
            odProofUploadedAt: new Date().toISOString(),
            odCertificate: req.body.certificate || null,
            odPrize: req.body.prize || null,
        };

        const updated = await LeaveRequest.findByIdAndUpdate(id, updates, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Request not found.' });

        auditLog('UPLOAD_OD_PROOF', id, user.email, 'Uploaded OD proof');
        res.json({ success: true, request: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.uploadMedicalCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const existing = await LeaveRequest.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: 'Request not found.' });

        if (existing.studentEmail.toLowerCase() !== user.email.toLowerCase()) {
            return res.status(403).json({ success: false, message: 'Access denied. You can only upload certificates for your own requests.' });
        }

        let filePath = null;
        if (req.file) {
            filePath = `/uploads/medical-certificates/${req.file.filename}`;
        }

        const updates = {
            medicalCertificate: filePath || req.body.file || null,
            medicalCertificateUploadedAt: new Date().toISOString(),
        };

        const updated = await LeaveRequest.findByIdAndUpdate(id, updates, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Request not found.' });

        auditLog('UPLOAD_MEDICAL_CERT', id, user.email, 'Uploaded medical certificate');
        res.json({ success: true, request: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getFacultyList = async (req, res) => {
    try {
        const hod = await User.findById(req.user.id);
        const hodDepartment = hod?.department?.toLowerCase();
        const query = { role: { $in: ['faculty', 'od_checker'] } };
        if (hodDepartment) {
            query.department = hodDepartment;
        }
        const faculty = await User.find(query)
            .select('name email department subject')
            .sort({ name: 1 });
        res.json({ success: true, faculty });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getOverdueOdProofs = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req);
        const now = new Date();
        const query = {
            $or: [
                { type: 'On-Duty' },
                { type: 'od' },
            ],
            status: 'approved',
            odProof: null,
            deletedAt: null,
        };
        const requests = await LeaveRequest.find(query);
        const overdue = requests.filter(leaveReq => {
            const endDate = new Date(leaveReq.toDate);
            endDate.setHours(23, 59, 59, 999);
            return now > endDate;
        });
        const total = overdue.length;
        const paginated = overdue.slice(skip, skip + limit);
        res.json({ success: true, requests: paginated, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.checkerAction = async (req, res) => {
    try {
        const { id } = req.params;
        const { checkerStatus } = req.body;

        if (!['approved', 'rejected'].includes(checkerStatus)) {
            return res.status(400).json({ success: false, message: 'Checker status must be either "approved" or "rejected".' });
        }

        const updated = await LeaveRequest.findByIdAndUpdate(id, { checkerStatus }, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Request not found.' });

        await Notification.create({
            userId: updated.studentEmail,
            message: `Your Event OD has been ${checkerStatus} by the Verification Officer.`,
            type: checkerStatus === 'approved' ? 'success' : 'error',
        });

        auditLog('CHECKER_ACTION', id, req.user.email, `Checker ${checkerStatus} request`);
        res.json({ success: true, request: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const existing = await LeaveRequest.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: 'Request not found.' });
        if (existing.deletedAt) return res.status(400).json({ success: false, message: 'Request has already been deleted.' });

        const isOwner = existing.studentEmail.toLowerCase() === user.email.toLowerCase();
        const isStaff = ['faculty', 'hod'].includes(user.role);
        if (!isOwner && !isStaff) {
            return res.status(403).json({ success: false, message: 'Access denied. You can only delete your own requests.' });
        }

        // Clean up associated files
        const filesToDelete = [];
        if (existing.medicalCertificate) filesToDelete.push(existing.medicalCertificate);
        if (existing.odProof && existing.odProof.startsWith('/uploads/')) filesToDelete.push(existing.odProof);
        if (existing.odCertificate) filesToDelete.push(existing.odCertificate);

        for (const filePath of filesToDelete) {
            try {
                const fullPath = path.join(__dirname, '..', filePath);
                if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            } catch (e) {
                console.warn(`Failed to delete file: ${filePath}`, e.message);
            }
        }

        // Soft delete
        existing.deletedAt = new Date();
        await existing.save();

        auditLog('DELETE', id, user.email, 'Soft deleted request');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
