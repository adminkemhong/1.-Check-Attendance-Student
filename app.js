// ==========================================================
// ⚠️ Google Sheets Configuration
// ==========================================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbywtsEiPsC_nNEbtfvSa_gBL7yoIU09-RDYrO-t-nOKhkW3xijbi3fuVu34XrBcuX-m/exec";

// Global State
let students = [];
let classes = [];
let attendanceRecords = {};

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
    
    setupNavigation();
    fetchDataFromSheets(); 
});

// --- Fetch Data ---
function fetchDataFromSheets() {
    document.getElementById('student-table-body').innerHTML = '<tr><td colspan="4" style="text-align: center;">កំពុងទាញយកទិន្នន័យ...</td></tr>';
    
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
    filterStudents.innerHTML = '<option value="">គ្រប់ថ្នាក់ទាំងអស់</option>';
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
        document.getElementById('class-table-body').innerHTML = '<tr><td colspan="3" style="text-align: center;">កំពុងលុប...</td></tr>';
        
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
    const tbody = document.getElementById('class-table-body');
    tbody.innerHTML = '';

    if(classes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">មិនមានទិន្នន័យថ្នាក់រៀនទេ</td></tr>';
        return;
    }

    classes.forEach((c) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.id}</td>
            <td>${c.name}</td>
            <td>
                <button class="btn btn-secondary" style="padding: 5px; display: inline-flex;" onclick="openClassModal('${c.id}')"><i class='bx bx-edit-alt'></i></button>
                <button class="btn btn-danger" style="padding: 5px; display: inline-flex;" onclick="deleteClass('${c.id}')"><i class='bx bx-trash'></i></button>
            </td>
        `;
        tbody.appendChild(tr);
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

    // Prepare all students object
    const objToSave = {};
    students.forEach(s => { objToSave[s.id] = s; });
    objToSave[studentObj.id] = studentObj; // Add or update

    // Save to Google Sheets
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
        document.getElementById('student-table-body').innerHTML = '<tr><td colspan="5" style="text-align: center;">កំពុងលុប...</td></tr>';
        
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

function renderStudentsTable() {
    const tbody = document.getElementById('student-table-body');
    const selectedClass = document.getElementById('filter-class-students').value;
    tbody.innerHTML = '';

    let displayStudents = students;
    if (selectedClass) {
        displayStudents = students.filter(s => s.classId === selectedClass);
    }

    if(displayStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">មិនមានទិន្នន័យសិស្សទេ</td></tr>';
        return;
    }

    displayStudents.forEach((student) => {
        const cls = classes.find(c => c.id === student.classId);
        const className = cls ? cls.name : 'គ្មានថ្នាក់';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>${student.gender}</td>
            <td><span class="status-badge" style="background:#e0e7ff; color:#4f46e5;">${className}</span></td>
            <td>
                <button class="btn btn-secondary" style="padding: 5px; display: inline-flex;" onclick="openStudentModal('${student.id}')"><i class='bx bx-edit-alt'></i></button>
                <button class="btn btn-danger" style="padding: 5px; display: inline-flex;" onclick="deleteStudent('${student.id}')"><i class='bx bx-trash'></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Excel Import Logic ---
function handleExcelUpload(event) {
    const classInput = document.getElementById('student-class').value;
    if (!classInput) {
        alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន មុននឹងបញ្ជូល Excel!");
        return;
    }

    const file = event.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    if (fileExt === 'csv') {
        reader.onload = (evt) => {
            const json = evt.target.result.split('\n').map(row => row.split(','));
            processExcelData(json);
        };
        reader.readAsText(file);
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = window.XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = window.XLSX.utils.sheet_to_json(firstSheet, {header: 1});
            processExcelData(json);
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert("សូមជ្រើសរើស File ជាប្រភេទ .xlsx, .xls ឬ .csv");
    }
    event.target.value = ''; // Reset input
}

function processExcelData(rows) {
    const objToSave = {};
    students.forEach(s => { objToSave[s.id] = s; }); // Keep existing

    let count = 0;
    
    rows.forEach(row => {
        if (row.length >= 2) {
            const name = String(row[0]).trim();
            const gender = String(row[1]).trim();
            
            // Skip header row
            if (name && gender && name !== 'ឈ្មោះ' && name !== 'Name' && name !== 'ឈ្មោះសិស្ស') {
                const id = 'STU-' + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 4);
                const classInput = document.getElementById('student-class').value;
                objToSave[id] = { id, name, gender, classId: classInput };
                count++;
            }
        }
    });

    if (count > 0) {
        document.getElementById('student-table-body').innerHTML = '<tr><td colspan="4" style="text-align: center;">កំពុងរក្សាទុកពី Excel...</td></tr>';
        const excelBtn = document.querySelector('#excel-upload-section button');
        const originalText = excelBtn.innerHTML;
        excelBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> កំពុងបញ្ចូល...";
        excelBtn.disabled = true;

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
            excelBtn.innerHTML = originalText;
            excelBtn.disabled = false;
            if(res.status === 'success') {
                alert(`បានបញ្ចូលសិស្សចំនួន ${count} នាក់ដោយជោគជ័យពី File!`);
                closeStudentModal();
                fetchDataFromSheets();
            } else {
                alert("មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ!");
                fetchDataFromSheets();
            }
        }).catch(err => {
            excelBtn.innerHTML = originalText;
            excelBtn.disabled = false;
            alert("មានបញ្ហាក្នុងការភ្ជាប់ទៅ Google Sheets!");
            fetchDataFromSheets();
        });
    } else {
        alert("មិនមានទិន្នន័យត្រឹមត្រូវទេ។ សូមប្រាកដថាជួរទី១ជា 'ឈ្មោះ' និងជួរទី២ជា 'ភេទ'។");
    }
}

// --- Attendance Logic ---
attendanceDateInput.addEventListener('change', renderAttendanceTable);

function renderAttendanceTable() {
    const tbody = document.getElementById('attendance-table-body');
    const selectedDate = attendanceDateInput.value;
    const selectedClass = document.getElementById('filter-class-attendance').value;

    tbody.innerHTML = '';
    
    if (!selectedClass) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន!</td></tr>';
        return;
    }

    let displayStudents = students.filter(s => s.classId === selectedClass);
    
    if(displayStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">មិនមានសិស្សក្នុងថ្នាក់នេះទេ</td></tr>';
        return;
    }

    const currentRecords = attendanceRecords[selectedDate] || {};

    displayStudents.forEach(student => {
        const status = currentRecords[student.id] || 'present';
        
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
    
    const btn = document.querySelector('button[onclick="saveAttendance()"]');
    btn.textContent = "កំពុងរក្សាទុក...";
    btn.disabled = true;

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
        btn.innerHTML = "<i class='bx bx-save'></i> រក្សាទុកវត្តមាន";
        btn.disabled = false;
        if(res.status === 'success') {
            alert("ទិន្នន័យវត្តមានត្រូវបានរក្សាទុកជោគជ័យ!");
            fetchDataFromSheets();
        } else {
            alert("មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ!");
        }
    }).catch(err => {
        btn.innerHTML = "<i class='bx bx-save'></i> រក្សាទុកវត្តមាន";
        btn.disabled = false;
        alert("មានបញ្ហាក្នុងការភ្ជាប់ទៅ Google Sheets!");
    });
}

// --- QR Code Logic ---
const qrModal = document.getElementById('qr-modal');
let qrcode = null;

function generateQR() {
    const selectedDate = attendanceDateInput.value;
    if(!selectedDate) {
        alert("សូមជ្រើសរើសកាលបរិច្ឆេទមុននឹងបង្កើត QR Code!");
        return;
    }

    const selectedClass = document.getElementById('filter-class-attendance').value;
    if(!selectedClass) {
        alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន មុននឹងបង្កើត QR Code!");
        return;
    }

    // Generate link based on current domain, pointing to scan.html
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
    const scanUrl = `${baseUrl}/scan.html?date=${selectedDate}&classId=${selectedClass}`;
    
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = ''; // clear previous
    
    // Create new QR Code
    qrcode = new QRCode(qrContainer, {
        text: scanUrl,
        width: 200,
        height: 200,
        colorDark : "#4f46e5",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    document.getElementById('qr-link').textContent = scanUrl;
    qrModal.classList.add('active');
}

function closeQRModal() {
    qrModal.classList.remove('active');
}
