// ==========================================================
// ⚠️ Google Sheets Configuration
// ==========================================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwQW0a52zFKVFPD1wM1KXY98uDcZl5tSUJo1xcFSNM-aBTQyW80_cr3ZIKv26P1iIfV/exec";

// Global State
let students = [];
let classes = [];
let subjects = [];
let attendanceRecords = {};
let scores = {};
let currentUser = null;

let appUsers = [
    {
        id: "usr_admin",
        fullname: "គ្រូបន្ទុកថ្នាក់ (Admin)",
        username: "admin",
        password: "123",
        role: "teacher",
        subjectId: "",
        classId: ""
    },
    {
        id: "usr_math",
        fullname: "គ្រូមុខវិជ្ជា គណិតវិទ្យា",
        username: "math_teacher",
        password: "123",
        role: "subject_teacher",
        subjectId: "",
        classId: ""
    },
    {
        id: "usr_monitor",
        fullname: "ប្រធានថ្នាក់ ទី១០A",
        username: "monitor_10a",
        password: "123",
        role: "class_monitor",
        subjectId: "",
        classId: ""
    }
];

// DOM Elements
const attendanceDateInput = document.getElementById('attendance-date');
const pageTitle = document.getElementById('page-title');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Set Default Date in Attendance Tab
    const today = new Date();
    if (attendanceDateInput) attendanceDateInput.value = today.toISOString().split('T')[0];
    
    setupNavigation();
    loadStoredUsers();
    fetchDataFromSheets(); 
    checkAuthSession();
});

// --- Fetch Data ---
function fetchDataFromSheets() {
    document.getElementById('student-grid').innerHTML = '<div style="grid-column: 1/-1; text-align: center;">កំពុងទាញយកទិន្នន័យ...</div>';
    
    fetch(WEB_APP_URL)
        .then(res => res.json())
        .then(data => {
            const studs = data.students || {};
            students = Object.values(studs);
            const cls = data.classes || {};
            classes = Object.values(cls);
            const subs = data.subjects || {};
            subjects = Object.values(subs);
            attendanceRecords = data.attendance || {};
            scores = data.scores || {};
            
            if (data.users && Object.keys(data.users).length > 0) {
                const remoteUsers = Object.values(data.users);
                const userMap = new Map();
                appUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
                remoteUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
                appUsers = Array.from(userMap.values());
                saveUsersLocally();
            }

            populateClassDropdowns();
            populateSubjectDropdowns();
            renderClassesTable();
            renderSubjectsTable();
            renderStudentsTable();
            renderAttendanceTable();
            renderScoresTable();
            updateDashboard();

            if (currentUser) {
                applyUserPermissions(currentUser);
            }
        })
        .catch(err => {
            console.error(err);
            alert("មានបញ្ហាក្នុងការទាញយកទិន្នន័យពី Google Sheets!");
        });
}

// --- Navigation Logic ---
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            link.classList.add('active');
            const targetId = link.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
            pageTitle.textContent = link.querySelector('span').textContent;
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
            document.getElementById('student-class').value = student.classId;
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

// --- Class Management Logic ---
const classModal = document.getElementById('class-modal');
const classForm = document.getElementById('class-form');

function populateClassDropdowns() {
    const filterStudents = document.getElementById('filter-class-students');
    const filterAttendance = document.getElementById('filter-class-attendance');
    const studentClassSelect = document.getElementById('student-class');
    const scoreClassSelect = document.getElementById('score-class-select');
    const reportClassSelect = document.getElementById('report-class-select');
    const regClassSelect = document.getElementById('reg-class');
    const modalClassSelect = document.getElementById('modal-user-class');

    // Keep the default options
    if(filterStudents) filterStudents.innerHTML = '<option value="">ថ្នាក់ទាំងអស់</option>';
    if(filterAttendance) filterAttendance.innerHTML = '<option value="">ជ្រើសរើសថ្នាក់រៀន...</option>';
    if(studentClassSelect) studentClassSelect.innerHTML = '<option value="">-- សូមជ្រើសរើសថ្នាក់រៀន --</option>';
    if(scoreClassSelect) scoreClassSelect.innerHTML = '<option value="" disabled selected>ជ្រើសរើសថ្នាក់</option>';
    if(reportClassSelect) reportClassSelect.innerHTML = '<option value="">ថ្នាក់ទាំងអស់</option>';
    if(regClassSelect) regClassSelect.innerHTML = '<option value="">-- ជ្រើសរើសថ្នាក់ដែលគ្រប់គ្រង --</option>';
    if(modalClassSelect) modalClassSelect.innerHTML = '<option value="">-- ជ្រើសរើសថ្នាក់ដែលគ្រប់គ្រង --</option>';

    classes.forEach(c => {
        const option = `<option value="${c.id}">${c.name}</option>`;
        if(filterStudents) filterStudents.innerHTML += option;
        if(filterAttendance) filterAttendance.innerHTML += option;
        if(studentClassSelect) studentClassSelect.innerHTML += option;
        if(scoreClassSelect) scoreClassSelect.innerHTML += option;
        if(reportClassSelect) reportClassSelect.innerHTML += option;
        if(regClassSelect) regClassSelect.innerHTML += option;
        if(modalClassSelect) modalClassSelect.innerHTML += option;
    });
}

function openClassModal(id = null) {
    document.getElementById('class-modal-title').textContent = id ? 'កែប្រែថ្នាក់រៀន' : 'បន្ថែមថ្នាក់រៀនថ្មី';
    if(id) {
        const cls = classes.find(c => c.id === id);
        if(cls) {
            document.getElementById('class-id').value = cls.id;
            document.getElementById('class-name').value = cls.name;
        }
    } else {
        classForm.reset();
        document.getElementById('class-id').value = '';
    }
    classModal.classList.add('active');
}

function closeClassModal() {
    classModal.classList.remove('active');
}

classForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const idInput = document.getElementById('class-id').value;
    const nameInput = document.getElementById('class-name').value;

    if (!nameInput.trim()) {
        alert("សូមបញ្ចូលឈ្មោះថ្នាក់រៀន!");
        return;
    }

    let classObj = {
        id: idInput || ('CLS-' + Date.now().toString().slice(-6)),
        name: nameInput
    };

    const objToSave = {};
    classes.forEach(c => { objToSave[c.id] = c; });
    objToSave[classObj.id] = classObj;

    const submitBtn = classForm.querySelector('button[type="submit"]');
    submitBtn.textContent = "កំពុងរក្សាទុក...";
    submitBtn.disabled = true;

    fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            action: "updateClasses",
            classes: objToSave
        })
    })
    .then(res => res.json())
    .then(res => {
        submitBtn.textContent = "រក្សាទុក";
        submitBtn.disabled = false;
        if(res.status === 'success') {
            closeClassModal();
            fetchDataFromSheets();
        } else {
            alert('មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ!');
        }
    })
    .catch(err => {
        submitBtn.textContent = "រក្សាទុក";
        submitBtn.disabled = false;
        alert('មានបញ្ហាក្នុងការភ្ជាប់ទៅ Google Sheets!');
    });
});

