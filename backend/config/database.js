const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

class JsonDB {
    constructor(filename) {
        this.filePath = path.join(DATA_DIR, filename);
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, '[]', 'utf8');
        }
    }

    _read() {
        try {
            const data = fs.readFileSync(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    _write(data) {
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    }

    getAll() {
        return this._read();
    }

    findById(id) {
        return this._read().find(item => item.id === id);
    }

    findByField(field, value) {
        return this._read().find(item => item[field] && item[field].toString().toLowerCase() === value.toString().toLowerCase());
    }

    filterByField(field, value) {
        return this._read().filter(item => item[field] && item[field].toString().toLowerCase() === value.toString().toLowerCase());
    }

    filter(predicate) {
        return this._read().filter(predicate);
    }

    insert(item) {
        const data = this._read();
        data.push(item);
        this._write(data);
        return item;
    }

    update(id, updates) {
        const data = this._read();
        const idx = data.findIndex(item => item.id === id);
        if (idx === -1) return null;
        data[idx] = { ...data[idx], ...updates };
        this._write(data);
        return data[idx];
    }

    remove(id) {
        const data = this._read();
        const filtered = data.filter(item => item.id !== id);
        this._write(filtered);
    }

    count() {
        return this._read().length;
    }
}

const users = new JsonDB('users.json');
const leaveRequests = new JsonDB('leaveRequests.json');
const notifications = new JsonDB('notifications.json');
const studentExtra = new JsonDB('studentExtra.json');
const studentProjects = new JsonDB('studentProjects.json');

module.exports = { users, leaveRequests, notifications, studentExtra, studentProjects };
