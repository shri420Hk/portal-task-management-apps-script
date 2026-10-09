# Task 1 — Written Answers

## 1. A web app takes 20 seconds to save one record. How would you find out why?

First, I'd open the Executions page in Apps Script to see how long the server function actually takes. That tells me right away whether the delay is on the server or somewhere else (network, client rendering, etc).

If the server is slow, I'd add Logger.log statements with timestamps at different points in the function to narrow down which section is eating up the time. The usual culprits:

- Reading the full sheet with getDataRange() when you only need one row
- Writing cells one at a time in a loop instead of using setValues() once
- Calling external services like MailApp or UrlFetchApp during the save
- Opening a spreadsheet by ID repeatedly instead of reusing a reference
- Having onChange or onEdit triggers on the sheet that fire every time the script writes something

If the server is fast but the user still waits, I'd check the Network tab in Chrome DevTools to see if the request itself is slow or if there's something on the client side holding things up before or after the call.

## 2. "Save" button sends the same request twice. Two causes and how to check each.

**Cause 1 — Click handler attached twice.** This happens when the code that does addEventListener runs more than once. For example, if the function that sets up the listener is called every time a panel loads, the button ends up with two listeners doing the same thing. To check: put a console.log at the very top of the click handler and click the button once. If it logs twice, the handler is doubled. Fix it by making sure the listener is added only once, or remove old listeners before adding new ones.

**Cause 2 — Form submission on top of the JS call.** If the button sits inside a `<form>` tag, clicking it both fires the JS fetch/AJAX call and submits the form the old-fashioned way. Two requests go out — one from JS, one from the browser. To check: look at the Network tab in DevTools after clicking. If you see one XHR/fetch and one document request (full page reload), that's it. Adding event.preventDefault() in the click handler stops the form from submitting separately.

## 3. Server trusts { userId: "admin" } from the browser. Why is this not secure?

Anyone can open DevTools, go to the Network tab, copy the request, change userId to "admin", and resend it. You don't need any hacking skills — Chrome literally has an "Edit and Resend" option. So the server is letting anyone become admin just by editing a JSON field.

The fix: never trust the client for identity. On the server side, use `Session.getActiveUser().getEmail()` to find out who is actually signed in. Then look up that email address in your Users sheet or access list to check their role. The identity comes from Google's authentication system, not from the request body. A user can't fake what `Session.getActiveUser()` returns — that's between Google and the server.

## 4. Script sends an email every time a task completes, inside the save request. Why is this slow?

MailApp.sendEmail() takes time — usually somewhere between 1 and 3 seconds per call. When it runs inside the same function that saves the task, the user sits there waiting for both the database write and the email to finish before they get any response. A save that should take half a second now takes 2 to 4 seconds. If the code sends to more than one person, it's even worse.

What I'd change: instead of sending the email right there, write the email details (who, subject, body) to a queue — just another sheet tab called "EmailQueue". Then set up a time-based trigger that runs every minute. That trigger checks the queue, sends any unsent emails, and marks them done. The save stays fast because all it does is add one row to the queue. The email goes out within a minute, which is perfectly fine for a notification.

## 5. Code change breaks live system. How to undo, and how to prevent this?

If the code is in Git: `git revert <commit hash>` and push. This makes a new commit that undoes the broken change without losing history. If I deployed using Apps Script's built-in versioning: go to Deploy > Manage Deployments and switch back to the previous version number.

If Git isn't set up and I need to act fast: in the Apps Script editor, go to File > Version history and restore the last working version.

What I'd set up in advance so this is always possible:
- All code lives in Git with clear commit messages. I always know what changed and can revert any commit.
- Deployments use a pinned version number, never "Head". So the live app only changes when I explicitly deploy a new version.
- Every change gets tested on a copy of the sheet and script first. The live sheet is never the testing ground.
- I keep a note of the current deployment version. If something breaks, I know exactly which version to roll back to without digging around.
