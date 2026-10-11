import db from './api';

const authService = {
    studentLogin: async (email, password) => {
        try {
            return await db.studentLogin(email, password);
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    facultyLogin: async (email, password) => {
        try {
            return await db.facultyLogin(email, password);
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    hodLogin: async (email, password) => {
        try {
            return await db.hodLogin(email, password);
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    studentSignup: async (data) => {
        try {
            return await db.studentSignup(data);
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    staffSignup: async (data) => {
        try {
            return await db.staffSignup(data);
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    hodSignup: async (data) => {
        try {
            return await db.hodSignup(data);
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    linkStudentByEmail: async (email, facultyEmail, type) => {
        try {
            return await db.linkStudentByEmail(email, facultyEmail, type);
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    logout: async () => {
        try {
            const token = localStorage.getItem('auth_token');
            if (token) {
                await db.logoutRequest();
            }
        } catch (err) {
            console.warn('Logout request failed:', err.message);
        } finally {
            db.logout();
        }
    },

    getCurrentUser: async () => {
        return await db.getMe();
    },

    isLoggedIn: async () => {
        try {
            const user = await db.getMe();
            return !!user;
        } catch {
            return false;
        }
    },
};

export default authService;
