import db from './services/api';
import leaveService from './services/leaveService';
import odService from './services/odService';

async function runTest() {
    try {
        console.log("--- Starting Tests ---");

        // 1. Setup Student Session
        console.log("Setting up session: Student (John Doe)");
        const studentEmail = "24cs096@nandhaenggg.org";
        const studentUser = db.getUserByEmail(studentEmail);
        if (studentUser) {
            db.setCurrentUser(studentUser);
        } else {
            console.error("Student user not found.");
            return;
        }

        // 2. Apply for OD
        console.log("Action: Submitting OD Request...");
        const response = odService.applyOD({
            odType: 'workshop',
            fromDate: '2026-03-25',
            toDate: '2026-03-26',
            description: 'Node script test'
        });

        if (response.success) {
            console.log("Result: Application Success! ID:", response.request?.id);
        } else {
            console.warn("Result: Application Failed -", response.message);
        }

        // 3. Switch to Faculty
        console.log("Action: Switching session to Faculty...");
        const facultyEmail = "richard@college.edu";
        const fullFacultyUser = db.getUserByEmail(facultyEmail);

        if (fullFacultyUser) {
            db.setCurrentUser(fullFacultyUser);
            console.log("Logged in as:", fullFacultyUser.name);
        } else {
            console.error("Error: Faculty user 'richard@college.edu' not found in database.");
            return;
        }

        // 4. Check Pending Requests
        const pending = leaveService.getPendingForFaculty();
        console.log("Data: Pending Requests for Faculty count =", pending.length);

        // 5. Verification Logic
        const allRequests = leaveService.getAllRequests() || [];
        const myRequests = leaveService.getMyRequests() || [];

        console.log("Data: Total system requests =", allRequests.length);
        console.log("Data: My personal requests =", myRequests.length);

        const hasStudentRequestInMyList = myRequests.some(r =>
            r.studentEmail && r.studentEmail.toLowerCase() === '24cs096@nandhaenggg.org'
        );

        if (hasStudentRequestInMyList) {
            console.error("FAIL: Bug detected! Student request leaked into faculty's personal list.");
        } else {
            console.log("PASS: Isolation check passed. Faculty personal list is clean.");
        }

        console.log("--- Tests Completed Successfully ---");
    } catch (error) {
        console.error("CRITICAL ERROR during test execution:", error);
    }
}

// Execute tests
runTest();
