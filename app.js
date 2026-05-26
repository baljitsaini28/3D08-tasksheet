const CONFIG = {
  masterSheetUrl: "https://docs.google.com/spreadsheets/d/1zLxfExqhz_6kjWytfqa0P8SpCBt2AblRW5v6iaTQ36c/edit?gid=0#gid=0",
  allowedUsername: "baljitsaini28",
  userDetailsSheetName: "UserDetails",
  myTaskSheetName: "MyTask",
  refreshEveryMinutes: 5,
};

const SAMPLE_ROWS = [
  {
    "Sr. No": "1",
    "Task Name": "Admission Report",
    "Task Description": "Collect department-wise sheet updates.",
    Category: "Academic",
    "Google Sheet Link": "https://docs.google.com/spreadsheets/",
    Deadline: "2026-06-15",
    Status: "Active",
  },
  {
    "Sr. No": "2",
    "Task Name": "Research Publications",
    "Task Description": "Faculty publication tracker.",
    Category: "Research",
    "Google Sheet Link": "https://docs.google.com/spreadsheets/",
    Deadline: "",
    Status: "Active",
  },
  {
    "Sr. No": "3",
    "Task Name": "Placement Drive",
    "Task Description": "",
    Category: "Placement",
    "Google Sheet Link": "https://docs.google.com/spreadsheets/",
    Deadline: "2026-05-10",
    Status: "Expired",
  },
];

const state = {
  rows: [],
  myTaskRows: [],
  selectedCategory: "All",
  searchTerm: "",
  statusFilter: "all",
  currentView: "portal",
  currentUser: null,
};

const elements = {
  loginButton: document.querySelector("#loginButton"),
  logoutButton: document.querySelector("#logoutButton"),
  refreshButton: document.querySelector("#refreshButton"),
  userBadge: document.querySelector("#userBadge"),
  viewTabs: document.querySelector("#viewTabs"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  summaryGrid: document.querySelector("#summaryGrid"),
  categoryTabs: document.querySelector("#categoryTabs"),
  messagePanel: document.querySelector("#messagePanel"),
  taskGrid: document.querySelector("#taskGrid"),
  loginModal: document.querySelector("#loginModal"),
  loginForm: document.querySelector("#loginForm"),
  usernameInput: document.querySelector("#usernameInput"),
  passwordInput: document.querySelector("#passwordInput"),
  loginMessage: document.querySelector("#loginMessage"),
  cancelLoginButton: document.querySelector("#cancelLoginButton"),
};

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getValue(row, names) {
  const keys = Object.keys(row);
  const wanted = names.map(normalizeHeader);
  const key = keys.find((current) => wanted.includes(normalizeHeader(current)));
  return key ? String(row[key] || "").trim() : "";
}

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);

  const headers = rows.shift() || [];
  return rows.map((values) => {
    return headers.reduce((record, header, index) => {
      record[header.trim()] = (values[index] || "").trim();
      return record;
    }, {});
  });
}

