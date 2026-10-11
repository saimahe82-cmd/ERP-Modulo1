const jwt = require('jsonwebtoken');
const tokenBlacklist = new Set();

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided. Authorization denied.' });
    }

    const token = authHeader.split(' ')[1];
    if (tokenBlacklist.has(token)) {
        return res.status(401).json({ success: false, message: 'Token has been revoked. Please login again.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token is not valid.' });
    }
}

function revokeToken(token) {
    tokenBlacklist.add(token);
}

module.exports = { authMiddleware, roleMiddleware, requireOwnership, requireSelfOrRole, revokeToken, tokenBlacklist };

function roleMiddleware(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
}

function requireOwnership(getOwnerId) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated.' });
        }
        const ownerId = getOwnerId(req);
        if (req.user.id !== ownerId) {
            return res.status(403).json({ success: false, message: 'Access denied. You do not own this resource.' });
        }
        next();
    };
}

function requireSelfOrRole(getOwnerId, ...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated.' });
        }
        const ownerId = getOwnerId(req);
        if (req.user.id === ownerId || roles.includes(req.user.role)) {
            next();
        } else {
            return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
        }
    };
}

module.exports = { authMiddleware, roleMiddleware, requireOwnership, requireSelfOrRole, revokeToken, tokenBlacklist };
