function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get Students
  var studentSheet = ss.getSheetByName("Students");
  if (!studentSheet) {
    studentSheet = ss.insertSheet("Students");
    studentSheet.appendRow(["ID", "Name", "Gender", "ClassID"]);
  }
  var studentData = studentSheet.getDataRange().getValues();
  var students = {};
  for (var i = 1; i < studentData.length; i++) {
    students[studentData[i][0]] = {
      id: studentData[i][0],
      name: studentData[i][1],
      gender: studentData[i][2],
      classId: studentData[i][3] || ""
    };
  }

  // Get Classes
  var classSheet = ss.getSheetByName("Classes");
  if (!classSheet) {
    classSheet = ss.insertSheet("Classes");
    classSheet.appendRow(["ClassID", "ClassName"]);
  }
  var classData = classSheet.getDataRange().getValues();
  var classes = {};
  for (var i = 1; i < classData.length; i++) {
    classes[classData[i][0]] = {
      id: classData[i][0],
      name: classData[i][1]
    };
  }

  // Get Subjects
  var subjectSheet = ss.getSheetByName("Subjects");
  if (!subjectSheet) {
    subjectSheet = ss.insertSheet("Subjects");
    subjectSheet.appendRow(["SubjectID", "SubjectName"]);
  }
  var subjectData = subjectSheet.getDataRange().getValues();
  var subjects = {};
  for (var i = 1; i < subjectData.length; i++) {
    subjects[subjectData[i][0]] = {
      id: subjectData[i][0],
      name: subjectData[i][1]
    };
  }

  // Get Attendance
  var attSheet = ss.getSheetByName("Attendance");
  if (!attSheet) {
    attSheet = ss.insertSheet("Attendance");
    attSheet.appendRow(["Date", "Data"]);
  }
  var attData = attSheet.getDataRange().getValues();
  var attendance = {};
  for (var i = 1; i < attData.length; i++) {
    try {
      attendance[attData[i][0]] = JSON.parse(attData[i][1]);
    } catch(e) {}
  }

  // Get Scores
  var scoreSheet = ss.getSheetByName("Scores");
  if (!scoreSheet) {
    scoreSheet = ss.insertSheet("Scores");
    scoreSheet.appendRow(["MonthClassID", "Data"]);
  }
  var scoreData = scoreSheet.getDataRange().getValues();
  var scores = {};
  for (var i = 1; i < scoreData.length; i++) {
    try {
      scores[scoreData[i][0]] = JSON.parse(scoreData[i][1]);
    } catch(e) {}
  }

  return ContentService.createTextOutput(JSON.stringify({
    students: students,
    classes: classes,
    subjects: subjects,
    attendance: attendance,
    scores: scores
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "updateStudents") {
      var sheet = ss.getSheetByName("Students");
      sheet.clear();
      sheet.appendRow(["ID", "Name", "Gender", "ClassID"]);
      var students = data.students;
      for (var key in students) {
        var s = students[key];
        sheet.appendRow([s.id, s.name, s.gender, s.classId || ""]);
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "deleteStudent") {
      var sheet = ss.getSheetByName("Students");
      var studentId = data.studentId;
      var currentData = sheet.getDataRange().getValues();
      var newData = [];
      for (var i = 0; i < currentData.length; i++) {
        if (i === 0 || currentData[i][0] !== studentId) {
          newData.push(currentData[i]);
        }
      }
      sheet.clear();
      if (newData.length > 0) {
        sheet.getRange(1, 1, newData.length, newData[0].length).setValues(newData);
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "updateClasses") {
      var sheet = ss.getSheetByName("Classes");
      if (!sheet) {
        sheet = ss.insertSheet("Classes");
      }
      sheet.clear();
      sheet.appendRow(["ClassID", "ClassName"]);
      var classes = data.classes;
      for (var key in classes) {
        var c = classes[key];
        sheet.appendRow([c.id, c.name]);
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "deleteClass") {
      var sheet = ss.getSheetByName("Classes");
      var classId = data.classId;
      var currentData = sheet.getDataRange().getValues();
      var newData = [];
      for (var i = 0; i < currentData.length; i++) {
        if (i === 0 || currentData[i][0] !== classId) {
          newData.push(currentData[i]);
        }
      }
      sheet.clear();
      if (newData.length > 0) {
        sheet.getRange(1, 1, newData.length, newData[0].length).setValues(newData);
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "updateSubjects") {
      var sheet = ss.getSheetByName("Subjects");
      if (!sheet) {
        sheet = ss.insertSheet("Subjects");
      }
      sheet.clear();
      sheet.appendRow(["SubjectID", "SubjectName"]);
      var subjects = data.subjects;
      for (var key in subjects) {
        var sub = subjects[key];
        sheet.appendRow([sub.id, sub.name]);
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "deleteSubject") {
      var sheet = ss.getSheetByName("Subjects");
      var subjectId = data.subjectId;
      var currentData = sheet.getDataRange().getValues();
      var newData = [];
      for (var i = 0; i < currentData.length; i++) {
        if (i === 0 || currentData[i][0] !== subjectId) {
          newData.push(currentData[i]);
        }
      }
      sheet.clear();
      if (newData.length > 0) {
        sheet.getRange(1, 1, newData.length, newData[0].length).setValues(newData);
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "updateAttendance") {
      var sheet = ss.getSheetByName("Attendance");
      var date = data.date;
      var recordsStr = JSON.stringify(data.records);
      
      var currentData = sheet.getDataRange().getValues();
      var updated = false;
      
      for (var i = 1; i < currentData.length; i++) {
        if (currentData[i][0] === date) {
          sheet.getRange(i + 1, 2).setValue(recordsStr);
          updated = true;
          break;
        }
      }
      
      if (!updated) {
        sheet.appendRow([date, recordsStr]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "updateSingleAttendance") {
      var sheet = ss.getSheetByName("Attendance");
      var date = data.date;
      var studentId = data.studentId;
      var status = data.status;
      
      var currentData = sheet.getDataRange().getValues();
      var records = {};
      var rowIndex = -1;
      
      for (var i = 1; i < currentData.length; i++) {
        if (currentData[i][0] === date) {
          try {
            records = JSON.parse(currentData[i][1]);
          } catch(e) {}
          rowIndex = i + 1;
          break;
        }
      }
      
      records[studentId] = status;
      var recordsStr = JSON.stringify(records);
      
      if (rowIndex !== -1) {
        sheet.getRange(rowIndex, 2).setValue(recordsStr);
      } else {
        sheet.appendRow([date, recordsStr]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "updateScores") {
      var sheet = ss.getSheetByName("Scores");
      if (!sheet) {
        sheet = ss.insertSheet("Scores");
        sheet.appendRow(["MonthClassID", "Data"]);
      }
      var monthClassId = data.monthClassId;
      var recordsStr = JSON.stringify(data.records);
      
      var currentData = sheet.getDataRange().getValues();
      var updated = false;
      
      for (var i = 1; i < currentData.length; i++) {
        if (currentData[i][0] === monthClassId) {
          sheet.getRange(i + 1, 2).setValue(recordsStr);
          updated = true;
          break;
        }
      }
      
      if (!updated) {
        sheet.appendRow([monthClassId, recordsStr]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
