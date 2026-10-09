function doGet(e) {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Portal API Tester");
}

function doPost(e) {
  var payload = JSON.parse(e.postData.contents);

  if (payload.action === "updateTask") {
    return respond(updateTask(payload));
  }

  if (payload.action === "setAttendanceRequired") {
    return respond(setAttendanceRequired(payload));
  }

  return respond({ success: false, error: "Unknown action" });
}

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateTask(payload) {
  var id = payload.id;
  var status = payload.status;

  if (!id || !status) {
    return { success: false, error: "id and status are required" };
  }

  var cache = CacheService.getScriptCache();
  var dupeKey = "upd_" + id + "_" + status;

  if (cache.get(dupeKey)) {
    return {
      success: true,
      duplicate: true,
      message: "Same update already applied within the last 10 seconds"
    };
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Tasks");
  var match = sheet.getRange("A:A").createTextFinder(id).matchEntireCell(true).findNext();

  if (!match) {
    return { success: false, error: "No task with id " + id };
  }

  var row = match.getRow();
  var completedAt = "";

  if (status === "Complete") {
    completedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  sheet.getRange(row, 4, 1, 2).setValues([[status, completedAt]]);

  if (status === "Complete") {
    var assignee = sheet.getRange(row, 2).getValue();
    var desc = sheet.getRange(row, 3).getValue();
    addToEmailQueue(id, assignee, desc);
  }

  cache.put(dupeKey, "1", 10);

  return { success: true, duplicate: false, message: "Task " + id + " set to " + status };
}

function addToEmailQueue(taskId, assignee, desc) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var q = ss.getSheetByName("EmailQueue");
  if (!q) {
    q = ss.insertSheet("EmailQueue");
    q.appendRow(["taskId", "assignee", "desc", "queuedAt", "sent"]);
  }
  q.appendRow([taskId, assignee, desc, new Date(), "no"]);
}

function processEmailQueue() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var q = ss.getSheetByName("EmailQueue");
  if (!q) return;

  var data = q.getDataRange().getValues();
  var myEmail = Session.getEffectiveUser().getEmail();

  for (var i = 1; i < data.length; i++) {
    if (data[i][4] === "no") {
      MailApp.sendEmail({
        to: myEmail,
        subject: "Task " + data[i][0] + " completed",
        body: "Task " + data[i][0] + " (" + data[i][2] + ") assigned to " + data[i][1] + " is now complete."
      });
      q.getRange(i + 1, 5).setValue("yes");
    }
  }
}

function setAttendanceRequired(payload) {
  var actorId = payload.actorId;
  var targetId = payload.targetId;
  var required = payload.required;

  if (!actorId || !targetId || required === undefined) {
    return { success: false, error: "actorId, targetId, and required are all needed" };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var users = ss.getSheetByName("Users");

  var actorCell = users.getRange("A:A").createTextFinder(actorId).matchEntireCell(true).findNext();
  if (!actorCell) {
    return { success: false, error: "Actor not found" };
  }

  var actorRole = users.getRange(actorCell.getRow(), 3).getValue();
  if (actorRole !== "admin") {
    return { success: false, error: "Only admins can do this" };
  }

  var targetCell = users.getRange("A:A").createTextFinder(targetId).matchEntireCell(true).findNext();
  if (!targetCell) {
    return { success: false, error: "Target user not found" };
  }

  var targetRow = targetCell.getRow();
  var oldVal = users.getRange(targetRow, 4).getValue();
  users.getRange(targetRow, 4).setValue(required);

  var log = ss.getSheetByName("SettingsLog");
  if (!log) {
    log = ss.insertSheet("SettingsLog");
    log.appendRow(["changedAt", "changedBy", "target", "oldValue", "newValue"]);
  }
  log.appendRow([new Date(), actorId, targetId, String(oldVal), String(required)]);

  return {
    success: true,
    message: "attendanceRequired for " + targetId + " changed from " + oldVal + " to " + required
  };
}

function handleUpdateTask(id, status) {
  return updateTask({ id: id, status: status });
}

function handleSetAttendance(actorId, targetId, required) {
  return setAttendanceRequired({ actorId: actorId, targetId: targetId, required: required });
}
