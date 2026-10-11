const db = require('./frontend/src/services/api').default;
const leaveService = require('./frontend/src/services/leaveService').default;
const odService = require('./frontend/src/services/odService').default;

// Mock LocalStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => store[key] = value.toString(),
        removeItem: (key) => delete store[key],
        clear: () => store = {}
    };
})();

global.localStorage = localStorageMock;

// Mock User
const mockUser = {
    id: 'student1',
    name: 'Test Student',
    email: 'test@student.com',
    role: 'student',
    registerNo: 'REG123'
};
db.setCurrentUser(mockUser);

// 1. Submit OD Request
console.log('Applying OD...');
const odResult = odService.applyOD({
    odType: 'seminar',
    fromDate: '2026-02-21',
    toDate: '2026-02-22',
    description: 'Test Seminar'
});

if (!odResult.success) {
    console.error('OD Application Failed');
} else {
    console.log('OD Applied. ID:', odResult.request.id);
    console.log('Request Type in DB:', odResult.request.type);
}

// 2. Faculty Approves
console.log('Faculty Approving...');
const reqId = odResult.request.id;
leaveService.facultyForwardToHod(reqId);

// 3. HOD Fetch
console.log('Fetching for HOD...');
const hodRequests = leaveService.getPendingForHod();
const fetchedReq = hodRequests.find(r => r.id === reqId);

if (fetchedReq) {
    console.log('Fetched Request Type:', fetchedReq.type);
    const isOD = fetchedReq.type.toLowerCase().includes('od');
    console.log('Is Categorized as OD?', isOD);
} else {
    console.error('Request not found in HOD pending list');
}