function deleteClass(id) {
    if(confirm('តើអ្នកពិតជាចង់លុបទិន្នន័យថ្នាក់រៀននេះមែនទេ? (សិស្សក្នុងថ្នាក់នេះនឹងត្រូវបាត់បង់ចំណងថ្នាក់រៀន)')) {
        fetch(WEB_APP_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "deleteClass",
                classId: id
            })
        })
        .then(res => res.json())
        .then(res => {
            if(res.status === 'success') fetchDataFromSheets();
        });
    }
}

function renderClassesTable() {
    const grid = document.getElementById('class-grid');
    grid.innerHTML = '';
    
    document.getElementById('class-count-text').textContent = `${classes.length} ថ្នាក់`;

    if(classes.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">មិនមានទិន្នន័យថ្នាក់រៀនទេ</div>';
        return;
    }

    classes.forEach((c) => {
        const studentCount = students.filter(s => s.classId === c.id).length;
        
        const card = document.createElement('div');
        card.className = 'card class-card';
        card.innerHTML = `
            <div class="class-icon"><i class='bx bx-building-house'></i></div>
            <h3>${c.name}</h3>
            <p>ថ្នាក់</p>
            <div class="class-meta">
                <i class='bx bx-group'></i> ${studentCount} សិស្ស
            </div>
            <div class="class-actions">
                <button class="btn-icon" onclick="openClassModal('${c.id}')"><i class='bx bx-pencil'></i></button>
                <button class="btn-icon delete" onclick="deleteClass('${c.id}')"><i class='bx bx-trash'></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
}

studentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const idInput = document.getElementById('student-id').value;
    const nameInput = document.getElementById('student-name').value;
    const genderInput = document.getElementById('student-gender').value;
    const classInput = document.getElementById('student-class').value;

    if (!nameInput.trim()) {
        alert("សូមបញ្ចូលឈ្មោះសិស្ស!");
        return;
    }

    if (!classInput) {
        alert("សូមជ្រើសរើសថ្នាក់រៀន!");
        return;
    }

    let studentObj = {
        id: idInput || ('STU-' + Date.now().toString().slice(-6)),
        name: nameInput,
        gender: genderInput,
        classId: classInput
    };

    const objToSave = {};
    students.forEach(s => { objToSave[s.id] = s; });
    objToSave[studentObj.id] = studentObj;

    const submitBtn = studentForm.querySelector('button[type="submit"]');
    submitBtn.textContent = "កំពុងរក្សាទុក...";
    submitBtn.disabled = true;

    fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            action: "updateStudents",
            students: objToSave
        })
    })
    .then(res => res.json())
    .then(res => {
        submitBtn.textContent = "រក្សាទុក";
        submitBtn.disabled = false;
        if(res.status === 'success') {
            closeStudentModal();
            fetchDataFromSheets();
        } else {
            alert('មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ!');
        }
    })
    .catch(err => {
        submitBtn.textContent = "រក្សាទុក";
        submitBtn.disabled = false;
        alert('មានបញ្ហាក្នុងការភ្ជាប់ទៅ Google Sheets!');
    });
});

function deleteStudent(id) {
    if(confirm('តើអ្នកពិតជាចង់លុបទិន្នន័យសិស្សនេះមែនទេ?')) {
        fetch(WEB_APP_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "deleteStudent",
                studentId: id
            })
        })
        .then(res => res.json())
        .then(res => {
            if(res.status === 'success') fetchDataFromSheets();
        });
    }
}

function filterStudents() {
    renderStudentsTable();
}

function getInitials(name) {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function renderStudentsTable() {
    const grid = document.getElementById('student-grid');
    const selectedClass = document.getElementById('filter-class-students').value;
    const searchVal = (document.getElementById('search-student') ? document.getElementById('search-student').value.toLowerCase() : "");
    
    grid.innerHTML = '';

    let displayStudents = students;
    if (selectedClass) {
        displayStudents = displayStudents.filter(s => s.classId === selectedClass);
    }
    if (searchVal) {
        displayStudents = displayStudents.filter(s => s.name.toLowerCase().includes(searchVal) || s.id.toLowerCase().includes(searchVal));
    }

    if(displayStudents.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">មិនមានទិន្នន័យសិស្សទេ</div>';
        return;
    }

    displayStudents.forEach((student) => {
        const cls = classes.find(c => c.id === student.classId);
        const className = cls ? cls.name : 'គ្មានថ្នាក់';
        
        const card = document.createElement('div');
        card.className = 'card student-card';
        card.innerHTML = `
            <div class="student-card-header">
                <div class="avatar active" style="background: #f59e0b;">${getInitials(student.name)}</div>
                <div class="user-details">
                    <h4>${student.name}</h4>
                    <p>${student.gender}</p>
                    <span class="badge">${className}</span>
                </div>
            </div>
            <div class="student-card-info">
                <div><i class='bx bx-calendar'></i> កំណើត: ពុំទាន់មាន</div>
                <div><i class='bx bx-phone'></i> ពុំទាន់មាន</div>
                <div><i class='bx bx-map'></i> ពុំទាន់មាន</div>
            </div>
            <div class="card-footer">
                <button class="card-footer-btn" onclick="openStudentModal('${student.id}')"><i class='bx bx-edit-alt'></i> កែ</button>
                <button class="card-footer-btn delete" onclick="deleteStudent('${student.id}')"><i class='bx bx-trash'></i> លុប</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- Excel Import Logic ---
function handleExcelUpload(event) {
    const classInput = document.getElementById('filter-class-students').value;
    if (!classInput) {
        alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិននៅក្នុងបញ្ជីថ្នាក់រៀន!");
        return;
    }

    const file = event.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    if (fileExt === 'csv') {
        reader.onload = (evt) => {
            const json = evt.target.result.split('\n').map(row => row.split(','));
            processExcelData(json, classInput);
        };
        reader.readAsText(file);
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = window.XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = window.XLSX.utils.sheet_to_json(firstSheet, {header: 1});
            processExcelData(json, classInput);
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert("សូមជ្រើសរើស File ជាប្រភេទ .xlsx, .xls ឬ .csv");
    }
    event.target.value = ''; // Reset input
}

function processExcelData(rows, targetClassId) {
    const objToSave = {};
    students.forEach(s => { objToSave[s.id] = s; }); 

    let count = 0;
    
    rows.forEach(row => {
        if (row.length >= 2) {
            const name = String(row[0]).trim();
            const gender = String(row[1]).trim();
            
            if (name && gender && name !== 'ឈ្មោះ' && name !== 'Name' && name !== 'ឈ្មោះសិស្ស') {
                const id = 'STU-' + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 4);
                objToSave[id] = { id, name, gender, classId: targetClassId };
                count++;
            }
        }
    });

    if (count > 0) {
        alert(`កំពុងបញ្ចូលសិស្សចំនួន ${count} នាក់...`);
        fetch(WEB_APP_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "updateStudents",
                students: objToSave
            })
        })
        .then(res => res.json())
        .then(res => {
            if(res.status === 'success') {
                alert(`បានបញ្ចូលសិស្សចំនួន ${count} នាក់ដោយជោគជ័យពី File!`);
                fetchDataFromSheets();
            } else {
                alert("មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ!");
                fetchDataFromSheets();
            }
        }).catch(err => {
            alert("មានបញ្ហាក្នុងការភ្ជាប់ទៅ Google Sheets!");
            fetchDataFromSheets();
        });
    } else {
        alert("មិនមានទិន្នន័យត្រឹមត្រូវទេ។");
    }
}