function parseGoogleSheetUrl(url) {
  const spreadsheetMatch = String(url).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = String(url).match(/[?&#]gid=([0-9]+)/);

  if (!spreadsheetMatch) return null;

  return {
    spreadsheetId: spreadsheetMatch[1],
    gid: gidMatch ? gidMatch[1] : "0",
  };
}

function loadGoogleSheetJsonp(url, options = {}) {
  const sheet = parseGoogleSheetUrl(url);

  if (!sheet) {
    return Promise.reject(new Error("The Master Sheet URL is not a valid Google Sheets link."));
  }

  return new Promise((resolve, reject) => {
    const callbackName = `handleMasterSheet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("The Master Sheet took too long to respond."));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (payload) => {
      cleanup();
      resolve(parseGoogleVisualizationPayload(payload));
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("The Master Sheet could not be loaded."));
    };

    const query = new URLSearchParams({
      tqx: `responseHandler:${callbackName}`,
      _: Date.now().toString(),
    });

    if (options.sheetName) {
      query.set("sheet", options.sheetName);
    } else {
      query.set("gid", sheet.gid);
    }

    script.src = `https://docs.google.com/spreadsheets/d/${sheet.spreadsheetId}/gviz/tq?${query.toString()}`;
    document.head.appendChild(script);
  });
}

function parseGoogleVisualizationPayload(payload) {
  const table = payload && payload.table;
  const columns = table && table.cols ? table.cols : [];
  const rows = table && table.rows ? table.rows : [];
  let headers = columns.map((column) => column.label || "");
  let dataRows = rows;

  if (headers.every((header) => !header) && rows.length > 0) {
    headers = rowToValues(rows[0]);
    dataRows = rows.slice(1);
  }

  return dataRows.map((row) => {
    const values = rowToValues(row);
    return headers.reduce((record, header, index) => {
      record[header] = values[index] || "";
      return record;
    }, {});
  });
}

function rowToValues(row) {
  const cells = row && row.c ? row.c : [];
  return cells.map((cell) => {
    if (!cell) return "";
    return cell.f || cell.v || "";
  });
}

function toTask(row) {
  const status = getValue(row, ["Status"]) || "Active";
  return {
    serial: getValue(row, ["Sr. No", "Sr No", "Serial No"]),
    name: getValue(row, ["Task Name", "Name"]),
    description: getValue(row, ["Task Description", "Description"]),
    category: getValue(row, ["Category"]) || "Uncategorized",
    link: getValue(row, ["Google Sheet Link", "Sheet Link", "Link"]),
    deadline: getValue(row, ["Deadline", "Due Date"]),
    status,
    isExpired: status.toLowerCase() === "expired",
  };
}

function toUser(row) {
  return {
    name: getValue(row, ["Name", "Full Name", "User Name"]) || getValue(row, ["Username", "User ID"]),
    username: getValue(row, ["Username", "User ID", "Login ID", "Login"]),
    password: getValue(row, ["Password", "Passcode", "Pass"]),
  };
}

function formatDeadline(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function uniqueCategories(tasks) {
  return [...new Set(tasks.map((task) => task.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function getCurrentRows() {
  return state.currentView === "myTasks" ? state.myTaskRows : state.rows;
}

function getVisibleTasks() {
  const searchTerm = state.searchTerm.toLowerCase();
  return getCurrentRows().filter((task) => {
    const categoryMatches = state.selectedCategory === "All" || task.category === state.selectedCategory;
    const statusMatches = state.statusFilter === "all" || task.status.toLowerCase() === state.statusFilter;
    const searchMatches =
      !searchTerm ||
      [task.name, task.description, task.category, task.status, task.deadline]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm);
    return categoryMatches && statusMatches && searchMatches;
  });
}

function setMessage(message, type = "info") {
  elements.messagePanel.textContent = message;
  elements.messagePanel.className = `status-panel ${type === "error" ? "error" : ""}`;
  elements.messagePanel.hidden = !message;
}

function renderSummary(tasks) {
  const activeCount = tasks.filter((task) => task.status.toLowerCase() === "active").length;
  const expiredCount = tasks.filter((task) => task.status.toLowerCase() === "expired").length;
  const categoryCount = uniqueCategories(tasks).length;

  const totalLabel = state.currentView === "myTasks" ? "Total Tasks" : "Total Sheets";
  const summary = [
    [totalLabel, tasks.length, "all"],
    ["Active", activeCount, "active"],
    ["Expired", expiredCount, "expired"],
    ["Categories", categoryCount, ""],
  ];

  elements.summaryGrid.innerHTML = summary
    .map(
      ([label, value, filter]) => `
        <button
          class="summary-tile"
          type="button"
          ${filter ? `data-status-filter="${filter}"` : "disabled"}
          aria-pressed="${filter ? state.statusFilter === filter && state.selectedCategory === "All" : "false"}"
        >
          <span>${escapeHtml(label)}</span>
          <strong>${value}</strong>
        </button>
      `
    )
    .join("");
}

function renderTabs(tasks) {
  const categories = ["All", ...uniqueCategories(tasks)];
  if (!categories.includes(state.selectedCategory)) state.selectedCategory = "All";

  elements.categoryTabs.innerHTML = categories
    .map((category) => {
      const count = category === "All" ? tasks.length : tasks.filter((task) => task.category === category).length;
      const isSelected = state.statusFilter === "all" && state.selectedCategory === category;
      return `
        <button class="tab-button" type="button" data-category="${escapeHtml(category)}" aria-selected="${isSelected}">
          ${escapeHtml(category)} (${count})
        </button>
      `;
    })
    .join("");
}

function renderTasks() {
  const tasks = getVisibleTasks();

  if (tasks.length === 0) {
    elements.taskGrid.innerHTML = "";
    setMessage("No matching sheets found.");
    return;
  }

  setMessage("");
  elements.taskGrid.innerHTML = tasks
    .map((task) => {
      const statusClass = task.status.toLowerCase() === "expired" ? "expired" : "active";
      const deadline = formatDeadline(task.deadline);
      return `
        <article class="task-card">
          <header>
            <div class="task-meta">
              <span class="chip category">${escapeHtml(task.category)}</span>
              <span class="chip ${statusClass}">${escapeHtml(task.status)}</span>
              ${deadline ? `<span class="chip deadline">${escapeHtml(deadline)}</span>` : ""}
            </div>
            <h2 class="task-title">${escapeHtml(task.name || "Untitled task")}</h2>
          </header>
          <p class="task-description">${escapeHtml(task.description || "No description added.")}</p>
          <footer class="task-footer">
            <span class="serial">${task.serial ? `#${escapeHtml(task.serial)}` : "Sheet"}</span>
            ${
              task.link
                ? `<a class="open-link" href="${escapeAttribute(task.link)}" target="_blank" rel="noopener noreferrer">Open Sheet</a>`
                : `<span class="serial">No link added</span>`
            }
          </footer>
        </article>
      `;
    })
    .join("");
}

function render() {
  const tasks = getCurrentRows();
  renderViewTabs();
  renderUserControls();
  renderSummary(tasks);
  renderTabs(tasks);
  renderTasks();
}

function renderViewTabs() {
  elements.viewTabs.hidden = !state.currentUser;
  elements.viewTabs.querySelectorAll("[data-view]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.view === state.currentView));
  });
}

function renderUserControls() {
  const isLoggedIn = Boolean(state.currentUser);
  elements.loginButton.hidden = isLoggedIn;
  elements.logoutButton.hidden = !isLoggedIn;
  elements.userBadge.hidden = !isLoggedIn;
  elements.userBadge.textContent = isLoggedIn ? state.currentUser.name : "";
}

function resetFilters() {
  state.selectedCategory = "All";
  state.statusFilter = "all";
  state.searchTerm = "";
  elements.statusFilter.value = "all";
  elements.searchInput.value = "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

async function loadData() {
  elements.refreshButton.disabled = true;

  try {
    if (!CONFIG.masterSheetUrl) {
      state.rows = SAMPLE_ROWS.map(toTask);
      render();
      setMessage("Demo data is showing. Add your Master Sheet URL in app.js to load live data.");
      return;
    }

    state.rows = await loadTaskRows();
    if (state.currentUser) {
      state.myTaskRows = await loadTaskRows(CONFIG.myTaskSheetName);
    }
    render();
  } catch (error) {
    console.error(error);
    setMessage(`${error.message} Share the Master Sheet as "Anyone with the link can view" and check the column headers.`, "error");
  } finally {
    elements.refreshButton.disabled = false;
  }
}

async function loadTaskRows(sheetName) {
  const rows = CONFIG.masterSheetUrl.includes("/spreadsheets/d/")
    ? await loadGoogleSheetJsonp(CONFIG.masterSheetUrl, { sheetName })
    : parseCsv(await fetchCsv(CONFIG.masterSheetUrl));
  return rows.map(toTask).filter((task) => task.name || task.link);
}

async function loadUsers() {
  if (!CONFIG.masterSheetUrl.includes("/spreadsheets/d/")) {
    throw new Error("Login requires the Master Sheet to be a Google Sheets URL.");
  }

  const rows = await loadGoogleSheetJsonp(CONFIG.masterSheetUrl, {
    sheetName: CONFIG.userDetailsSheetName,
  });

  return rows.map(toUser).filter((user) => user.username && user.password);
}

async function fetchCsv(url) {
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}cacheBust=${Date.now()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`The CSV file could not be loaded. HTTP ${response.status}`);
  }

  return response.text();
}

elements.categoryTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.selectedCategory = button.dataset.category;
  state.statusFilter = "all";
  elements.statusFilter.value = "all";
  render();
});

elements.summaryGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-status-filter]");
  if (!button) return;
  state.statusFilter = button.dataset.statusFilter;
  state.selectedCategory = "All";
  elements.statusFilter.value = state.statusFilter;
  render();
});

elements.searchInput.addEventListener("input", (event) => {
  state.searchTerm = event.target.value;
  renderTasks();
});

elements.statusFilter.addEventListener("change", (event) => {
  state.statusFilter = event.target.value;
  state.selectedCategory = "All";
  render();
});

elements.viewTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  state.currentView = button.dataset.view;
  resetFilters();
  render();
});

elements.loginButton.addEventListener("click", () => {
  elements.loginModal.hidden = false;
  elements.loginMessage.hidden = true;
  elements.usernameInput.focus();
});

elements.cancelLoginButton.addEventListener("click", () => {
  elements.loginModal.hidden = true;
});

elements.loginModal.addEventListener("click", (event) => {
  if (event.target === elements.loginModal) {
    elements.loginModal.hidden = true;
  }
});

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoginMessage("Checking login...");

  try {
    const username = elements.usernameInput.value.trim();
    const password = elements.passwordInput.value;
    const users = await loadUsers();
    const user = users.find((candidate) => {
      return candidate.username === CONFIG.allowedUsername && candidate.username === username && candidate.password === password;
    });

    if (!user) {
      setLoginMessage("Invalid username or password.", "error");
      return;
    }

    state.currentUser = {
      name: user.name || "Baljit Singh",
      username: user.username,
    };
    state.myTaskRows = await loadTaskRows(CONFIG.myTaskSheetName);
    state.currentView = "myTasks";
    resetFilters();
    elements.loginModal.hidden = true;
    render();
  } catch (error) {
    console.error(error);
    setLoginMessage(`${error.message} Check the UserDetails and MyTask subsheets.`, "error");
  }
});

elements.logoutButton.addEventListener("click", () => {
  state.currentUser = null;
  state.myTaskRows = [];
  state.currentView = "portal";
  resetFilters();
  render();
});

elements.refreshButton.addEventListener("click", loadData);

loadData();

if (CONFIG.refreshEveryMinutes > 0) {
  setInterval(loadData, CONFIG.refreshEveryMinutes * 60 * 1000);
}

function setLoginMessage(message, type = "info") {
  elements.loginMessage.textContent = message;
  elements.loginMessage.className = `login-message ${type === "error" ? "error" : ""}`;
  elements.loginMessage.hidden = !message;
}
