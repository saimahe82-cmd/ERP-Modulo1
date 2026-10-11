import db from './api.js';

const handleError = (err, fallbackMessage) => {
    return { success: false, message: err?.message || fallbackMessage };
};

const leaveService = {
    applyLeave: async (data, callerUser) => {
        try {
            const typeLabels = {
                sick: 'Sick Leave',
                personal: 'Personal Leave',
                medical: 'Medical Leave',
                od: 'On-Duty',
                emergency: 'Emergency Leave'
            };

            const request = await db.addRequest({
                studentName: callerUser?.name,
                studentEmail: callerUser?.email,
                registerNo: callerUser?.registerNo || callerUser?.email,
                type: typeLabels[data.leaveType] || 'Leave Request',
                leaveType: data.leaveType,
                fromDate: data.fromDate,
                toDate: data.toDate,
                reason: data.reason,
                alterations: data.alterations || [],
                facultyStatus: callerUser?.role === 'faculty' ? 'approved' : 'pending',
                hodStatus: 'pending',
                medicalCertificate: null,
            });

            return { success: true, request };
        } catch (err) {
            return handleError(err, 'Failed to apply for leave');
        }
    },

    uploadMedicalCertificate: async (requestId, fileData) => {
        try {
            const request = await db.uploadMedicalCertificate(requestId, fileData);
            return { success: true, request };
        } catch (err) {
            return handleError(err, 'Failed to upload medical certificate');
        }
    },

    getMyRequests: async () => {
        try {
            return await db.getMyRequests();
        } catch {
            return [];
        }
    },

    getMyStats: async () => {
        try {
            return await db.getMyStats();
        } catch {
            return { balance: 12, approved: 0, pending: 0, rejected: 0 };
        }
    },

    getPendingForFaculty: async () => {
        try {
            return await db.getPendingFacultyRequests();
        } catch {
            return [];
        }
    },

    facultyApproveLocal: async (requestId) => {
        try {
            const request = await db.facultyApproveLocal(requestId);
            return { success: true, request };
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    facultyForwardToHod: async (requestId) => {
        try {
            const request = await db.facultyForwardToHod(requestId);
            return { success: true, request };
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    facultyReject: async (requestId, reason) => {
        try {
            const request = await db.facultyReject(requestId, reason);
            return { success: true, request };
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    getPendingForHod: async () => {
        try {
            return await db.getPendingHodRequests();
        } catch {
            return [];
        }
    },

    hodAction: async (requestId, action) => {
        try {
            const request = await db.hodAction(requestId, action);
            return { success: true, request };
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    getAllRequests: async () => {
        try {
            return await db.getRequests();
        } catch {
            return [];
        }
    },

    getRequestsByRole: async (role) => {
        try {
            return await db.getRequestsByRole(role);
        } catch {
            return [];
        }
    },

    uploadOdProof: async (requestId, proofData) => {
        try {
            const request = await db.uploadOdProof(requestId, proofData);
            return { success: true, request };
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    checkerAction: async (requestId, checkerStatus) => {
        try {
            const request = await db.checkerAction(requestId, checkerStatus);
            return { success: true, request };
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    getOverdueOdProofs: async () => {
        try {
            return await db.getOverdueOdProofs();
        } catch {
            return [];
        }
    },

    getFacultyList: async () => {
        try {
            return await db.getFacultyList();
        } catch {
            return [];
        }
    },

    deleteRequest: async (requestId) => {
        try {
            await db.deleteRequest(requestId);
            return { success: true };
        } catch (err) {
            return { success: false, message: err.message };
        }
    },
};

export default leaveService;
