const { v4: uuidv4 } = require('uuid');

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateUUID() {
    return uuidv4();
}

module.exports = { generateId, generateUUID };
