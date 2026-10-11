const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { revokeToken } = require('../middleware/auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function generateToken(user) {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { id: user._id, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
}

function validateEmail(email) {
    return EMAIL_REGEX.test(email);
}

function validatePassword(password) {
    return PASSWORD_REGEX.test(password);
}

function sanitize(str) {
    return typeof str === 'string' ? str.trim() : str;
}

async function handleLogin(req, res, allowedRoles, errorMessage) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ success: false, message: 'Account not found. Please sign up first.' });
        if (!allowedRoles.includes(user.role)) {
            return res.status(400).json({ success: false, message: errorMessage });
        }

        if (user.lockUntil && user.lockUntil > new Date()) {
            return res.status(423).json({ success: false, message: 'Account is temporarily locked. Please try again later.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
            if (user.failedLoginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
                user.failedLoginAttempts = 0;
            }
            await user.save();
            return res.status(400).json({ success: false, message: 'Incorrect password.' });
        }

        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        await user.save();

        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);
        user.refreshToken = refreshToken;
        await user.save();

        const userObj = user.toObject();
        delete userObj.password;
        delete userObj.refreshToken;
        res.json({ success: true, user: userObj, token, refreshToken });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

exports.studentLogin = async (req, res) => handleLogin(req, res, ['student'], 'This is not a student account.');
exports.facultyLogin = async (req, res) => handleLogin(req, res, ['faculty', 'od_checker'], 'This is not a faculty account.');
exports.hodLogin = async (req, res) => handleLogin(req, res, ['hod'], 'This is not an HOD account.');

exports.studentSignup = async (req, res) => {
    try {
        const { name, email, password, confirmPassword, registerNo, department, year, phone, parentPhone, accommodation, vertical, address, guardianName, guardianPhone } = req.body;

        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'Name, email, password, and confirm password are required.' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }
        if (!validatePassword(password)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with uppercase, lowercase, and number.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

        if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match.' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name: sanitize(name),
            email: normalizedEmail,
            password: hashedPassword,
            role: 'student',
            registerNo: sanitize(registerNo || ''),
            department: sanitize(department || ''),
            year: sanitize(year || ''),
            phone: sanitize(phone || ''),
            parentPhone: sanitize(parentPhone || ''),
            accommodation: sanitize(accommodation || ''),
            vertical: sanitize(vertical || ''),
            address: sanitize(address || ''),
            guardianName: sanitize(guardianName || ''),
            guardianPhone: sanitize(guardianPhone || ''),
            leaveBalance: 12,
            proctees: [],
            students: [],
        });

        const token = generateToken(newUser);
        const refreshToken = generateRefreshToken(newUser);
        newUser.refreshToken = refreshToken;
        await newUser.save();

        const userObj = newUser.toObject();
        delete userObj.password;
        delete userObj.refreshToken;
        res.status(201).json({ success: true, user: userObj, token, refreshToken });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.staffSignup = async (req, res) => {
    try {
        const { name, email, password, confirmPassword, department, subject } = req.body;

        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'Name, email, password, and confirm password are required.' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }
        if (!validatePassword(password)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with uppercase, lowercase, and number.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

        if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match.' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name: sanitize(name),
            email: normalizedEmail,
            password: hashedPassword,
            role: 'faculty',
            department: sanitize(department || ''),
            subject: sanitize(subject || ''),
            proctees: [],
            students: [],
        });

        const token = generateToken(newUser);
        const refreshToken = generateRefreshToken(newUser);
        newUser.refreshToken = refreshToken;
        await newUser.save();

        const userObj = newUser.toObject();
        delete userObj.password;
        delete userObj.refreshToken;
        res.status(201).json({ success: true, user: userObj, token, refreshToken });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.hodSignup = async (req, res) => {
    try {
        const { name, email, password, confirmPassword, department } = req.body;

        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'Name, email, password, and confirm password are required.' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }
        if (!validatePassword(password)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with uppercase, lowercase, and number.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

        if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match.' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name: sanitize(name),
            email: normalizedEmail,
            password: hashedPassword,
            role: 'hod',
            department: sanitize(department || ''),
            proctees: [],
            students: [],
        });

        const token = generateToken(newUser);
        const refreshToken = generateRefreshToken(newUser);
        newUser.refreshToken = refreshToken;
        await newUser.save();

        const userObj = newUser.toObject();
        delete userObj.password;
        delete userObj.refreshToken;
        res.status(201).json({ success: true, user: userObj, token, refreshToken });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -refreshToken');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token is required.' });

        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        if (decoded.type !== 'refresh') return res.status(401).json({ success: false, message: 'Invalid token type.' });

        const user = await User.findById(decoded.id);
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
        }

        const token = generateToken(user);
        res.json({ success: true, token });
    } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }
};

exports.logout = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            revokeToken(token);
        }
        const user = await User.findById(req.user.id);
        if (user) {
            user.refreshToken = null;
            await user.save();
        }
        res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !validateEmail(email)) {
            return res.status(400).json({ success: false, message: 'Valid email is required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ success: false, message: 'No account found with that email.' });

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();

        console.log(`[PASSWORD RESET] Token for ${email}: ${resetToken}`);
        res.json({ success: true, message: 'Password reset token generated. Check your email.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: 'Token and new password are required.' });
        }
        if (!validatePassword(newPassword)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with uppercase, lowercase, and number.' });
        }

        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: new Date() }
        });
        if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });

        user.password = await bcrypt.hash(newPassword, 10);
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();

        res.json({ success: true, message: 'Password reset successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
