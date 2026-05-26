# Google Sheet Links Dashboard

This is a simple webpage that displays all Google Sheet links from one Master Sheet.

## Master Sheet Columns

Keep these columns in the first row of the Master Sheet:

```text
Sr. No, Task Name, Task Description, Category, Google Sheet Link, Deadline, Status
```

`Task Description` and `Deadline` can be left blank. `Category` values are used to create tabs automatically.

## Apps Script Firewall And My Tasks

The page supports a private task view for `baljitsaini28@gmail.com`. The browser signs in with Google, then asks an Apps Script Web App for private tasks. Apps Script verifies the Google token before reading the private MyTask spreadsheet.

Use two spreadsheets:

```text
Master Sheet
MyTask
```

Both sheets should use these columns:

```text
Sr. No, Task Name, Task Description, Category, Google Sheet Link, Deadline, Status
```

No `UserDetails` sheet is needed.

## Google OAuth Client ID

Create one Google OAuth Client ID:

1. Go to Google Cloud Console.
2. Create or open a project.
3. Configure the OAuth consent screen.
4. Create an OAuth 2.0 Client ID for a web application.
5. Add your Render URL as an authorized JavaScript origin:

```text
https://3d08-tasksheet.onrender.com
```

6. Copy the Client ID.
7. Paste the same Client ID into `googleClientId` in `app.js` and `GOOGLE_CLIENT_ID` in Apps Script.

## Apps Script Setup

1. Open [script.google.com](https://script.google.com/).
2. Create a new project.
3. Delete the starter code.
4. Copy the contents of `apps-script-firewall.gs` into the Apps Script editor.
5. Update these values if needed:

```js
MASTER_TAB_NAME: "Sheet1",
MY_TASK_TAB_NAME: "MyTask",
GOOGLE_CLIENT_ID: "YOUR_CLIENT_ID.apps.googleusercontent.com",
```

Use the exact tab names from the bottom of each Google Sheet.

6. Click `Save`.
7. Click `Deploy` > `New deployment`.
8. Select type `Web app`.
9. Use these settings:

```text
Execute as: Me
Who has access: Anyone
```

10. Click `Deploy`.
11. Review and authorize the requested permissions.
12. Copy the Web App URL.
13. Paste it into `appScriptUrl` in `app.js`.

Important: keep the MyTask spreadsheet private. It does not need to be shared publicly because Apps Script reads it as you.

## Connect Your Master Sheet

The public portal can also be read through Apps Script. After `appScriptUrl` is set, the site will load public links from the Apps Script endpoint instead of directly from Google Sheets.

Example:

```js
const CONFIG = {
  masterSheetUrl: "https://docs.google.com/spreadsheets/d/XXXX/edit?gid=0#gid=0",
  appScriptUrl: "https://script.google.com/macros/s/XXXX/exec",
  googleClientId: "YOUR_CLIENT_ID.apps.googleusercontent.com",
  allowedEmail: "baljitsaini28@gmail.com",
  refreshEveryMinutes: 5,
};
```

The dashboard reloads the Master Sheet every 5 minutes and also has a refresh button.

## Open Locally

For best results, run it from a small local server:

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Share With Colleagues

Put these files on any static web hosting service, such as GitHub Pages, Netlify, an internal college server, or another hosting location your team can access. Everyone then needs to remember only that one dashboard URL.
