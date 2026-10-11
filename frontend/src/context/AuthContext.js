import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                if (token) {
                    try {
                        const decoded = jwtDecode(token);
                        if (decoded.exp * 1000 < Date.now()) {
                            authService.logout();
                            setLoading(false);
                            return;
                        }
                    } catch {
                        authService.logout();
                        setLoading(false);
                        return;
                    }
                }
                const savedUser = await authService.getCurrentUser();
                if (savedUser) {
                    setUser(savedUser);
                }
            } catch {
                // Ignore errors during session restoration
            }
            setLoading(false);
        };
        restoreSession();
    }, []);

    const login = async (role, email, password) => {
        let result;
        switch (role) {
            case 'student':
                result = await authService.studentLogin(email, password);
                break;
            case 'faculty':
                result = await authService.facultyLogin(email, password);
                break;
            case 'hod':
                result = await authService.hodLogin(email, password);
                break;
            default:
                return { success: false, message: 'Invalid role.' };
        }
        if (result.success) {
            try {
                const token = localStorage.getItem('auth_token');
                if (token) {
                    const decoded = jwtDecode(token);
                    if (decoded.exp * 1000 < Date.now()) {
                        authService.logout();
                        return { success: false, message: 'Session expired. Please login again.' };
                    }
                }
            } catch {
                // Token decode fails — still allow login, server will validate
            }
            setUser(result.user);
        }
        return result;
    };

    const studentSignup = async (data) => {
        const result = await authService.studentSignup(data);
        if (result.success) {
            setUser(result.user);
        }
        return result;
    };

    const staffSignup = async (data) => {
        const result = await authService.staffSignup(data);
        if (result.success) {
            setUser(result.user);
        }
        return result;
    };

    const hodSignup = async (data) => {
        const result = await authService.hodSignup(data);
        if (result.success) {
            setUser(result.user);
        }
        return result;
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                setUser(null);
                return;
            }
            try {
                const decoded = jwtDecode(token);
                if (decoded.exp * 1000 < Date.now()) {
                    authService.logout();
                    setUser(null);
                    return;
                }
            } catch {
                authService.logout();
                setUser(null);
                return;
            }
            const savedUser = await authService.getCurrentUser();
            if (savedUser) {
                setUser(savedUser);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, studentSignup, staffSignup, hodSignup, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
