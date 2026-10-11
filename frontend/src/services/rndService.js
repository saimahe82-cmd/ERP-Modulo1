import db from './api';

const handleError = (err, fallbackMessage) => {
    return { success: false, message: err?.message || fallbackMessage };
};

const rndService = {
    submitRnd: async (data) => {
        try {
            const request = await db.addRequest({
                type: 'R&D',
                leaveType: 'rnd',
                activityType: data.activityType,
                title: data.title,
                domain: data.domain,
                abstract: data.abstract,
                document: data.document,
                status: 'pending',
                facultyStatus: 'approved',
                hodStatus: 'pending',
            });

            return { success: true, request };
        } catch (err) {
            return handleError(err, 'Failed to submit R&D entry');
        }
    },

    getMyRndRequests: async () => {
        try {
            const requests = await db.getMyRequests();
            return requests.filter((r) => r.leaveType === 'rnd');
        } catch {
            return [];
        }
    },
};

export default rndService;
