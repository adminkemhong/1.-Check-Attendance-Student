// --- Global Variables & State ---
let students = JSON.parse(localStorage.getItem('attendanceApp_students')) || [];
let attendanceRecords = JSON.parse(localStorage.getItem('attendanceApp_records')) || {};

// DOM Elements
const dateDisplay = document.getElementById('current-date');
const attendanceDateInput = document.getElementById('attendance-date');
const pageTitle = document.getElementById('page-title');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Set Current Date
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = today.toLocaleDateString('km-KH', options);
    
    // Set Default Date in Attendance Tab
    attendanceDateInput.value = today.toISOString().split('T')[0];
    
    // Setup Navigation
    setupNavigation();
    
    // Render Dashboard
    updateDashboard();
    
    // Render Initial Tables
    renderStudentsTable();
});

// --- Navigation Logic ---
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove Active Classes
            navLinks.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            // Add Active Class
            link.classList.add('active');
            const targetId = link.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
            
            // Update Title
            pageTitle.textContent = link.querySelector('span').textContent;

            // Specific Tab Actions
            if(targetId === 'dashboard') updateDashboard();
            if(targetId === 'students') renderStudentsTable();
            if(targetId === 'attendance') renderAttendanceTable();
        });
    });
}

// --- Dashboard Logic ---
function updateDashboard() {
    document.getElementById('total-students').textContent = students.length;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecord = attendanceRecords[todayStr] || {};
    
    let presentCount = 0;
    let absentCount = 0;
    
    Object.values(todayRecord).forEach(status => {
        if(status === 'present' || status === 'late') presentCount++;
        if(status === 'absent' || status === 'leave') absentCount++;
    });
    
    document.getElementById('today-present').textContent = presentCount;
    document.getElementById('today-absent').textContent = absentCount;
}

// --- Student Management Logic ---
const studentModal = document.getElementById('student-modal');
const studentForm = document.getElementById('student-form');

function openStudentModal(id = null) {
    document.getElementById('modal-title').textContent = id ? 'កែប្រែព័ត៌មានសិស្ស' : 'បន្ថែមសិស្សថ្មី';
    
    if(id) {
        const student = students.find(s => s.id === id);
        if(student) {
            document.getElementById('student-id').value = student.id;
            document.getElementById('student-name').value = student.name;
            document.getElementById('student-gender').value = student.gender;
        }
    } else {
        studentForm.reset();
        document.getElementById('student-id').value = '';
    }
    
    studentModal.classList.add('active');
}

function closeStudentModal() {
    studentModal.classList.remove('active');
}

studentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const idInput = document.getElementById('student-id').value;
    const nameInput = document.getElementById('student-name').value;
    const genderInput = document.getElementById('student-gender').value;

    if(idInput) {
        // Edit
        const index = students.findIndex(s => s.id === idInput);
        if(index > -1) {
            students[index].name = nameInput;
            students[index].gender = genderInput;
        }
    } else {
        // Add
        const newStudent = {
            id: 'STU-' + Date.now().toString().slice(-6),
            name: nameInput,
            gender: genderInput
        };
        students.push(newStudent);
    }

    saveStudents();
    renderStudentsTable();
    closeStudentModal();
});

function deleteStudent(id) {
    if(confirm('តើអ្នកពិតជាចង់លុបទិន្នន័យសិស្សនេះមែនទេ?')) {
        students = students.filter(s => s.id !== id);
        saveStudents();
        renderStudentsTable();
    }
}

function renderStudentsTable() {
    const tbody = document.getElementById('student-table-body');
    tbody.innerHTML = '';

    if(students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">មិនមានទិន្នន័យសិស្សទេ</td></tr>';
        return;
    }

    students.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>${student.gender}</td>
            <td>
                <button class="btn btn-secondary" style="padding: 5px; display: inline-flex;" onclick="openStudentModal('${student.id}')"><i class='bx bx-edit-alt'></i></button>
                <button class="btn btn-danger" style="padding: 5px; display: inline-flex;" onclick="deleteStudent('${student.id}')"><i class='bx bx-trash'></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function saveStudents() {
    localStorage.setItem('attendanceApp_students', JSON.stringify(students));
}

// --- Attendance Logic ---
// Listen to date change
attendanceDateInput.addEventListener('change', renderAttendanceTable);

function renderAttendanceTable() {
    const tbody = document.getElementById('attendance-table-body');
    tbody.innerHTML = '';
    
    if(students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">សូមបន្ថែមសិស្សជាមុនសិន</td></tr>';
        return;
    }

    const selectedDate = attendanceDateInput.value;
    const currentRecords = attendanceRecords[selectedDate] || {};

    students.forEach(student => {
        const status = currentRecords[student.id] || 'present'; // default present
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>${student.gender}</td>
            <td>
                <div class="radio-group">
                    <label>
                        <input type="radio" name="att_${student.id}" value="present" ${status==='present'?'checked':''}>
                        <span class="status-badge status-present">វត្តមាន</span>
                    </label>
                    <label>
                        <input type="radio" name="att_${student.id}" value="absent" ${status==='absent'?'checked':''}>
                        <span class="status-badge status-absent">អវត្តមាន</span>
                    </label>
                    <label>
                        <input type="radio" name="att_${student.id}" value="leave" ${status==='leave'?'checked':''}>
                        <span class="status-badge status-leave">ច្បាប់</span>
                    </label>
                    <label>
                        <input type="radio" name="att_${student.id}" value="late" ${status==='late'?'checked':''}>
                        <span class="status-badge status-late">យឺត</span>
                    </label>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function saveAttendance() {
    const selectedDate = attendanceDateInput.value;
    if(!selectedDate) {
        alert("សូមជ្រើសរើសកាលបរិច្ឆេទ!");
        return;
    }
    
    const currentRecords = {};
    students.forEach(student => {
        const radios = document.getElementsByName(`att_${student.id}`);
        for(let radio of radios) {
            if(radio.checked) {
                currentRecords[student.id] = radio.value;
                break;
            }
        }
    });
    
    attendanceRecords[selectedDate] = currentRecords;
    localStorage.setItem('attendanceApp_records', JSON.stringify(attendanceRecords));
    
    alert("ទិន្នន័យវត្តមានត្រូវបានរក្សាទុកជោគជ័យ! (Saved Successfully)");
}