// --- Attendance Logic ---

function getStatusText(status) {
    if(status === 'present') return '<span class="status-badge present">មានវត្តមាន</span>';
    if(status === 'late') return '<span class="status-badge late">យឺត</span>';
    if(status === 'absent') return '<span class="status-badge absent">អវត្តមាន</span>';
    if(status === 'leave') return '<span class="status-badge leave">មានច្បាប់</span>';
    return '<span class="status-badge absent">អវត្តមាន</span>';
}

function renderAttendanceTable() {
    const list = document.getElementById('attendance-list');
    const selectedDate = attendanceDateInput.value;
    const selectedSubject = document.getElementById('filter-subject-attendance').value;
    const selectedClass = document.getElementById('filter-class-attendance').value;
    const searchVal = document.getElementById('search-attendance') ? document.getElementById('search-attendance').value.toLowerCase() : "";

    list.innerHTML = '';
    
    // Reset stats
    document.getElementById('att-stat-present').textContent = 0;
    document.getElementById('att-stat-late').textContent = 0;
    document.getElementById('att-stat-absent').textContent = 0;
    document.getElementById('att-stat-leave').textContent = 0;

    if (!selectedClass || !selectedSubject) {
        list.innerHTML = '<tr><td colspan="5" style="text-align: center;">សូមជ្រើសរើសមុខវិជ្ជា និងថ្នាក់រៀនសិន!</td></tr>';
        return;
    }

    let displayStudents = students.filter(s => s.classId === selectedClass);
    
    if (searchVal) {
        displayStudents = displayStudents.filter(s => s.name.toLowerCase().includes(searchVal) || s.id.toLowerCase().includes(searchVal));
    }

    if(displayStudents.length === 0) {
        list.innerHTML = '<tr><td colspan="5" style="text-align: center;">មិនមានសិស្សក្នុងថ្នាក់នេះទេ</td></tr>';
        return;
    }

    const recordKey = selectedDate + "_" + selectedSubject;
    const currentRecords = attendanceRecords[recordKey] || {};
    let countPresent = 0, countLate = 0, countAbsent = 0, countLeave = 0;

    displayStudents.forEach((student) => {
        const status = currentRecords[student.id] || 'absent';
        if(status === 'present') countPresent++;
        if(status === 'late') countLate++;
        if(status === 'absent') countAbsent++;
        if(status === 'leave') countLeave++;

        const cls = classes.find(c => c.id === student.classId);
        const className = cls ? cls.name : '';

        // Placeholder for attendance rate logic
        const mockRate = Math.floor(Math.random() * 20) + 80; 

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="student-col">
                    <div class="avatar active" style="background: #f59e0b;">${getInitials(student.name)}</div>
                    <div class="student-info">
                        <h4>${student.name}</h4>
                        <p>${student.id}</p>
                    </div>
                </div>
            </td>
            <td>${className}</td>
            <td>
                <div class="att-rate-col">
                    <div class="progress-bar"><div class="progress bg-green" style="width: ${mockRate}%;"></div></div>
                    <span>${mockRate}%</span>
                </div>
            </td>
            <td>${getStatusText(status)}</td>
            <td>
                <button class="btn-outline-blue" onclick="openChangeAttModal('${student.id}', '${student.name}')">ប្ដូរ</button>
            </td>
        `;
        list.appendChild(tr);
    });

    const total = displayStudents.length;
    
    document.getElementById('att-stat-present').textContent = countPresent;
    document.getElementById('prog-present').style.width = total ? (countPresent/total*100) + '%' : '0%';
    document.getElementById('pct-present').textContent = total ? Math.round(countPresent/total*100) + '% នៃសិស្ស' : '0% នៃសិស្ស';
    
    document.getElementById('att-stat-late').textContent = countLate;
    document.getElementById('prog-late').style.width = total ? (countLate/total*100) + '%' : '0%';
    document.getElementById('pct-late').textContent = total ? Math.round(countLate/total*100) + '% នៃសិស្ស' : '0% នៃសិស្ស';

    document.getElementById('att-stat-absent').textContent = countAbsent;
    document.getElementById('prog-absent').style.width = total ? (countAbsent/total*100) + '%' : '0%';
    document.getElementById('pct-absent').textContent = total ? Math.round(countAbsent/total*100) + '% នៃសិស្ស' : '0% នៃសិស្ស';

    document.getElementById('att-stat-leave').textContent = countLeave;
    document.getElementById('prog-leave').style.width = total ? (countLeave/total*100) + '%' : '0%';
    document.getElementById('pct-leave').textContent = total ? Math.round(countLeave/total*100) + '% នៃសិស្ស' : '0% នៃសិស្ស';
}

function bulkSetAttendance(statusValue) {
    const selectedDate = attendanceDateInput.value;
    const selectedSubject = document.getElementById('filter-subject-attendance').value;
    const selectedClass = document.getElementById('filter-class-attendance').value;
    
    if(!selectedDate || !selectedSubject || !selectedClass) {
        alert("សូមជ្រើសរើសកាលបរិច្ឆេទ មុខវិជ្ជា និងថ្នាក់រៀនសិន!");
        return;
    }
    
    if(!confirm(`តើអ្នកពិតជាចង់ដាក់សិស្សទាំងអស់ក្នុងថ្នាក់នេះឱ្យ "${statusValue}" មែនទេ?`)) return;
    
    const recordKey = selectedDate + "_" + selectedSubject;
    const currentRecords = attendanceRecords[recordKey] || {};
    let displayStudents = students.filter(s => s.classId === selectedClass);
    
    displayStudents.forEach(student => {
        currentRecords[student.id] = statusValue;
    });
    
    saveAttendanceDataToServer(recordKey, currentRecords);
}

const changeAttModal = document.getElementById('change-att-modal');

function openChangeAttModal(studentId, studentName) {
    document.getElementById('change-att-student-id').value = studentId;
    document.getElementById('change-att-student-name').textContent = studentName;
    changeAttModal.classList.add('active');
}

function closeChangeAttModal() {
    changeAttModal.classList.remove('active');
}

function saveSingleAttendance(statusValue) {
    const selectedDate = attendanceDateInput.value;
    const selectedSubject = document.getElementById('filter-subject-attendance').value;
    const studentId = document.getElementById('change-att-student-id').value;
    
    if(!selectedDate || !selectedSubject || !studentId) return;
    
    const recordKey = selectedDate + "_" + selectedSubject;
    const currentRecords = attendanceRecords[recordKey] || {};
    currentRecords[studentId] = statusValue;
    
    closeChangeAttModal();
    saveAttendanceDataToServer(recordKey, currentRecords);
}

function saveAttendanceDataToServer(date, records) {
    fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            action: "updateAttendance",
            date: date,
            records: records
        })
    })
    .then(res => res.json())
    .then(res => {
        if(res.status === 'success') {
            fetchDataFromSheets();
        } else {
            alert("មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ!");
        }
    }).catch(err => {
        alert("មានបញ្ហាក្នុងការភ្ជាប់ទៅ Google Sheets!");
    });
}

// --- QR Code Logic ---
const qrModal = document.getElementById('qr-modal');
let qrcode = null;

function generateQR() {
    const selectedDate = attendanceDateInput.value || new Date().toISOString().split('T')[0];
    const selectedClass = document.getElementById('filter-class-attendance').value;
    const selectedSubject = document.getElementById('filter-subject-attendance').value;
    
    if(!selectedClass || !selectedSubject) {
        alert("សូមជ្រើសរើសថ្នាក់រៀន និងមុខវិជ្ជាជាមុនសិន មុននឹងបង្កើត QR Code!");
        return;
    }

    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
    const scanUrl = `${baseUrl}/scan.html?date=${selectedDate}&classId=${selectedClass}&subjectId=${selectedSubject}`;
    
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    
    qrcode = new QRCode(qrContainer, {
        text: scanUrl,
        width: 200,
        height: 200,
        colorDark : "#111827",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    document.getElementById('qr-link').textContent = scanUrl;
    qrModal.classList.add('active');
}

function closeQRModal() {
    qrModal.classList.remove('active');
}

// --- Subjects Logic ---
const subjectModal = document.getElementById('subject-modal');
const subjectForm = document.getElementById('subject-form');

function populateSubjectDropdowns() {
    const filterSub = document.getElementById('filter-subject-attendance');
    const regSubSelect = document.getElementById('reg-subject');
    const modalSubSelect = document.getElementById('modal-user-subject');
    
    if (filterSub) {
        filterSub.innerHTML = '<option value="">ជ្រើសរើសមុខវិជ្ជា</option>';
        subjects.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.id;
            opt.textContent = sub.name;
            filterSub.appendChild(opt);
        });
    }

    if (regSubSelect) {
        regSubSelect.innerHTML = '<option value="">-- ជ្រើសរើសមុខវិជ្ជាបង្រៀន --</option>';
        subjects.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.id;
            opt.textContent = sub.name;
            regSubSelect.appendChild(opt);
        });
    }

    if (modalSubSelect) {
        modalSubSelect.innerHTML = '<option value="">-- ជ្រើសរើសមុខវិជ្ជាបង្រៀន --</option>';
        subjects.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.id;
            opt.textContent = sub.name;
            modalSubSelect.appendChild(opt);
        });
    }
}

function openSubjectModal(id = null) {
    document.getElementById('subject-modal-title').textContent = id ? 'កែប្រែមុខវិជ្ជា' : 'បន្ថែមមុខវិជ្ជាថ្មី';
    
    if(id) {
        const sub = subjects.find(s => s.id === id);
        if(sub) {
            document.getElementById('subject-id').value = sub.id;
            document.getElementById('subject-name').value = sub.name;
        }
    } else {
        subjectForm.reset();
        document.getElementById('subject-id').value = '';
    }
    subjectModal.classList.add('active');
}

function closeSubjectModal() {
    subjectModal.classList.remove('active');
}

if(subjectForm) {
    subjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const idInput = document.getElementById('subject-id').value;
        const nameInput = document.getElementById('subject-name').value;

        if (!nameInput.trim()) {
            alert("សូមបញ្ចូលឈ្មោះមុខវិជ្ជា!");
            return;
        }

        const submitBtn = subjectForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> កំពុងរក្សាទុក...';
        submitBtn.disabled = true;

        const newId = idInput ? idInput : "SUB-" + Date.now();
        
        const newSubjects = [...subjects];
        if(idInput) {
            const idx = newSubjects.findIndex(s => s.id === idInput);
            if(idx > -1) newSubjects[idx].name = nameInput;
        } else {
            newSubjects.push({ id: newId, name: nameInput });
        }

        const payload = {};
        newSubjects.forEach(s => payload[s.id] = s);

        fetch(WEB_APP_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "updateSubjects",
                subjects: payload
            })
        })
        .then(res => res.json())
        .then(res => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            if(res.status === 'success') {
                closeSubjectModal();
                fetchDataFromSheets();
            } else {
                alert("មានបញ្ហាក្នុងការរក្សាទុក!");
            }
        }).catch(err => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            alert("មានបញ្ហាក្នុងការភ្ជាប់ទៅ Server!");
        });
    });
}

function deleteSubject(id) {
    if(confirm('តើអ្នកពិតជាចង់លុបមុខវិជ្ជានេះមែនទេ? (ទិន្នន័យវត្តមានសម្រាប់មុខវិជ្ជានេះអាចនឹងបាត់បង់)')) {
        fetch(WEB_APP_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "deleteSubject",
                subjectId: id
            })
        })
        .then(res => res.json())
        .then(res => {
            if(res.status === 'success') fetchDataFromSheets();
        });
    }
}

function renderSubjectsTable() {
    const grid = document.getElementById('subject-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    document.getElementById('subject-count-text').textContent = `${subjects.length} មុខវិជ្ជា`;

    if(subjects.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">មិនមានទិន្នន័យមុខវិជ្ជាទេ</div>';
        return;
    }

    subjects.forEach((s) => {
        const card = document.createElement('div');
        card.className = 'card class-card';
        card.innerHTML = `
            <div class="class-icon" style="background: var(--blue);"><i class='bx bx-book' style="color: white;"></i></div>
            <h3>${s.name}</h3>
            <p>មុខវិជ្ជា</p>
            <div class="class-actions">
                <button class="btn-icon" onclick="openSubjectModal('${s.id}')"><i class='bx bx-pencil'></i></button>
                <button class="btn-icon delete" onclick="deleteSubject('${s.id}')"><i class='bx bx-trash'></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ==========================================================
// 🏆 Scores Management
// ==========================================================

const scoreFilterForm = document.getElementById('score-filter-form');
const scoreClassSelect = document.getElementById('score-class-select');
const scoreMonthSelect = document.getElementById('score-month-select');
const scoreContent = document.getElementById('score-content');

// Set default month to current month
const today = new Date();
const currentMonth = today.toISOString().substring(0, 7); // YYYY-MM
if(scoreMonthSelect) {
    scoreMonthSelect.value = currentMonth;
}

if(scoreClassSelect && scoreMonthSelect) {
    scoreClassSelect.addEventListener('change', renderScoresTable);
    scoreMonthSelect.addEventListener('change', renderScoresTable);
}

function renderScoresTable() {
    if(!scoreContent) return;
    
    const classId = scoreClassSelect.value;
    const month = scoreMonthSelect.value;
    
    if(!classId || !month) {
        scoreContent.innerHTML = `
            <div class="card empty-state">
                <i class='bx bx-medal'></i>
                <h3>សូមជ្រើសរើសថ្នាក់ និងខែដើម្បីមើល ឬបញ្ចូលពិន្ទុ</h3>
            </div>
        `;
        return;
    }
    
    const classStudents = students.filter(s => s.classId === classId);
    if(classStudents.length === 0) {
        scoreContent.innerHTML = `
            <div class="card empty-state">
                <i class='bx bx-user-x'></i>
                <h3>មិនមានសិស្សក្នុងថ្នាក់នេះទេ</h3>
            </div>
        `;
        return;
    }

    if(subjects.length === 0) {
        scoreContent.innerHTML = `
            <div class="card empty-state">
                <i class='bx bx-book'></i>
                <h3>សូមបន្ថែមមុខវិជ្ជាសិន</h3>
            </div>
        `;
        return;
    }

    const monthClassId = `${month}_${classId}`;
    const currentScores = scores[monthClassId] || {};

    let html = `
    <div class="card" style="overflow-x: auto;">
        <table class="attendance-table" id="scores-table">
            <thead>
                <tr>
                    <th>ឈ្មោះសិស្ស</th>
                    ${subjects.map(sub => `<th style="text-align:center;">${sub.name}</th>`).join('')}
                    <th style="text-align:center;">សរុប</th>
                    <th style="text-align:center;">មធ្យមភាគ</th>
                    <th style="text-align:center;">ចំណាត់ថ្នាក់</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Calculate totals and averages first to determine ranking
    const studentStats = classStudents.map(student => {
        let total = 0;
        let count = 0;
        const studentScores = currentScores[student.id] || {};
        
        subjects.forEach(sub => {
            const score = parseFloat(studentScores[sub.id]) || 0;
            total += score;
            if (studentScores[sub.id] !== undefined && studentScores[sub.id] !== "") {
                count++;
            }
        });
        
        const average = subjects.length > 0 ? (total / subjects.length) : 0;
        return { student, total, average, scores: studentScores };
    });

    // Sort by average descending to assign ranks
    const sortedStats = [...studentStats].sort((a, b) => b.average - a.average);
    
    // Assign ranks
    const rankMap = {};
    let currentRank = 1;
    let prevAverage = -1;
    let skip = 0;

    sortedStats.forEach((stat, index) => {
        if(stat.average === 0 && stat.total === 0) {
            rankMap[stat.student.id] = "-";
            return;
        }
        
        if (stat.average === prevAverage) {
            skip++;
        } else {
            currentRank += skip;
            skip = 1;
            prevAverage = stat.average;
        }
        rankMap[stat.student.id] = currentRank;
    });

    // Render Rows
    studentStats.forEach(stat => {
        html += `<tr>
            <td><strong>${stat.student.name}</strong><br><small style="color:var(--text-secondary)">${stat.student.id}</small></td>
        `;
        
        subjects.forEach(sub => {
            const val = stat.scores[sub.id] !== undefined ? stat.scores[sub.id] : '';
            html += `<td style="text-align:center;">
                <input type="number" class="form-control score-input" 
                    data-student-id="${stat.student.id}" 
                    data-subject-id="${sub.id}" 
                    value="${val}" 
                    style="width: 70px; text-align: center; display: inline-block; padding: 8px;" 
                    min="0" />
            </td>`;
        });

        html += `
            <td style="text-align:center; font-weight: bold; color: var(--primary);">${stat.total.toFixed(2).replace(/\.00$/, '')}</td>
            <td style="text-align:center; font-weight: bold; color: var(--green);">${stat.average.toFixed(2).replace(/\.00$/, '')}</td>
            <td style="text-align:center;">
                <span class="status-badge" style="background: var(--blue); color: white;">${rankMap[stat.student.id]}</span>
            </td>
        </tr>`;
    });

    html += `
            </tbody>
        </table>
    </div>
    `;

    scoreContent.innerHTML = html;

    // Attach input listeners for live updates
    document.querySelectorAll('.score-input').forEach(input => {
        input.addEventListener('input', () => {
            saveScoreLocally(classId, month);
        });
    });
}

function saveScoreLocally(classId, month) {
    const monthClassId = `${month}_${classId}`;
    if (!scores[monthClassId]) {
        scores[monthClassId] = {};
    }

    const inputs = document.querySelectorAll('.score-input');
    inputs.forEach(input => {
        const studentId = input.getAttribute('data-student-id');
        const subjectId = input.getAttribute('data-subject-id');
        const val = input.value;
        
        if (!scores[monthClassId][studentId]) {
            scores[monthClassId][studentId] = {};
        }
        
        if(val !== "") {
            scores[monthClassId][studentId][subjectId] = parseFloat(val);
        } else {
            delete scores[monthClassId][studentId][subjectId];
        }
    });
    
    // We update local object so when Save is clicked, it sends correct data.
    // Real-time rank update would require DOM diffing or full re-render (which steals focus), 
    // so we just let them click save to see updated ranks.
}

if(scoreFilterForm) {
    scoreFilterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const classId = scoreClassSelect.value;
        const month = scoreMonthSelect.value;
        if(!classId || !month) return;

        const btn = document.getElementById('btn-save-scores');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> កំពុងរក្សាទុក...';
        btn.disabled = true;
        
        // Force update local object from inputs before saving
        saveScoreLocally(classId, month);

        const monthClassId = `${month}_${classId}`;
        const recordsToSave = scores[monthClassId] || {};

        fetch(WEB_APP_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "updateScores",
                monthClassId: monthClassId,
                records: recordsToSave
            })
        })
        .then(res => res.json())
        .then(res => {
            if(res.status === 'success') {
                renderScoresTable(); // Re-render to update ranks visually
                alert("រក្សាទុកពិន្ទុបានជោគជ័យ!");
            } else {
                alert("មានបញ្ហាក្នុងការរក្សាទុក!");
            }
        })
        .catch(err => {
            console.error(err);
            alert("មានបញ្ហាក្នុងការភ្ជាប់ទៅ Server!");
        })
        .finally(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    });
}

// ==========================================================
// 📊 Reports Management
// ==========================================================

const reportFilterForm = document.getElementById('report-filter-form');
const reportTypeSelect = document.getElementById('report-type');
const reportDateGroup = document.getElementById('report-date-group');
const reportMonthGroup = document.getElementById('report-month-group');
const reportSemesterGroup = document.getElementById('report-semester-group');
const reportContent = document.getElementById('report-content');
const btnExportExcel = document.getElementById('btn-export-excel');

if (reportTypeSelect) {
    reportTypeSelect.addEventListener('change', (e) => {
        const type = e.target.value;
        reportDateGroup.style.display = type === 'daily' ? 'block' : 'none';
        reportMonthGroup.style.display = type === 'monthly' ? 'block' : 'none';
        reportSemesterGroup.style.display = type === 'semester' ? 'block' : 'none';
    });
}

if (reportFilterForm) {
    reportFilterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        renderReportsTable();
    });
}

if (btnExportExcel) {
    btnExportExcel.addEventListener('click', exportToExcel);
}

function renderReportsTable() {
    if (!reportContent) return;
    
    const type = document.getElementById('report-type').value;
    const classId = document.getElementById('report-class-select').value;
    
    let displayStudents = students;
    if (classId) {
        displayStudents = students.filter(s => s.classId === classId);
    }
    
    if (displayStudents.length === 0) {
        reportContent.innerHTML = `
            <div class="card empty-state">
                <i class='bx bx-user-x'></i>
                <h3>មិនមានសិស្សក្នុងថ្នាក់នេះទេ</h3>
            </div>
        `;
        btnExportExcel.disabled = true;
        return;
    }

    let html = `<div class="card" style="overflow-x: auto;">
        <table class="attendance-table" id="report-table">`;
    
    if (type === 'daily') {
        const date = document.getElementById('report-date-select').value;
        if (!date) return alert("សូមជ្រើសរើសកាលបរិច្ឆេទ");
        
        const dateRecords = attendanceRecords[date] || {};
        
        html += `
            <thead>
                <tr>
                    <th>អត្តលេខ</th>
                    <th>ឈ្មោះសិស្ស</th>
                    <th>ភេទ</th>
                    <th>វត្តមាន (ថ្ងៃទី ${date})</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        displayStudents.forEach(s => {
            const status = dateRecords[s.id] || '-';
            let statusText = status === 'present' ? 'វត្តមាន' : 
                             status === 'absent' ? 'អវត្តមាន' : 
                             status === 'permission' ? 'ច្បាប់' : '-';
            html += `
                <tr>
                    <td>${s.id}</td>
                    <td>${s.name}</td>
                    <td>${s.gender}</td>
                    <td>${statusText}</td>
                </tr>
            `;
        });
        
    } else if (type === 'monthly') {
        const month = document.getElementById('report-month-select').value;
        if (!month) return alert("សូមជ្រើសរើសខែ");
        
        html += `
            <thead>
                <tr>
                    <th>អត្តលេខ</th>
                    <th>ឈ្មោះសិស្ស</th>
                    <th>សរុបច្បាប់</th>
                    <th>សរុបអវត្តមាន</th>
                    <th>ពិន្ទុសរុបប្រចាំខែ</th>
                    <th>មធ្យមភាគប្រចាំខែ</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        displayStudents.forEach(s => {
            let permissionCount = 0;
            let absentCount = 0;
            
            // Calculate attendance for the month
            Object.keys(attendanceRecords).forEach(dateKey => {
                if (dateKey.startsWith(month)) {
                    if (attendanceRecords[dateKey][s.id] === 'permission') permissionCount++;
                    if (attendanceRecords[dateKey][s.id] === 'absent') absentCount++;
                }
            });
            
            // Get Score for the month
            let totalScore = 0;
            let avgScore = 0;
            const monthClassId = `${month}_${s.classId}`;
            const stdScores = scores[monthClassId] && scores[monthClassId][s.id] ? scores[monthClassId][s.id] : {};
            
            let count = 0;
            subjects.forEach(sub => {
                const sc = parseFloat(stdScores[sub.id]) || 0;
                totalScore += sc;
                if (stdScores[sub.id] !== undefined && stdScores[sub.id] !== "") count++;
            });
            avgScore = subjects.length > 0 ? (totalScore / subjects.length) : 0;
            
            html += `
                <tr>
                    <td>${s.id}</td>
                    <td>${s.name}</td>
                    <td>${permissionCount}</td>
                    <td>${absentCount}</td>
                    <td>${totalScore.toFixed(2).replace(/\.00$/, '')}</td>
                    <td>${avgScore.toFixed(2).replace(/\.00$/, '')}</td>
                </tr>
            `;
        });
        
    } else if (type === 'semester') {
        const sem = document.getElementById('report-semester-select').value;
        
        // Define semester months (e.g., Sem 1: Nov-Apr, Sem 2: May-Oct)
        // Simplified approach: just check the month portion (01-12)
        // Using current year for simplicity, or we can check across all dates
        const sem1Months = ['11', '12', '01', '02', '03', '04'];
        const sem2Months = ['05', '06', '07', '08', '09', '10'];
        const targetMonths = sem === '1' ? sem1Months : sem2Months;
        
        html += `
            <thead>
                <tr>
                    <th>អត្តលេខ</th>
                    <th>ឈ្មោះសិស្ស</th>
                    <th>សរុបច្បាប់ (ឆមាសទី ${sem})</th>
                    <th>សរុបអវត្តមាន (ឆមាសទី ${sem})</th>
                    <th>មធ្យមភាគប្រចាំឆមាស</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        displayStudents.forEach(s => {
            let permissionCount = 0;
            let absentCount = 0;
            let semTotalAvg = 0;
            let monthCount = 0;
            
            // We need to iterate over all records and find if the month matches targetMonths
            Object.keys(attendanceRecords).forEach(dateKey => {
                const m = dateKey.substring(5, 7);
                if (targetMonths.includes(m)) {
                    if (attendanceRecords[dateKey][s.id] === 'permission') permissionCount++;
                    if (attendanceRecords[dateKey][s.id] === 'absent') absentCount++;
                }
            });
            
            // For scores, we need to find all monthClassIds that match this semester
            Object.keys(scores).forEach(monthClassKey => {
                if (monthClassKey.endsWith(`_${s.classId}`)) {
                    const monthStr = monthClassKey.substring(5, 7);
                    if (targetMonths.includes(monthStr)) {
                        const stdScores = scores[monthClassKey][s.id] || {};
                        let mTotal = 0;
                        subjects.forEach(sub => { mTotal += (parseFloat(stdScores[sub.id]) || 0); });
                        let mAvg = subjects.length > 0 ? (mTotal / subjects.length) : 0;
                        semTotalAvg += mAvg;
                        monthCount++;
                    }
                }
            });
            
            const finalAvg = monthCount > 0 ? (semTotalAvg / monthCount) : 0;
            
            html += `
                <tr>
                    <td>${s.id}</td>
                    <td>${s.name}</td>
                    <td>${permissionCount}</td>
                    <td>${absentCount}</td>
                    <td>${finalAvg.toFixed(2).replace(/\.00$/, '')}</td>
                </tr>
            `;
        });
    }
    
    html += `</tbody></table></div>`;
    reportContent.innerHTML = html;
    btnExportExcel.disabled = false;
}

function exportToExcel() {
    const table = document.getElementById('report-table');
    if (!table) return alert("មិនមានទិន្នន័យសម្រាប់ Export ទេ");
    
    const wb = XLSX.utils.table_to_book(table, {sheet: "Report"});
    
    const type = document.getElementById('report-type').value;
    let filename = `Report_${type}_${new Date().toISOString().slice(0,10)}.xlsx`;
    
    XLSX.writeFile(wb, filename);
}

// ==========================================
// 🔐 User Authentication & Authorization Logic
// ==========================================

function loadStoredUsers() {
    try {
        const stored = localStorage.getItem('app_users');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const userMap = new Map();
                appUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
                parsed.forEach(u => userMap.set(u.username.toLowerCase(), u));
                appUsers = Array.from(userMap.values());
            }
        }
    } catch (e) {
        console.error("Error loading stored users:", e);
    }
}

