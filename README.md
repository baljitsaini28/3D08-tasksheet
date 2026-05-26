# Google Sheet Links Dashboard

This is a simple webpage that displays all Google Sheet links from one Master Sheet.

## Master Sheet Columns

Keep these columns in the first row of the Master Sheet:

```text
Sr. No, Task Name, Task Description, Category, Google Sheet Link, Deadline, Status
```

`Task Description` and `Deadline` can be left blank. `Category` values are used to create tabs automatically.

## Connect Your Master Sheet

1. Open the Master Sheet in Google Sheets.
2. Click `Share`.
3. Set access to `Anyone with the link` and `Viewer`.
4. Copy the normal Google Sheet link.
5. Open `app.js` and paste the link into `masterSheetUrl`.

Example:

```js
const CONFIG = {
  masterSheetUrl: "https://docs.google.com/spreadsheets/d/XXXX/edit?gid=0#gid=0",
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
