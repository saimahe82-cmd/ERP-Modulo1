const StudentExtra = require('../models/StudentExtra');

const ALLOWED_UPDATE_FIELDS = [
    'section', 'year', 'department', 'phone', 'address',
    'guardianName', 'guardianPhone', 'accommodation', 'vertical'
];

exports.getExtra = async (req, res) => {
    try {
        const email = req.params.email.toLowerCase();
        const isSelf = req.user.email.toLowerCase() === email;
        const isStaff = ['faculty', 'hod'].includes(req.user.role);
        if (!isSelf && !isStaff) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        const extra = await StudentExtra.findOne({ email });
        res.json({ success: true, data: extra || null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateExtra = async (req, res) => {
    try {
        const email = req.params.email.toLowerCase();
        const isSelf = req.user.email.toLowerCase() === email;
        const isStaff = ['faculty', 'hod'].includes(req.user.role);
        if (!isSelf && !isStaff) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const updates = {};
        for (const key of ALLOWED_UPDATE_FIELDS) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields to update.' });
        }

        const extra = await StudentExtra.findOneAndUpdate(
            { email },
            { $set: updates },
            { new: true, upsert: true }
        );
        res.json({ success: true, data: extra });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
