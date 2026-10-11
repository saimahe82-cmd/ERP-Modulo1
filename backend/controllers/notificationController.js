const Notification = require('../models/Notification');

const VALID_TYPES = ['info', 'success', 'error', 'warning'];

function getPagination(req) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    return { page, limit, skip: (page - 1) * limit };
}

exports.getNotifications = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req);
        const userId = req.user.email;
        const total = await Notification.countDocuments({ userId });
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        res.json({ success: true, notifications, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addNotification = async (req, res) => {
    try {
        const { userId, message, type } = req.body;

        if (!userId || !message) {
            return res.status(400).json({ success: false, message: 'userId and message are required.' });
        }
        if (!VALID_TYPES.includes(type || 'info')) {
            return res.status(400).json({ success: false, message: `Type must be one of: ${VALID_TYPES.join(', ')}.` });
        }
        if (message.length > 500) {
            return res.status(400).json({ success: false, message: 'Message must be 500 characters or less.' });
        }

        const isStaff = ['faculty', 'hod'].includes(req.user.role);
        const isSelf = userId === req.user.email;
        if (!isStaff && !isSelf) {
            return res.status(403).json({ success: false, message: 'You can only create notifications for yourself.' });
        }

        const notif = await Notification.create({
            userId,
            message: message.trim(),
            type,
        });
        res.status(201).json({ success: true, notification: notif });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.markRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
        if (notification.userId !== req.user.email) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        notification.read = true;
        await notification.save();
        res.json({ success: true, notification });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteOldNotifications = async () => {
    try {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const result = await Notification.deleteMany({ createdAt: { $lt: ninetyDaysAgo } });
        console.log(`[CLEANUP] Deleted ${result.deletedCount} old notifications`);
    } catch (err) {
        console.error('[CLEANUP] Failed to delete old notifications:', err.message);
    }
};
