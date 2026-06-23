// ==========================================================
// ⚠️ សំខាន់ (IMPORTANT): លោកអ្នកត្រូវដាក់ Firebase Config នៅទីនេះ
// ==========================================================
const firebaseConfig = {
  apiKey: "AIzaSyDtekeiTTmcXwLWbljR7xEJewY6mOIm4uY",
  authDomain: "check-attendance-student.firebaseapp.com",
  databaseURL: "https://check-attendance-student-default-rtdb.firebaseio.com",
  projectId: "check-attendance-student",
  storageBucket: "check-attendance-student.firebasestorage.app",
  messagingSenderId: "555095566724",
  appId: "1:555095566724:web:88dbde996a8bb64f8ed5d1",
  measurementId: "G-CYPCDGTTW4"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// Get Date from URL or use today's date
const urlParams = new URLSearchParams(window.location.search);
let targetDate = urlParams.get('date');

if (!targetDate) {
    // Fallback to today if no date in URL
    const today = new Date();
    targetDate = today.toISOString().split('T')[0];
}

// Display Date
document.getElementById('date-display').textContent = "កាលបរិច្ឆេទ៖ " + targetDate;

// Load Students from Firebase
const studentSelect = document.getElementById('student-select');

database.ref('students').once('value').then((snapshot) => {
    const studentsData = snapshot.val();
    if (studentsData) {
        // Convert object to array
        const studentsList = Object.values(studentsData);
        
        // Sort by name (optional)
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
    alert("មានបញ្ហាក្នុងការភ្ជាប់ទៅកាន់ Database។ សូមពិនិត្យមើល Firebase Config របស់អ្នក!");
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

    // Save to Firebase under attendance/YYYY-MM-DD/studentId = "present"
    database.ref('attendance/' + targetDate + '/' + studentId).set('present')
        .then(() => {
            document.getElementById('form-section').style.display = 'none';
            document.getElementById('success-section').style.display = 'block';
            document.getElementById('success-icon').style.display = 'inline-block';
        })
        .catch(err => {
            console.error(err);
            alert("មានបញ្ហា! មិនអាចរក្សាទុកបានទេ។");
            submitBtn.disabled = false;
            submitBtn.innerHTML = "<i class='bx bx-check-circle'></i> ខ្ញុំមានវត្តមានថ្ងៃនេះ!";
        });
}