function saveUsersLocally() {
    try {
        localStorage.setItem('app_users', JSON.stringify(appUsers));
    } catch (e) {
        console.error("Error saving users locally:", e);
    }
}

function saveUsersToSheets() {
    const userObj = {};
    appUsers.forEach(u => { userObj[u.id] = u; });
    fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateUsers', users: userObj })
    }).catch(err => console.error("Error syncing users to sheets:", err));
}

function checkAuthSession() {
    try {
        const storedUser = localStorage.getItem('current_user') || sessionStorage.getItem('current_user');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            document.getElementById('auth-overlay').classList.add('hidden');
            applyUserPermissions(currentUser);
        } else {
            document.getElementById('auth-overlay').classList.remove('hidden');
        }
    } catch (e) {
        document.getElementById('auth-overlay').classList.remove('hidden');
    }
}

function switchAuthTab(tab) {
    const loginTabBtn = document.getElementById('tab-login-btn');
    const registerTabBtn = document.getElementById('tab-register-btn');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    document.getElementById('login-error').style.display = 'none';
    document.getElementById('register-error').style.display = 'none';
    document.getElementById('register-success').style.display = 'none';

    if (tab === 'login') {
        loginTabBtn.classList.add('active');
        registerTabBtn.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        registerTabBtn.classList.add('active');
        loginTabBtn.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
        handleRegRoleChange();
    }
}

