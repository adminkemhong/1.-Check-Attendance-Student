// ==========================================================
// ⚠️ Google Sheets Configuration
// ==========================================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwQW0a52zFKVFPD1wM1KXY98uDcZl5tSUJo1xcFSNM-aBTQyW80_cr3ZIKv26P1iIfV/exec";

// Get Date from URL or use today's date
const urlParams = new URLSearchParams(window.location.search);
let targetDate = urlParams.get('date');
let targetClassId = urlParams.get('classId');

if (!targetDate) {
    // Fallback to today if no date in URL
    const today = new Date();
    targetDate = today.toISOString().split('T')[0];
}

// Display Date
document.getElementById('date-display').textContent = "កាលបរិច្ឆេទ៖ " + targetDate;

// Load Students from Google Sheets
const studentSelect = document.getElementById('student-select');
studentSelect.innerHTML = '<option value="">កំពុងទាញយកទិន្នន័យ...</option>';

fetch(WEB_APP_URL)
.then(res => res.json())
.then(data => {
    studentSelect.innerHTML = '<option value="">-- សូមជ្រើសរើសឈ្មោះរបស់អ្នក --</option>';
    const studentsData = data.students || {};
    let studentsList = Object.values(studentsData);
    
    if (targetClassId) {
        studentsList = studentsList.filter(s => s.classId === targetClassId);
    }

    if (studentsList.length > 0) {
        // Sort by name
        studentsList.sort((a, b) => a.name.localeCompare(b.name));
        
        studentsList.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = `${student.id} - ${student.name}`;
            studentSelect.appendChild(option);
        });
    } else {
        studentSelect.innerHTML = '<option value="">មិនទាន់មានទិន្នន័យសិស្សទេ</option>';
    }
}).catch(err => {
    console.error(err);
    alert("មានបញ្ហាក្នុងការភ្ជាប់ទៅកាន់ Google Sheets!");
    studentSelect.innerHTML = '<option value="">មានបញ្ហាភ្ជាប់ទិន្នន័យ</option>';
});

// Submit Attendance
function submitAttendance() {
    const studentId = studentSelect.value;
    if (!studentId) {
        alert("សូមជ្រើសរើសឈ្មោះរបស់អ្នកសិន!");
        return;
    }
    
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> កំពុងរក្សាទុក...";

    fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            action: "updateSingleAttendance",
            date: targetDate,
            studentId: studentId,
            status: "present"
        })
    })
    .then(res => res.json())
    .then(res => {
        if(res.status === 'success') {
            document.getElementById('form-section').style.display = 'none';
            document.getElementById('success-section').style.display = 'block';
            document.getElementById('success-icon').style.display = 'inline-block';
        } else {
            alert("មានបញ្ហា! មិនអាចរក្សាទុកបានទេ។");
            submitBtn.disabled = false;
            submitBtn.innerHTML = "<i class='bx bx-check-circle'></i> ខ្ញុំមានវត្តមានថ្ងៃនេះ!";
        }
    })
    .catch(err => {
        console.error(err);
        alert("មានបញ្ហាក្នុងការភ្ជាប់ទៅ Google Sheets!");
        submitBtn.disabled = false;
        submitBtn.innerHTML = "<i class='bx bx-check-circle'></i> ខ្ញុំមានវត្តមានថ្ងៃនេះ!";
    });
}
