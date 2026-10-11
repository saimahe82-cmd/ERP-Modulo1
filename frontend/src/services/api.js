const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function getToken() {
    return localStorage.getItem('auth_token');
}

function setToken(token) {
    localStorage.setItem('auth_token', token);
}

function clearToken() {
    localStorage.removeItem('auth_token');
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an invalid response. Please try again.');
    }

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }
    return data;
}

function getUploadUrl(relativePath) {
    if (!relativePath) return null;
    const base = API_BASE_URL.replace('/api', '');
    return `${base}${relativePath}`;
}

const db = {
    // ── Auth ──
    studentLogin: async (email, password) => {
        const data = await apiRequest('/auth/student-login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        if (data.token) setToken(data.token);
        return { success: true, user: data.user };
    },

    facultyLogin: async (email, password) => {
        const data = await apiRequest('/auth/faculty-login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        if (data.token) setToken(data.token);
        localStorage.setItem('facultyName', data.user.name);
        localStorage.setItem('facultyEmail', data.user.email);
        localStorage.setItem('facultySubject', data.user.subject || '');
        return { success: true, user: data.user };
    },

    hodLogin: async (email, password) => {
        const data = await apiRequest('/auth/hod-login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        if (data.token) setToken(data.token);
        return { success: true, user: data.user };
    },

    studentSignup: async (signupData) => {
        const data = await apiRequest('/auth/student-signup', {
            method: 'POST',
            body: JSON.stringify(signupData),
        });
        if (data.token) setToken(data.token);
        return { success: true, user: data.user };
    },

    staffSignup: async (signupData) => {
        const data = await apiRequest('/auth/staff-signup', {
            method: 'POST',
            body: JSON.stringify(signupData),
        });
        if (data.token) setToken(data.token);
        localStorage.setItem('facultyName', data.user.name);
        localStorage.setItem('facultyEmail', data.user.email);
        localStorage.setItem('facultySubject', data.user.subject || '');
        return { success: true, user: data.user };
    },

    hodSignup: async (signupData) => {
        const data = await apiRequest('/auth/hod-signup', {
            method: 'POST',
            body: JSON.stringify(signupData),
        });
        if (data.token) setToken(data.token);
        return { success: true, user: data.user };
    },

    getMe: async () => {
        const token = getToken();
        if (!token) return null;
        try {
            const data = await apiRequest('/auth/me');
            return data.user;
        } catch {
            clearToken();
            return null;
        }
    },

    logout: () => {
        clearToken();
        localStorage.removeItem('facultyName');
        localStorage.removeItem('facultyEmail');
        localStorage.removeItem('facultySubject');
    },

    logoutRequest: async () => {
        await apiRequest('/auth/logout', { method: 'POST' });
    },

    // ── Users ──
    getUsers: async () => {
        const data = await apiRequest('/users');
        return data.users;
    },

    getUserByEmail: async (email) => {
        const data = await apiRequest(`/users/by-email/${encodeURIComponent(email)}`);
        return data.user;
    },

    updateUser: async (id, updates) => {
        const data = await apiRequest(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
        return data.user;
    },

    getProctorForStudent: async (studentEmail) => {
        const data = await apiRequest(`/users/proctor/${encodeURIComponent(studentEmail)}`);
        return data.user;
    },

    getClassFacultyForStudent: async (studentEmail) => {
        const data = await apiRequest(`/users/class-faculty/${encodeURIComponent(studentEmail)}`);
        return data.user;
    },

    linkStudentByEmail: async (email, facultyEmail, type) => {
        const data = await apiRequest('/users/link-student', {
            method: 'POST',
            body: JSON.stringify({ email, facultyEmail, type }),
        });
        return { success: true, user: data.user };
    },

    getStudentsForFaculty: async (facultyEmail, type) => {
        const validTypes = ['proctees', 'students'];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
        }
        const data = await apiRequest(`/users/students/${encodeURIComponent(facultyEmail)}/${type}`);
        return data.students;
    },

    // ── Leave Requests ──
    addRequest: async (requestData) => {
        const data = await apiRequest('/leaves', {
            method: 'POST',
            body: JSON.stringify(requestData),
        });
        return data.request;
    },

    getRequests: async () => {
        const data = await apiRequest('/leaves/all');
        return data.requests;
    },

    getRequestsByRole: async (role) => {
        const data = await apiRequest(`/leaves/all?requesterRole=${role}`);
        return data.requests;
    },

    getRequestsByStudent: async (email) => {
        const data = await apiRequest(`/leaves/my?email=${encodeURIComponent(email)}`);
        return data.requests;
    },

    getMyRequests: async () => {
        const data = await apiRequest('/leaves/my');
        return data.requests;
    },

    getMyStats: async () => {
        const data = await apiRequest('/leaves/my/stats');
        return data.stats;
    },

    getPendingFacultyRequests: async () => {
        const data = await apiRequest('/leaves/pending/faculty');
        return data.requests;
    },

    getPendingHodRequests: async () => {
        const data = await apiRequest('/leaves/pending/hod');
        return data.requests;
    },

    updateRequest: async (id, updates) => {
        if (updates.checkerStatus) {
            const data = await apiRequest(`/leaves/${id}/checker-action`, {
                method: 'POST',
                body: JSON.stringify({ checkerStatus: updates.checkerStatus }),
            });
            return data.request;
        }
        if (updates.hodStatus) {
            const data = await apiRequest(`/leaves/${id}/hod-action`, {
                method: 'POST',
                body: JSON.stringify({ action: updates.hodStatus }),
            });
            return data.request;
        }
        const data = await apiRequest(`/leaves/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
        return data.request;
    },

    checkerAction: async (id, checkerStatus) => {
        const data = await apiRequest(`/leaves/${id}/checker-action`, {
            method: 'POST',
            body: JSON.stringify({ checkerStatus }),
        });
        return data.request;
    },

    facultyApproveLocal: async (id) => {
        const data = await apiRequest(`/leaves/${id}/faculty-approve-local`, { method: 'POST' });
        return data.request;
    },

    facultyForwardToHod: async (id) => {
        const data = await apiRequest(`/leaves/${id}/faculty-forward-to-hod`, { method: 'POST' });
        return data.request;
    },

    facultyReject: async (id, reason) => {
        const data = await apiRequest(`/leaves/${id}/faculty-reject`, {
            method: 'POST',
            body: JSON.stringify({ reason: reason || '' }),
        });
        return data.request;
    },

    hodAction: async (id, action) => {
        const data = await apiRequest(`/leaves/${id}/hod-action`, {
            method: 'POST',
            body: JSON.stringify({ action }),
        });
        return data.request;
    },

    uploadOdProof: async (id, proofData) => {
        const formData = new FormData();
        if (proofData.file) {
            formData.append('file', proofData.file);
        }
        if (proofData.location) formData.append('location', proofData.location);
        if (proofData.certificate) formData.append('certificate', proofData.certificate);
        if (proofData.prize) formData.append('prize', proofData.prize);

        const data = await apiRequest(`/leaves/${id}/upload-od-proof`, {
            method: 'POST',
            body: formData,
        });
        return data.request;
    },

    uploadMedicalCertificate: async (id, fileData) => {
        const formData = new FormData();
        if (fileData.file) {
            formData.append('file', fileData.file);
        } else if (fileData.fileData) {
            formData.append('file', fileData.fileData);
        }

        const data = await apiRequest(`/leaves/${id}/upload-medical-certificate`, {
            method: 'POST',
            body: formData,
        });
        return data.request;
    },

    getOverdueOdProofs: async () => {
        const data = await apiRequest('/leaves/overdue-od-proofs');
        return data.requests;
    },

    getFacultyList: async () => {
        const data = await apiRequest('/leaves/faculty-list');
        return data.faculty;
    },

    deleteRequest: async (id) => {
        await apiRequest(`/leaves/${id}`, { method: 'DELETE' });
        return { success: true };
    },

    // ── File Upload ──
    getUploadUrl,

    uploadFile: async (endpoint, file, extraFields = {}) => {
        const formData = new FormData();
        formData.append('file', file);
        Object.entries(extraFields).forEach(([key, value]) => {
            if (value !== undefined && value !== null) formData.append(key, value);
        });

        const data = await apiRequest(endpoint, {
            method: 'POST',
            body: formData,
        });
        return data;
    },

    // ── Notifications ──
    getNotifications: async (userId) => {
        const data = await apiRequest('/notifications');
        return data.notifications;
    },

    addNotification: async (notification) => {
        const data = await apiRequest('/notifications', {
            method: 'POST',
            body: JSON.stringify(notification),
        });
        return data.notification;
    },

    markNotificationRead: async (id) => {
        await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
    },

    // ── Student Extra ──
    getStudentExtra: async (email) => {
        const data = await apiRequest(`/student-extra/${encodeURIComponent(email)}`);
        return data.data;
    },

    updateStudentExtra: async (email, extraData) => {
        const data = await apiRequest(`/student-extra/${encodeURIComponent(email)}`, {
            method: 'PUT',
            body: JSON.stringify(extraData),
        });
        return data.data;
    },

    generateId: () => Date.now().toString(36) + Math.random().toString(36).substring(2, 11),
};

export default db;
