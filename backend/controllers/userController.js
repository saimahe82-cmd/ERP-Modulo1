const User = require('../models/User');
const bcrypt = require('bcryptjs');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

exports.getUsers = async (req, res) => {
    try {
        const allUsers = await User.find().select('-password -refreshToken');
        res.json({ success: true, users: allUsers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getUserByEmail = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email.toLowerCase() }).select('-password -refreshToken');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getProctorForStudent = async (req, res) => {
    try {
        const studentEmail = req.params.email.toLowerCase();
        const proctor = await User.findOne({
            role: 'faculty',
            proctees: { $elemMatch: { $regex: new RegExp(`^${studentEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
        }).select('-password -refreshToken');
        if (!proctor) return res.json({ success: true, user: null });
        res.json({ success: true, user: proctor });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getClassFacultyForStudent = async (req, res) => {
    try {
        const studentEmail = req.params.email.toLowerCase();
        const faculty = await User.findOne({
            role: 'faculty',
            students: { $elemMatch: { $regex: new RegExp(`^${studentEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
        }).select('-password -refreshToken');
        if (!faculty) return res.json({ success: true, user: null });
        res.json({ success: true, user: faculty });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const isSelf = req.user.id === id;
        const isStaff = ['faculty', 'hod'].includes(req.user.role);
        if (!isSelf && !isStaff) {
            return res.status(403).json({ success: false, message: 'Access denied. You can only update your own profile.' });
        }

        const ALLOWED_FIELDS = ['name', 'email', 'phone', 'parentPhone', 'accommodation', 'vertical', 'address', 'guardianName', 'guardianPhone', 'department', 'subject', 'registerNo', 'year'];
        if (isStaff) ALLOWED_FIELDS.push('leaveBalance');

        const updates = {};
        for (const key of ALLOWED_FIELDS) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields to update.' });
        }
        if (updates.email && !EMAIL_REGEX.test(updates.email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }
        if (updates.password) {
            if (!PASSWORD_REGEX.test(updates.password)) {
                return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with uppercase, lowercase, and number.' });
            }
            updates.password = await bcrypt.hash(updates.password, 10);
        }
        const existingUser = await User.findById(id);
        if (!existingUser) return res.status(404).json({ success: false, message: 'User not found.' });

        const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password -refreshToken');
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.linkStudentByEmail = async (req, res) => {
    try {
        const { email, facultyEmail, type } = req.body;
        if (!email || !facultyEmail) {
            return res.status(400).json({ success: false, message: 'Student email and faculty email are required.' });
        }
        if (!['proctee', 'student'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Type must be either "proctee" or "student".' });
        }
        if (!EMAIL_REGEX.test(email) || !EMAIL_REGEX.test(facultyEmail)) {
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }
        if (facultyEmail.toLowerCase() !== req.user.email.toLowerCase()) {
            return res.status(403).json({ success: false, message: 'You can only link students to your own account.' });
        }

        const studentEmail = email.trim().toLowerCase();
        const student = await User.findOne({ email: studentEmail });
        if (!student) return res.status(404).json({ success: false, message: 'No student with that Mail ID' });
        if (student.role !== 'student') return res.status(400).json({ success: false, message: 'This email is not associated with a student account.' });

        const faculty = await User.findOne({ email: facultyEmail.toLowerCase() });
        if (!faculty) return res.status(404).json({ success: false, message: 'Faculty record not found.' });

        if (!student.department || !faculty.department) {
            return res.status(405).json({ success: false, message: 'Department information is missing. Please update your profile with a department before adding students.' });
        }
        if (student.department.toLowerCase() !== faculty.department.toLowerCase()) {
            return res.status(403).json({ success: false, message: `Cannot add student from a different department. Your department: ${faculty.department}, Student's department: ${student.department}.` });
        }

        const listKey = type === 'proctee' ? 'proctees' : 'students';
        const currentList = faculty[listKey] || [];

        if (currentList.includes(student.email)) {
            return res.status(409).json({ success: false, message: `This student is already in your ${type} list.` });
        }

        await User.findByIdAndUpdate(faculty._id, { [listKey]: [...currentList, student.email] });
        res.json({ success: true, user: student });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getStudentsForFaculty = async (req, res) => {
    try {
        const { facultyEmail, type } = req.params;
        if (!['proctees', 'students'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Type must be either "proctees" or "students".' });
        }
        const isSelf = facultyEmail.toLowerCase() === req.user.email.toLowerCase();
        const isHod = req.user.role === 'hod';
        if (!isSelf && !isHod) {
            return res.status(403).json({ success: false, message: 'Access denied. You can only view your own student list.' });
        }

        const faculty = await User.findOne({ email: facultyEmail.toLowerCase() });
        if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found.' });

        const listKey = type === 'proctees' ? 'proctees' : 'students';
        const emails = faculty[listKey] || [];
        const students = await User.find({ email: { $in: emails.map(e => e.toLowerCase()) } }).select('-password -refreshToken');

        res.json({ success: true, students });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
