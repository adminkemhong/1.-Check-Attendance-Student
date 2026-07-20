// ==========================================================
// ⚠️ Google Sheets Configuration
// ==========================================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwQW0a52zFKVFPD1wM1KXY98uDcZl5tSUJo1xcFSNM-aBTQyW80_cr3ZIKv26P1iIfV/exec";

// Global State
let students = [];
let classes = [];
let attendanceRecords = {};

// DOM Elements
const attendanceDateInput = document.getElementById('attendance-date');
const pageTitle = document.getElementById('page-title');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Set Default Date in Attendance Tab
    const today = new Date();
    attendanceDateInput.value = today.toISOString().split('T')[0];
    
    setupNavigation();
    fetchDataFromSheets(); 
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
            attendanceRecords = data.attendance || {};
            
            populateClassDropdowns();
            renderClassesTable();
            renderStudentsTable();
            renderAttendanceTable();
            updateDashboard();
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

    // Keep the default options
    filterStudents.innerHTML = '<option value="">ថ្នាក់ទាំងអស់</option>';
    filterAttendance.innerHTML = '<option value="">ជ្រើសរើសថ្នាក់រៀន...</option>';
    studentClassSelect.innerHTML = '<option value="">-- សូមជ្រើសរើសថ្នាក់រៀន --</option>';

    classes.forEach(c => {
        const option = `<option value="${c.id}">${c.name}</option>`;
        filterStudents.innerHTML += option;
        filterAttendance.innerHTML += option;
        studentClassSelect.innerHTML += option;
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

function setStatus(studentId, statusValue) {
    const radios = document.getElementsByName(`att_${studentId}`);
    for(let r of radios) {
        if(r.value === statusValue) r.checked = true;
    }
    // Update active class for visual buttons
    document.querySelectorAll(`.status-btn[data-id="${studentId}"]`).forEach(btn => {
        btn.classList.remove('active-present', 'active-absent', 'active-leave');
    });
    
    const activeBtn = document.querySelector(`.status-btn[data-id="${studentId}"][data-val="${statusValue}"]`);
    if(activeBtn) {
        if(statusValue === 'present') activeBtn.classList.add('active-present');
        if(statusValue === 'absent') activeBtn.classList.add('active-absent');
        if(statusValue === 'leave') activeBtn.classList.add('active-leave');
    }
}

function renderAttendanceTable() {
    const list = document.getElementById('attendance-list');
    const selectedDate = attendanceDateInput.value;
    const selectedClass = document.getElementById('filter-class-attendance').value;

    list.innerHTML = '';
    
    // Reset stats
    document.getElementById('att-stat-present').textContent = 0;
    document.getElementById('att-stat-absent').textContent = 0;
    document.getElementById('att-stat-leave').textContent = 0;

    if (!selectedClass) {
        list.innerHTML = '<div style="padding: 20px; text-align: center;">សូមជ្រើសរើសថ្នាក់រៀនសិន!</div>';
        return;
    }

    let displayStudents = students.filter(s => s.classId === selectedClass);
    
    if(displayStudents.length === 0) {
        list.innerHTML = '<div style="padding: 20px; text-align: center;">មិនមានសិស្សក្នុងថ្នាក់នេះទេ</div>';
        return;
    }

    const currentRecords = attendanceRecords[selectedDate] || {};
    let countPresent = 0, countAbsent = 0, countLeave = 0;

    displayStudents.forEach((student, index) => {
        const status = currentRecords[student.id] || 'present';
        if(status === 'present') countPresent++;
        if(status === 'absent') countAbsent++;
        if(status === 'leave') countLeave++;

        const cls = classes.find(c => c.id === student.classId);
        const className = cls ? cls.name : '';

        const row = document.createElement('div');
        row.className = 'card attendance-row';
        row.innerHTML = `
            <div class="user-info">
                <div class="avatar">${getInitials(student.name)}</div>
                <div class="user-details">
                    <h4>${student.name}</h4>
                    <p><span class="status-dot"></span> ${student.gender} . ${className}</p>
                </div>
            </div>
            <div class="attendance-actions">
                <!-- Hidden inputs for form saving -->
                <div style="display:none;">
                    <input type="radio" name="att_${student.id}" value="present" ${status==='present'?'checked':''}>
                    <input type="radio" name="att_${student.id}" value="absent" ${status==='absent'?'checked':''}>
                    <input type="radio" name="att_${student.id}" value="leave" ${status==='leave'?'checked':''}>
                </div>
                
                <!-- Visual Buttons -->
                <button class="status-btn ${status==='present'?'active-present':''}" data-id="${student.id}" data-val="present" onclick="setStatus('${student.id}', 'present')">មានវត្តមាន</button>
                <button class="status-btn ${status==='absent'?'active-absent':''}" data-id="${student.id}" data-val="absent" onclick="setStatus('${student.id}', 'absent')">អវត្តមាន</button>
                <button class="status-btn ${status==='leave'?'active-leave':''}" data-id="${student.id}" data-val="leave" onclick="setStatus('${student.id}', 'leave')">ច្បាប់</button>
                
                <input type="text" class="comment-input" placeholder="សម្គាល់...">
                <button class="btn btn-dark" style="padding: 6px 12px; margin-left: 10px; font-size: 0.85rem;" onclick="saveAttendance()"><i class='bx bx-save'></i> រក្សាទុក</button>
            </div>
        `;
        list.appendChild(row);
    });

    document.getElementById('att-stat-present').textContent = countPresent;
    document.getElementById('att-stat-absent').textContent = countAbsent;
    document.getElementById('att-stat-leave').textContent = countLeave;
}

function saveAttendance() {
    const selectedDate = attendanceDateInput.value;
    if(!selectedDate) {
        alert("សូមជ្រើសរើសកាលបរិច្ឆេទ!");
        return;
    }
    const selectedClass = document.getElementById('filter-class-attendance').value;
    if(!selectedClass) {
        alert("សូមជ្រើសរើសថ្នាក់រៀន!");
        return;
    }
    
    const currentRecords = {};
    let displayStudents = students.filter(s => s.classId === selectedClass);

    displayStudents.forEach(student => {
        const radios = document.getElementsByName(`att_${student.id}`);
        for(let radio of radios) {
            if(radio.checked) {
                currentRecords[student.id] = radio.value;
                break;
            }
        }
    });
    
    fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            action: "updateAttendance",
            date: selectedDate,
            records: currentRecords
        })
    })
    .then(res => res.json())
    .then(res => {
        if(res.status === 'success') {
            alert("ទិន្នន័យវត្តមានត្រូវបានរក្សាទុកជោគជ័យ!");
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
    
    if(!selectedClass) {
        alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន មុននឹងបង្កើត QR Code!");
        return;
    }

    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
    const scanUrl = `${baseUrl}/scan.html?date=${selectedDate}&classId=${selectedClass}`;
    
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