function handleRegRoleChange() {
    const role = document.getElementById('reg-role').value;
    const subjectGroup = document.getElementById('reg-subject-group');
    const classGroup = document.getElementById('reg-class-group');

    if (subjectGroup) subjectGroup.style.display = (role === 'subject_teacher') ? 'flex' : 'none';
    if (classGroup) classGroup.style.display = (role === 'class_monitor') ? 'flex' : 'none';
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const role = document.getElementById('login-role').value;
    const errorDiv = document.getElementById('login-error');

    errorDiv.style.display = 'none';

    const matchedUser = appUsers.find(u => 
        u.username.toLowerCase() === username && 
        u.password === password && 
        u.role === role
    );

    if (matchedUser) {
        currentUser = matchedUser;
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        document.getElementById('auth-overlay').classList.add('hidden');
        applyUserPermissions(currentUser);
    } else {
        errorDiv.textContent = '❌ ឈ្មោះគណនី, លេខសម្ងាត់ ឬតួនាទីមិនត្រឹមត្រូវទេ!';
        errorDiv.style.display = 'block';
    }
}

function handleRegisterSubmit(e) {
    e.preventDefault();
    const fullname = document.getElementById('reg-fullname').value.trim();
    const username = document.getElementById('reg-username').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const subjectId = document.getElementById('reg-subject').value;
    const classId = document.getElementById('reg-class').value;

    const errorDiv = document.getElementById('register-error');
    const successDiv = document.getElementById('register-success');
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    if (!fullname || !username || !password) {
        errorDiv.textContent = '❌ សូមបំពេញព័ត៌មានដែលចាំបាច់ទាំងអស់!';
        errorDiv.style.display = 'block';
        return;
    }

    const exists = appUsers.some(u => u.username.toLowerCase() === username);
    if (exists) {
        errorDiv.textContent = '❌ ឈ្មោះគណនីនេះមានរួចហើយ! សូមជ្រើសរើសឈ្មោះផ្សេង។';
        errorDiv.style.display = 'block';
        return;
    }

    const newUser = {
        id: 'usr_' + Date.now(),
        fullname: fullname,
        username: username,
        password: password,
        role: role,
        subjectId: role === 'subject_teacher' ? subjectId : '',
        classId: role === 'class_monitor' ? classId : ''
    };

    appUsers.push(newUser);
    saveUsersLocally();
    saveUsersToSheets();

    successDiv.textContent = '✅ បង្កើតគណនីជោគជ័យ! អ្នកអាចចូលប្រើប្រាស់បានឥឡូវនេះ។';
    successDiv.style.display = 'block';

    setTimeout(() => {
        document.getElementById('login-username').value = username;
        document.getElementById('login-password').value = password;
        document.getElementById('login-role').value = role;
        switchAuthTab('login');
    }, 1200);
}

