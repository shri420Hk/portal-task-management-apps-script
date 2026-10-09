# Portal Task Management — Apps Script Web App

## What this is

This is a small web app built on Google Apps Script and Google Sheets. It does four things:

1. **Updates a task's status** — you give it a task ID and a new status, and it finds and updates that row in the sheet. If the status is "Complete", it stamps today's date automatically.

2. **Blocks duplicate saves** — if the exact same update comes in twice within 10 seconds (say someone double-clicks or a network retry happens), it catches the second one and skips it instead of writing again.

3. **Queues emails instead of sending them inline** — when a task is marked complete, the email notification doesn't get sent during the save. Instead it gets added to a queue, and a background job sends it out within a minute. This keeps the save fast.

4. **Admin-only attendance setting** — only a user with the "admin" role can toggle another user's attendance requirement. Every change is logged with who did it, when, and what the old/new values were.

---

## Files

| File | What it does |
|------|-------------|
| `Code.gs` | All the main logic — request handling, task updates, email queue, admin setting |
| `Setup.gs` | Generates 500 dummy tasks and 5 users, and sets up the email trigger |
| `Index.html` | A test page you can use in the browser to try out the actions |
| `appsscript.json` | Apps Script project settings (timezone, runtime) |
| `TaskAnswers.md` | Written answers for Task 1 |

---

## Setup — step by step

1. Create a new Google Sheet.

2. Open **Extensions > Apps Script**.

3. Delete whatever is in the default `Code.gs` file. Copy the contents of `Code.gs` from this repo and paste it in.

4. Click the **+** next to Files and add a new script file called `Setup`. Paste the contents of `Setup.gs`.

5. Click the **+** again and add an HTML file called `Index`. Paste the contents of `Index.html`.

6. Open `appsscript.json` (you may need to go to Project Settings and check "Show appsscript.json manifest file in editor"). Replace it with the contents from this repo.

7. Save everything (Ctrl+S).

8. In the editor, select `setupDummyData` from the function dropdown at the top and click **Run**. Grant permissions when asked. This creates the Tasks and Users tabs with dummy data.

9. Run `createEmailTrigger` the same way. This sets up a background job that checks for queued emails every minute.

10. Click **Deploy > New deployment**. Choose "Web app". Set Execute as "Me" and access to "Anyone with a Google account" (or just yourself for testing). Click Deploy and copy the URL.

11. Open the URL in your browser — you should see the test page.

---

## How to test each feature

### 1. updateTask

- Open the web app URL in your browser.
- Enter a task ID, for example `t250`.
- Pick a status from the dropdown, like "In Progress".
- Click **Update Task**.
- Check the Result area — it should say the task was updated.
- Go to the Google Sheet and find row with id `t250` in the Tasks tab. The status column should now say "In Progress".
- Now try it with status "Complete" — the completedAt column should get today's date.

### 2. No double saves

- Enter task ID `t100`, set status to "Review", and click **Update Task**.
- Immediately click it again (same ID, same status) within 10 seconds.
- The second response should say `"duplicate": true` and the message should say it was already applied.
- Check the sheet — there should only be one write, not two.

### 3. Email queue (not inline)

- Set any task to "Complete" using the test page.
- Go to the sheet — you should see a new tab called **EmailQueue** with the task listed and `sent` set to "no".
- Wait about a minute. The background trigger runs and sends the email. After that, `sent` should change to "yes".
- Check your inbox — you should have a notification email for that task.

### 4. Admin-only attendance setting

**As admin (should work):**
- In the "Set Attendance Required" section, enter `u1` as Your User ID (Priya Sharma is the admin).
- Enter `u3` as Target User ID.
- Choose "No" and click **Set Attendance**.
- It should succeed. Check the Users tab — u3's attendanceRequired should now be FALSE.
- Check the **SettingsLog** tab — there should be a new row showing what changed, who did it, and the old/new values.

**As non-admin (should fail):**
- Enter `u2` as Your User ID (Rahul Mehta is a regular member).
- Try to change any setting.
- It should return an error saying only admins can do this.

---

## How "admin" is checked — and the weakness

The script looks up the `actorId` from the request in the Users sheet and checks whether that user's role column says "admin". If it does, the action goes through. If not, it's rejected.

**The weakness:** the `actorId` is sent by the client. There's nothing stopping someone from sending `actorId: "u1"` even if they're not actually user u1. Anyone who knows the admin's user ID can pretend to be them.

In a real system, I wouldn't rely on a client-sent ID at all. I'd use `Session.getActiveUser().getEmail()` on the server to get the caller's real email from Google's authentication, then look up their role based on that. The client should never tell the server who they are — the server should figure it out itself. I kept the current approach because the task spec asks for `actorId` in the request body, but I wanted to be upfront about the gap.

---

## Execution time

*(Add a screenshot of the Apps Script Executions page here showing the duration of an updateTask call)*

Using `createTextFinder().matchEntireCell(true).findNext()` means the script doesn't loop through rows in JavaScript. The sheet engine handles the search internally, so even with 500 rows, updateTask typically finishes in under 2 seconds.

---

## What I'd do differently with more time

- **Use Session.getActiveUser().getEmail()** for the admin check instead of trusting the client-sent actorId. Map email addresses to user IDs and roles on the server side.

- **Add LockService** to processEmailQueue so that if two triggers overlap, they don't try to send the same email twice.

- **Better error handling** — wrap things in try/catch blocks and return useful error messages instead of letting the script crash with a generic server error.

- **Input validation** — check that the status value is actually one of the allowed options (Open, In Progress, Review, Complete) before writing it. Same for the boolean on attendanceRequired.

- **Move to clasp** for local development with proper version control, instead of copy-pasting into the editor.

- **Add a simple index lookup** — right now TextFinder works well for 500 rows, but for thousands of rows, I'd build a lookup object from column A into a cache so repeated calls in the same execution are instant.

- **Rate limiting** on the doPost endpoint to prevent abuse.
