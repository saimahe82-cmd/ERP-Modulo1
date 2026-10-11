import db from './api.js';

const handleError = (err, fallbackMessage) => {
    return { success: false, message: err?.message || fallbackMessage };
};

const odService = {
    applyOD: async (data, callerUser) => {
        try {
            const typeLabels = {
                seminar: 'Seminar/Workshop',
                symposium: 'Symposium',
                placement: 'Placement Activity',
                sports: 'Sports',
                other: 'Other Official Work',
            };

            const displayType = typeLabels[data.odType] || data.odTypeLabel || data.odType;

            const request = await db.addRequest({
                studentName: callerUser?.name,
                studentEmail: callerUser?.email,
                registerNo: callerUser?.registerNo || callerUser?.email,
                type: 'On-Duty',
                leaveType: 'od',
                odType: data.odType,
                odTypeLabel: displayType,
                fromDate: data.fromDate,
                toDate: data.toDate,
                reason: data.description,
                paperTitle: data.paperTitle || null,
                teamMembers: data.teamMembers || null,
                file: data.file || null,
                eventName: data.eventName || null,
                collegeName: data.collegeName || null,
            });

            return { success: true, request };
        } catch (err) {
            return handleError(err, 'Failed to submit OD application');
        }
    },

    getMyODRequests: async () => {
        try {
            const requests = await db.getMyRequests();
            return requests.filter((r) => r.leaveType === 'od');
        } catch {
            return [];
        }
    },
};

export default odService;