function applyUserPermissions(user) {
    if (!user) return;

    // Reset dropdowns to ensure all options are available before filtering
    if (typeof populateClassDropdowns === 'function') populateClassDropdowns();
    if (typeof populateSubjectDropdowns === 'function') populateSubjectDropdowns();

    // 1. Header Display Update
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');

    if (nameEl) nameEl.textContent = user.fullname;

    let roleTitle = 'គ្រូបន្ទុកថ្នាក់';
    let roleCss = 'role-teacher';

    if (user.role === 'subject_teacher') {
        const sub = subjects.find(s => s.id === user.subjectId);
        roleTitle = sub ? `គ្រូមុខវិជ្ជា (${sub.name})` : 'គ្រូមុខវិជ្ជា';
        roleCss = 'role-subject-teacher';
    } else if (user.role === 'class_monitor') {
        const cls = classes.find(c => c.id === user.classId);
        roleTitle = cls ? `ប្រធានថ្នាក់: ${cls.name} (Updated)` : 'ប្រធានថ្នាក់';
        roleCss = 'role-class-monitor';
    } else if (user.role === 'general_manager') {
        roleTitle = 'អ្នកគ្រប់គ្រងទូទៅ';
        roleCss = 'role-general-manager';
    }

    if (roleEl) {
        roleEl.textContent = roleTitle;
        roleEl.className = `role-badge ${roleCss}`;
    }

    const headerManageBtn = document.getElementById('header-manage-users-btn');
    if (headerManageBtn) {
        headerManageBtn.style.display = (user.role === 'teacher' || user.role === 'general_manager') ? 'flex' : 'none';
    }

    // 2. Sidebar Navigation Filtering
    const navLinks = document.querySelectorAll('.nav-link');
    const tabContents = document.querySelectorAll('.tab-content');

    const rolePermissions = {
        general_manager: ['dashboard', 'students', 'classes', 'subjects', 'attendance', 'scores', 'reports', 'users'],
        teacher: ['dashboard', 'students', 'classes', 'subjects', 'attendance', 'scores', 'reports', 'users'],
        subject_teacher: ['attendance', 'scores', 'subjects', 'reports'],
        class_monitor: ['attendance']
    };

    renderUsersTable();

    const allowedTabs = rolePermissions[user.role] || rolePermissions.teacher;
    let currentActiveAllowed = false;

    navLinks.forEach(link => {
        const tabId = link.getAttribute('data-tab');
        if (allowedTabs.includes(tabId)) {
            link.style.display = 'flex';
            if (link.classList.contains('active')) {
                currentActiveAllowed = true;
            }
        } else {
            link.style.display = 'none';
            link.classList.remove('active');
        }
    });

    if (!currentActiveAllowed) {
        const defaultTabId = allowedTabs[0];
        navLinks.forEach(link => {
            if (link.getAttribute('data-tab') === defaultTabId) {
                link.classList.add('active');
                document.getElementById('page-title').textContent = link.querySelector('span').textContent;
            } else {
                link.classList.remove('active');
            }
        });
        tabContents.forEach(tab => {
            if (tab.id === defaultTabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    // 3. Pre-select filters based on role assignments
    const attClassSel = document.getElementById('filter-class-attendance');
    const studClassSel = document.getElementById('filter-class-students');
    const attSubSel = document.getElementById('filter-subject-attendance');
    
    // Reset disabled state first
    if (attClassSel) attClassSel.disabled = false;
    if (studClassSel) studClassSel.disabled = false;
    if (attSubSel) attSubSel.disabled = false;

    let filtersChanged = false;

    if (user.role === 'class_monitor' && user.classId) {
        const cls = classes.find(c => c.id === user.classId);
        const className = cls ? cls.name : user.classId;
        
        if (attClassSel) {
            attClassSel.innerHTML = `<option value="${user.classId}">${className}</option>`;
            attClassSel.value = user.classId;
            attClassSel.disabled = true;
        }
        if (studClassSel) {
            studClassSel.innerHTML = `<option value="${user.classId}">${className}</option>`;
            studClassSel.value = user.classId;
            studClassSel.disabled = true;
        }
        filtersChanged = true;
    }

    if (user.role === 'subject_teacher' && user.subjectId) {
        const sub = subjects.find(s => s.id === user.subjectId);
        const subName = sub ? sub.name : user.subjectId;

        if (attSubSel) {
            attSubSel.innerHTML = `<option value="${user.subjectId}">${subName}</option>`;
            attSubSel.value = user.subjectId;
            attSubSel.disabled = true;
        }
        filtersChanged = true;
    }
    
    if (filtersChanged) {
        setTimeout(() => {
            if (typeof renderAttendanceTable === 'function') renderAttendanceTable();
            if (typeof filterStudents === 'function') filterStudents();
        }, 50);
    }
}

function logoutUser() {
    if (confirm('តើអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធមែនទេ?')) {
        currentUser = null;
        localStorage.removeItem('current_user');
        sessionStorage.removeItem('current_user');
        document.getElementById('auth-overlay').classList.remove('hidden');
        switchAuthTab('login');
    }
}

// ==========================================
// 👥 Admin User / Class Monitor Management
// ==========================================

function renderUsersTable() {
    const listEl = document.getElementById('users-list');
    const countEl = document.getElementById('user-count-text');
    const roleFilter = document.getElementById('filter-user-role') ? document.getElementById('filter-user-role').value : '';

    if (!listEl) return;

    let filtered = appUsers;
    if (roleFilter) {
        filtered = appUsers.filter(u => u.role === roleFilter);
    }

    if (countEl) countEl.textContent = `${filtered.length} អ្នកប្រើប្រាស់`;

    if (filtered.length === 0) {
        listEl.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 30px;">មិនទាន់មានទិន្នន័យអ្នកប្រើប្រាស់ទេ</td></tr>`;
        return;
    }

    let html = '';
    filtered.forEach(user => {
        let roleBadgeHtml = '<span class="role-badge role-teacher">គ្រូបន្ទុកថ្នាក់</span>';
        let assignedTarget = '-';

        if (user.role === 'subject_teacher') {
            const sub = subjects.find(s => s.id === user.subjectId);
            roleBadgeHtml = '<span class="role-badge role-subject-teacher">គ្រូមុខវិជ្ជា</span>';
            assignedTarget = sub ? `មុខវិជ្ជា៖ ${sub.name}` : '-';
        } else if (user.role === 'class_monitor') {
            const cls = classes.find(c => c.id === user.classId);
            roleBadgeHtml = '<span class="role-badge role-class-monitor">ប្រធានថ្នាក់</span>';
            assignedTarget = cls ? `ថ្នាក់៖ ${cls.name}` : '-';
        } else if (user.role === 'general_manager') {
            roleBadgeHtml = '<span class="role-badge role-general-manager">អ្នកគ្រប់គ្រងទូទៅ</span>';
            assignedTarget = '-';
        }

        html += `
            <tr>
                <td style="font-weight: 600;">${user.fullname}</td>
                <td><code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; color: #0f172a;">${user.username}</code></td>
                <td>${roleBadgeHtml}</td>
                <td>${assignedTarget}</td>
                <td><span style="font-family: monospace; letter-spacing: 2px;">••••••</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="openUserModal('${user.id}')" title="កែប្រែ" style="margin-right: 6px; padding: 4px 8px;">
                        <i class='bx bx-edit-alt'></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser('${user.id}')" title="លុប" style="padding: 4px 8px;">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            </tr>
        `;
    });

    listEl.innerHTML = html;
}

function openUserModal(id = null) {
    const modal = document.getElementById('user-modal');
    const titleEl = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');

    populateClassDropdowns();
    populateSubjectDropdowns();

    if (id) {
        const u = appUsers.find(user => user.id === id);
        if (u) {
            titleEl.textContent = 'កែប្រែអ្នកប្រើប្រាស់ / ប្រធានថ្នាក់';
            document.getElementById('modal-user-id').value = u.id;
            document.getElementById('modal-user-fullname').value = u.fullname;
            document.getElementById('modal-user-username').value = u.username;
            document.getElementById('modal-user-password').value = u.password;
            document.getElementById('modal-user-role').value = u.role;
            document.getElementById('modal-user-class').value = u.classId || '';
            document.getElementById('modal-user-subject').value = u.subjectId || '';
        }
    } else {
        titleEl.textContent = 'បន្ថែមអ្នកប្រើប្រាស់ / ប្រធានថ្នាក់';
        form.reset();
        document.getElementById('modal-user-id').value = '';
        document.getElementById('modal-user-role').value = 'class_monitor';
    }

    handleModalRoleChange();
    modal.classList.add('active');
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
}

function handleModalRoleChange() {
    const role = document.getElementById('modal-user-role').value;
    const classGroup = document.getElementById('modal-user-class-group');
    const subjectGroup = document.getElementById('modal-user-subject-group');

    if (classGroup) classGroup.style.display = (role === 'class_monitor') ? 'block' : 'none';
    if (subjectGroup) subjectGroup.style.display = (role === 'subject_teacher') ? 'block' : 'none';
}

function handleSaveUserModal(e) {
    e.preventDefault();
    const id = document.getElementById('modal-user-id').value;
    const fullname = document.getElementById('modal-user-fullname').value.trim();
    const username = document.getElementById('modal-user-username').value.trim().toLowerCase();
    const password = document.getElementById('modal-user-password').value;
    const role = document.getElementById('modal-user-role').value;
    const classId = document.getElementById('modal-user-class').value;
    const subjectId = document.getElementById('modal-user-subject').value;

    if (!fullname || !username || !password) {
        alert('សូមបំពេញព័ត៌មានដែលចាំបាច់ទាំងអស់!');
        return;
    }

    if (id) {
        const u = appUsers.find(user => user.id === id);
        if (u) {
            u.fullname = fullname;
            u.username = username;
            u.password = password;
            u.role = role;
            u.classId = (role === 'class_monitor') ? classId : '';
            u.subjectId = (role === 'subject_teacher') ? subjectId : '';
        }
    } else {
        const exists = appUsers.some(u => u.username.toLowerCase() === username);
        if (exists) {
            alert('ឈ្មោះគណនីនេះមានរួចហើយ! សូមប្រើប្រាស់ឈ្មោះផ្សេង។');
            return;
        }
        const newUser = {
            id: 'usr_' + Date.now(),
            fullname,
            username,
            password,
            role,
            classId: (role === 'class_monitor') ? classId : '',
            subjectId: (role === 'subject_teacher') ? subjectId : ''
        };
        appUsers.push(newUser);
    }

    saveUsersLocally();
    saveUsersToSheets();
    renderUsersTable();
    closeUserModal();
}

function deleteUser(id) {
    const u = appUsers.find(user => user.id === id);
    if (!u) return;

    if (u.username === 'admin') {
        alert('មិនអាចលុបគណនី Admin ដើមបានទេ!');
        return;
    }

    if (confirm(`តើអ្នកពិតជាចង់លុបគណនី "${u.fullname}" មែនទេ?`)) {
        appUsers = appUsers.filter(user => user.id !== id);
        saveUsersLocally();
        saveUsersToSheets();
        renderUsersTable();
    }
}

// --- Password Visibility Toggle ---
function togglePasswordVisibility(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        iconElement.classList.remove('bx-show');
        iconElement.classList.add('bx-hide');
    } else {
        input.type = 'password';
        iconElement.classList.remove('bx-hide');
        iconElement.classList.add('bx-show');
    }
}

