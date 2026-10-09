function setupDummyData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var tasks = ss.getSheetByName("Tasks");
  if (!tasks) {
    tasks = ss.insertSheet("Tasks");
  } else {
    tasks.clear();
  }

  tasks.appendRow(["id", "assignee", "desc", "status", "completedAt"]);

  var assignees = ["u1", "u2", "u3", "u4", "u5"];
  var statuses = ["Open", "In Progress", "Review", "Complete"];
  var descs = [
    "Update sales dashboard",
    "Fix login page layout",
    "Write onboarding doc",
    "Review expense report",
    "Prepare weekly summary",
    "Check inventory levels",
    "Update contact list",
    "Schedule team meeting",
    "Test new feature",
    "Clean up old records"
  ];

  var rows = [];
  for (var i = 1; i <= 500; i++) {
    var id = "t" + i;
    var assignee = assignees[Math.floor(Math.random() * assignees.length)];
    var desc = descs[Math.floor(Math.random() * descs.length)];
    var status = statuses[Math.floor(Math.random() * statuses.length)];
    var completedAt = "";
    if (status === "Complete") {
      var day = Math.floor(Math.random() * 28) + 1;
      completedAt = "2025-10-" + (day < 10 ? "0" + day : day);
    }
    rows.push([id, assignee, desc, status, completedAt]);
  }

  tasks.getRange(2, 1, rows.length, 5).setValues(rows);

  var users = ss.getSheetByName("Users");
  if (!users) {
    users = ss.insertSheet("Users");
  } else {
    users.clear();
  }

  users.appendRow(["id", "name", "role", "attendanceRequired"]);
  users.appendRow(["u1", "Priya Sharma", "admin", true]);
  users.appendRow(["u2", "Rahul Mehta", "member", true]);
  users.appendRow(["u3", "Anjali Verma", "member", true]);
  users.appendRow(["u4", "Vikram Singh", "member", false]);
  users.appendRow(["u5", "Neha Gupta", "member", true]);
}

function createEmailTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "processEmailQueue") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("processEmailQueue")
    .timeBased()
    .everyMinutes(1)
    .create();
}
