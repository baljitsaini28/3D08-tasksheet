const CONFIG = {
  MASTER_SHEET_ID: "1zLxfExqhz_6kjWytfqa0P8SpCBt2AblRW5v6iaTQ36c",
  MASTER_TAB_NAME: "Sheet1",
  MY_TASK_SHEET_ID: "1JjPDCtzGjyK3aDb_-Aa7mOSWzpeh3IjbgrCm46dWvSY",
  MY_TASK_TAB_NAME: "MyTask",
  GOOGLE_CLIENT_ID: "PASTE_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com",
  ALLOWED_EMAIL: "baljitsaini28@gmail.com",
};

function doGet(e) {
  const params = e.parameter || {};
  const callback = params.callback || "callback";

  try {
    let result;

    if (params.action === "links") {
      result = {
        ok: true,
        rows: readSheetRows(CONFIG.MASTER_SHEET_ID, CONFIG.MASTER_TAB_NAME),
      };
    } else if (params.action === "myTasks") {
      verifyIdToken(params.idToken);
      result = {
        ok: true,
        rows: readSheetRows(CONFIG.MY_TASK_SHEET_ID, CONFIG.MY_TASK_TAB_NAME),
      };
    } else {
      throw new Error("Unknown action.");
    }

    return jsonp(callback, result);
  } catch (error) {
    return jsonp(callback, {
      ok: false,
      error: error.message,
    });
  }
}

function readSheetRows(spreadsheetId, tabName) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(tabName) || spreadsheet.getSheets()[0];
  const values = sheet.getDataRange().getDisplayValues();

  if (values.length < 2) return [];

  const headers = values[0].map((header) => String(header).trim());

  return values.slice(1)
    .filter((row) => row.some((cell) => String(cell).trim() !== ""))
    .map((row) => {
      return headers.reduce((record, header, index) => {
        record[header] = row[index] || "";
        return record;
      }, {});
    });
}

function verifyIdToken(idToken) {
  if (!idToken) {
    throw new Error("Missing Google sign-in token.");
  }

  const response = UrlFetchApp.fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error("Google sign-in token could not be verified.");
  }

  const payload = JSON.parse(response.getContentText());
  const email = String(payload.email || "").toLowerCase();
  const expectedEmail = CONFIG.ALLOWED_EMAIL.toLowerCase();

  if (payload.aud !== CONFIG.GOOGLE_CLIENT_ID) {
    throw new Error("Google sign-in token was issued for a different app.");
  }

  if (payload.email_verified !== "true" && payload.email_verified !== true) {
    throw new Error("Google account email is not verified.");
  }

  if (email !== expectedEmail) {
    throw new Error("This Google account is not allowed to view My Tasks.");
  }

  return payload;
}

function jsonp(callback, payload) {
  const safeCallback = String(callback).replace(/[^\w.$]/g, "");
  const output = `${safeCallback}(${JSON.stringify(payload)});`;
  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
