const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const INDEX_HTML = "<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <meta name=\"theme-color\" content=\"#10251e\" />\n    <title>Locker Desk</title>\n    <link rel=\"stylesheet\" href=\"/styles.css\" />\n  </head>\n  <body>\n    <div class=\"noise\"></div>\n    <main id=\"app\">\n      <section class=\"login-shell\" id=\"loginView\">\n        <div class=\"brand-mark\">LD</div>\n        <p class=\"eyebrow\">Secure staff access</p>\n        <h1>Locker Desk</h1>\n        <p class=\"lede\">Assign temporary pickup codes for rider collection.</p>\n        <form id=\"loginForm\" class=\"login-form\">\n          <label for=\"password\">Staff password</label>\n          <div class=\"input-row\">\n            <input id=\"password\" type=\"password\" autocomplete=\"current-password\" required />\n            <button type=\"submit\">Enter desk</button>\n          </div>\n          <p class=\"form-error\" id=\"loginError\"></p>\n        </form>\n      </section>\n\n      <section class=\"dashboard hidden\" id=\"dashboard\">\n        <header>\n          <div>\n            <p class=\"eyebrow\">Pickup operations</p>\n            <h1>Locker Desk</h1>\n          </div>\n          <div class=\"header-actions\">\n            <span class=\"mode-badge\" id=\"modeBadge\"></span>\n            <button class=\"quiet-button\" id=\"logoutButton\">Sign out</button>\n          </div>\n        </header>\n\n        <section class=\"summary\">\n          <div>\n            <span class=\"summary-number\" id=\"availableCount\">6</span>\n            <span class=\"summary-label\">available now</span>\n          </div>\n          <p>Select a locker, create a temporary pickup code, then send it to the rider.</p>\n        </section>\n\n        <section class=\"locker-grid\" id=\"lockerGrid\"></section>\n\n        <section class=\"activity-section\">\n          <div class=\"section-heading\">\n            <div>\n              <p class=\"eyebrow\">Recent activity</p>\n              <h2>Desk log</h2>\n            </div>\n            <button class=\"quiet-button\" id=\"refreshButton\">Refresh</button>\n          </div>\n          <div class=\"activity-list\" id=\"activityList\"></div>\n        </section>\n      </section>\n    </main>\n\n    <dialog id=\"assignDialog\">\n      <form method=\"dialog\" id=\"assignForm\">\n        <button class=\"dialog-close\" value=\"cancel\" aria-label=\"Close\">×</button>\n        <p class=\"eyebrow\">Create pickup access</p>\n        <h2 id=\"dialogLockerName\">Locker</h2>\n        <input type=\"hidden\" id=\"lockerId\" />\n        <label for=\"riderName\">Rider or order name</label>\n        <input id=\"riderName\" maxlength=\"80\" placeholder=\"e.g. Grab rider / Order 1842\" required />\n        <div class=\"field-grid\">\n          <div>\n            <label for=\"pin\">Pickup PIN</label>\n            <input id=\"pin\" inputmode=\"numeric\" autocomplete=\"off\" placeholder=\"Leave blank to generate\" />\n          </div>\n          <div>\n            <label for=\"hours\">Valid for</label>\n            <select id=\"hours\">\n              <option value=\"1\">1 hour</option>\n              <option value=\"2\">2 hours</option>\n              <option value=\"4\" selected>4 hours</option>\n              <option value=\"8\">8 hours</option>\n              <option value=\"24\">24 hours</option>\n            </select>\n          </div>\n        </div>\n        <label class=\"check-row\">\n          <input id=\"singleUse\" type=\"checkbox\" />\n          <span>One-time use code</span>\n        </label>\n        <p class=\"form-error\" id=\"assignError\"></p>\n        <button class=\"primary-button\" type=\"submit\" id=\"createButton\">Create pickup code</button>\n      </form>\n    </dialog>\n\n    <dialog id=\"codeDialog\" class=\"code-dialog\">\n      <form method=\"dialog\">\n        <p class=\"eyebrow\">Ready to send</p>\n        <h2 id=\"codeLockerName\">Locker 1</h2>\n        <div class=\"code-display\" id=\"createdPin\">000000</div>\n        <p id=\"codeMessage\"></p>\n        <button type=\"button\" class=\"primary-button\" id=\"copyButton\">Copy rider message</button>\n        <button class=\"quiet-button full\" value=\"close\">Done</button>\n      </form>\n    </dialog>\n\n    <div class=\"toast\" id=\"toast\"></div>\n    <script src=\"/app.js\"></script>\n  </body>\n</html>\n";
const STYLES_CSS = ":root {\n  --ink: #10251e;\n  --muted: #65746f;\n  --paper: #f3f0e7;\n  --card: #fffdf7;\n  --line: #ddd8cb;\n  --green: #0c8f62;\n  --green-dark: #076545;\n  --orange: #f1a33b;\n  --shadow: 0 18px 45px rgba(20, 45, 36, 0.1);\n}\n\n* { box-sizing: border-box; }\n\nbody {\n  margin: 0;\n  min-height: 100vh;\n  color: var(--ink);\n  background:\n    radial-gradient(circle at 15% 0%, rgba(12, 143, 98, 0.13), transparent 30%),\n    radial-gradient(circle at 95% 15%, rgba(241, 163, 59, 0.16), transparent 25%),\n    var(--paper);\n  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif;\n}\n\n.noise {\n  position: fixed;\n  inset: 0;\n  pointer-events: none;\n  opacity: 0.25;\n  background-image: url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.08'/%3E%3C/svg%3E\");\n}\n\nbutton, input, select { font: inherit; }\nbutton { cursor: pointer; }\n.hidden { display: none !important; }\n\n.login-shell {\n  width: min(680px, calc(100% - 32px));\n  margin: 12vh auto;\n  padding: 54px;\n  border: 1px solid rgba(255,255,255,.7);\n  border-radius: 28px;\n  background: rgba(255, 253, 247, 0.78);\n  box-shadow: var(--shadow);\n  backdrop-filter: blur(18px);\n}\n\n.brand-mark {\n  display: grid;\n  place-items: center;\n  width: 54px;\n  height: 54px;\n  margin-bottom: 40px;\n  border-radius: 16px;\n  color: white;\n  background: var(--ink);\n  font-weight: 800;\n  letter-spacing: -.05em;\n}\n\n.eyebrow {\n  margin: 0 0 8px;\n  color: var(--green);\n  font-size: 12px;\n  font-weight: 800;\n  letter-spacing: .14em;\n  text-transform: uppercase;\n}\n\nh1, h2, p { margin-top: 0; }\nh1 { margin-bottom: 12px; font-size: clamp(42px, 7vw, 72px); letter-spacing: -.07em; line-height: .95; }\nh2 { margin-bottom: 8px; font-size: 28px; letter-spacing: -.04em; }\n.lede { max-width: 520px; color: var(--muted); font-size: 20px; line-height: 1.55; }\n\n.login-form { margin-top: 38px; }\nlabel { display: block; margin-bottom: 8px; font-size: 13px; font-weight: 750; }\n.input-row { display: flex; gap: 10px; }\ninput, select {\n  width: 100%;\n  min-height: 48px;\n  border: 1px solid var(--line);\n  border-radius: 12px;\n  color: var(--ink);\n  background: white;\n  padding: 0 14px;\n  outline: none;\n}\ninput:focus, select:focus { border-color: var(--green); box-shadow: 0 0 0 4px rgba(12, 143, 98, .12); }\n\n.input-row button, .primary-button {\n  border: 0;\n  border-radius: 12px;\n  color: white;\n  background: var(--green);\n  padding: 0 22px;\n  font-weight: 800;\n  transition: .2s ease;\n}\n.input-row button:hover, .primary-button:hover { background: var(--green-dark); transform: translateY(-1px); }\n.form-error { min-height: 20px; margin-top: 10px; color: #b24636; font-size: 13px; }\n\n.dashboard { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 36px 0 64px; }\nheader, .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; }\nheader h1 { font-size: 42px; margin: 0; }\n.header-actions { display: flex; align-items: center; gap: 10px; }\n.mode-badge { padding: 8px 12px; border-radius: 999px; background: #e0eee7; color: var(--green-dark); font-size: 12px; font-weight: 800; text-transform: uppercase; }\n.quiet-button { min-height: 38px; border: 1px solid var(--line); border-radius: 10px; color: var(--ink); background: rgba(255,255,255,.5); padding: 0 14px; font-weight: 750; }\n.quiet-button:hover { background: white; }\n\n.summary {\n  display: flex;\n  justify-content: space-between;\n  align-items: end;\n  gap: 24px;\n  margin: 46px 0 24px;\n  padding-bottom: 22px;\n  border-bottom: 1px solid var(--line);\n}\n.summary-number { display: block; font-size: 72px; font-weight: 800; line-height: .8; letter-spacing: -.08em; }\n.summary-label { display: block; margin-top: 12px; color: var(--muted); font-weight: 700; }\n.summary p { max-width: 420px; margin: 0; color: var(--muted); line-height: 1.6; }\n\n.locker-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }\n.locker-card {\n  position: relative;\n  min-height: 260px;\n  overflow: hidden;\n  border: 1px solid rgba(221,216,203,.9);\n  border-radius: 20px;\n  background: rgba(255,253,247,.82);\n  padding: 22px;\n  box-shadow: 0 8px 24px rgba(20,45,36,.05);\n}\n.locker-card::after {\n  content: \"\";\n  position: absolute;\n  width: 130px;\n  height: 130px;\n  right: -56px;\n  bottom: -65px;\n  border-radius: 50%;\n  background: rgba(12,143,98,.08);\n}\n.locker-top { display: flex; justify-content: space-between; align-items: start; }\n.locker-number { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; color: white; background: var(--ink); font-weight: 850; }\n.status { display: flex; gap: 6px; align-items: center; color: var(--green-dark); font-size: 12px; font-weight: 800; text-transform: uppercase; }\n.status::before { content: \"\"; width: 7px; height: 7px; border-radius: 50%; background: var(--green); }\n.occupied .status { color: #a05b08; }\n.occupied .status::before { background: var(--orange); }\n.locker-card h2 { margin-top: 28px; }\n.assignment { min-height: 44px; color: var(--muted); font-size: 14px; line-height: 1.5; }\n.card-actions { position: absolute; z-index: 1; left: 22px; right: 22px; bottom: 22px; display: flex; gap: 8px; }\n.card-actions button { flex: 1; min-height: 40px; border: 1px solid var(--line); border-radius: 10px; background: white; font-weight: 800; }\n.card-actions .assign-button { border-color: var(--green); color: white; background: var(--green); }\n\n.activity-section { margin-top: 60px; }\n.activity-list { margin-top: 18px; border-top: 1px solid var(--line); }\n.activity-item { display: grid; grid-template-columns: 160px 1fr auto; gap: 20px; padding: 16px 0; border-bottom: 1px solid var(--line); font-size: 14px; }\n.activity-item time, .activity-detail { color: var(--muted); }\n.empty-state { padding: 36px 0; color: var(--muted); }\n\ndialog {\n  width: min(520px, calc(100% - 28px));\n  border: 1px solid var(--line);\n  border-radius: 24px;\n  background: var(--card);\n  padding: 0;\n  box-shadow: 0 28px 80px rgba(10,30,22,.28);\n}\ndialog::backdrop { background: rgba(10,25,20,.45); backdrop-filter: blur(4px); }\ndialog form { position: relative; padding: 32px; }\n.dialog-close { position: absolute; top: 18px; right: 18px; width: 36px; height: 36px; border: 0; border-radius: 50%; background: #eeeae0; font-size: 22px; }\n.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }\n.check-row { display: flex; align-items: center; gap: 10px; margin: 18px 0; }\n.check-row input { width: 18px; min-height: 18px; }\n.primary-button { width: 100%; min-height: 50px; }\n.primary-button:disabled { opacity: .55; transform: none; cursor: wait; }\n.code-dialog { text-align: center; }\n.code-display { margin: 24px 0 18px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: clamp(46px, 12vw, 70px); font-weight: 900; letter-spacing: .12em; color: var(--green-dark); }\n.code-dialog p:not(.eyebrow) { color: var(--muted); line-height: 1.55; }\n.full { width: 100%; margin-top: 10px; }\n.toast { position: fixed; left: 50%; bottom: 24px; z-index: 10; transform: translate(-50%, 20px); opacity: 0; border-radius: 12px; color: white; background: var(--ink); padding: 12px 18px; font-size: 14px; font-weight: 750; transition: .25s ease; pointer-events: none; }\n.toast.show { transform: translate(-50%, 0); opacity: 1; }\n\n@media (max-width: 850px) {\n  .locker-grid { grid-template-columns: repeat(2, 1fr); }\n  .activity-item { grid-template-columns: 110px 1fr; }\n  .activity-detail { display: none; }\n}\n\n@media (max-width: 580px) {\n  .login-shell { margin: 5vh auto; padding: 32px 24px; }\n  .input-row, .summary { align-items: stretch; flex-direction: column; }\n  .input-row button { min-height: 48px; }\n  .locker-grid { grid-template-columns: 1fr; }\n  .field-grid { grid-template-columns: 1fr; }\n  header { align-items: start; }\n  .mode-badge { display: none; }\n}\n";
const APP_JS = "const $ = (selector) => document.querySelector(selector);\nconst loginView = $(\"#loginView\");\nconst dashboard = $(\"#dashboard\");\nconst lockerGrid = $(\"#lockerGrid\");\nconst assignDialog = $(\"#assignDialog\");\nconst codeDialog = $(\"#codeDialog\");\nlet currentState = null;\nlet riderMessage = \"\";\n\nasync function api(path, options = {}) {\n  const response = await fetch(path, {\n    headers: { \"Content-Type\": \"application/json\", ...(options.headers || {}) },\n    ...options,\n  });\n  const data = await response.json();\n  if (!response.ok) throw new Error(data.error || \"Request failed\");\n  return data;\n}\n\nfunction escapeHtml(value) {\n  return String(value || \"\")\n    .replaceAll(\"&\", \"&amp;\")\n    .replaceAll(\"<\", \"&lt;\")\n    .replaceAll(\">\", \"&gt;\")\n    .replaceAll('\"', \"&quot;\");\n}\n\nfunction formatDate(value) {\n  return new Intl.DateTimeFormat(undefined, {\n    month: \"short\",\n    day: \"numeric\",\n    hour: \"numeric\",\n    minute: \"2-digit\",\n  }).format(new Date(value));\n}\n\nfunction showToast(message) {\n  const toast = $(\"#toast\");\n  toast.textContent = message;\n  toast.classList.add(\"show\");\n  setTimeout(() => toast.classList.remove(\"show\"), 2200);\n}\n\nfunction render() {\n  const available = currentState.lockers.filter((locker) => locker.status === \"available\").length;\n  $(\"#availableCount\").textContent = available;\n  $(\"#modeBadge\").textContent = currentState.mode === \"demo\" ? \"Demo mode\" : \"Connected to Tuya\";\n  lockerGrid.innerHTML = currentState.lockers.map((locker, index) => {\n    const occupied = locker.status === \"occupied\";\n    const assignment = occupied\n      ? `<strong>${escapeHtml(locker.assignment.riderName)}</strong><br>Expires ${formatDate(locker.assignment.invalidAt)}`\n      : \"Ready for a new pickup assignment\";\n    return `\n      <article class=\"locker-card ${occupied ? \"occupied\" : \"\"}\">\n        <div class=\"locker-top\">\n          <span class=\"locker-number\">${index + 1}</span>\n          <span class=\"status\">${occupied ? \"In use\" : \"Available\"}</span>\n        </div>\n        <h2>${escapeHtml(locker.name)}</h2>\n        <p class=\"assignment\">${assignment}</p>\n        <div class=\"card-actions\">\n          ${occupied ? `<button data-release=\"${locker.id}\">Release</button>` : `<button class=\"assign-button\" data-assign=\"${locker.id}\">Assign code</button>`}\n        </div>\n      </article>`;\n  }).join(\"\");\n\n  $(\"#activityList\").innerHTML = currentState.activity.length\n    ? currentState.activity.map((item) => {\n        const locker = currentState.lockers.find((entry) => entry.id === item.lockerId);\n        const labels = {\n          \"pin-created\": \"Pickup code created\",\n          released: \"Locker released\",\n        };\n        return `<div class=\"activity-item\">\n          <time>${formatDate(item.createdAt)}</time>\n          <strong>${escapeHtml(locker?.name || item.lockerId)} · ${labels[item.type] || item.type}</strong>\n          <span class=\"activity-detail\">${escapeHtml(item.riderName || \"\")}</span>\n        </div>`;\n      }).join(\"\")\n    : '<p class=\"empty-state\">No activity yet. The first pickup will appear here.</p>';\n}\n\nasync function loadState() {\n  try {\n    currentState = await api(\"/api/state\");\n    loginView.classList.add(\"hidden\");\n    dashboard.classList.remove(\"hidden\");\n    render();\n  } catch (error) {\n    if (error.message === \"Please sign in.\") {\n      loginView.classList.remove(\"hidden\");\n      dashboard.classList.add(\"hidden\");\n    } else {\n      showToast(error.message);\n    }\n  }\n}\n\n$(\"#loginForm\").addEventListener(\"submit\", async (event) => {\n  event.preventDefault();\n  $(\"#loginError\").textContent = \"\";\n  try {\n    await api(\"/api/login\", {\n      method: \"POST\",\n      body: JSON.stringify({ password: $(\"#password\").value }),\n    });\n    $(\"#password\").value = \"\";\n    await loadState();\n  } catch (error) {\n    $(\"#loginError\").textContent = error.message;\n  }\n});\n\nlockerGrid.addEventListener(\"click\", async (event) => {\n  const assignId = event.target.dataset.assign;\n  const releaseId = event.target.dataset.release;\n  if (assignId) {\n    const locker = currentState.lockers.find((item) => item.id === assignId);\n    $(\"#lockerId\").value = assignId;\n    $(\"#dialogLockerName\").textContent = locker.name;\n    $(\"#pin\").placeholder = `Leave blank to generate ${locker.pinLength} digits`;\n    $(\"#assignError\").textContent = \"\";\n    assignDialog.showModal();\n  }\n  if (releaseId && confirm(\"Release this locker and revoke its active pickup code?\")) {\n    await api(`/api/lockers/${releaseId}/release`, { method: \"POST\", body: \"{}\" });\n    await loadState();\n  }\n});\n\n$(\"#assignForm\").addEventListener(\"submit\", async (event) => {\n  event.preventDefault();\n  const button = $(\"#createButton\");\n  button.disabled = true;\n  button.textContent = \"Creating secure code...\";\n  $(\"#assignError\").textContent = \"\";\n  try {\n    const result = await api(`/api/lockers/${$(\"#lockerId\").value}/pin`, {\n      method: \"POST\",\n      body: JSON.stringify({\n        riderName: $(\"#riderName\").value,\n        pin: $(\"#pin\").value,\n        hours: $(\"#hours\").value,\n        singleUse: $(\"#singleUse\").checked,\n      }),\n    });\n    assignDialog.close();\n    $(\"#codeLockerName\").textContent = result.lockerName;\n    $(\"#createdPin\").textContent = result.pin;\n    $(\"#codeMessage\").textContent = `Valid until ${formatDate(result.assignment.invalidAt)}. This PIN is shown only now.`;\n    riderMessage = `Order: ${result.assignment.riderName}. Hi Grab Rider! Your item is in ${result.lockerName}.\n\nEnter PIN *${result.pin}#\n\nPakipindot ang doorbell kung di mabuksan. Thank you!`;\n    codeDialog.showModal();\n    event.target.reset();\n    await loadState();\n  } catch (error) {\n    $(\"#assignError\").textContent = error.message;\n  } finally {\n    button.disabled = false;\n    button.textContent = \"Create pickup code\";\n  }\n});\n\n$(\"#copyButton\").addEventListener(\"click\", async () => {\n  await navigator.clipboard.writeText(riderMessage);\n  showToast(\"Rider message copied\");\n});\n\n$(\"#refreshButton\").addEventListener(\"click\", loadState);\n$(\"#logoutButton\").addEventListener(\"click\", async () => {\n  await api(\"/api/logout\", { method: \"POST\", body: \"{}\" });\n  await loadState();\n});\n\nloadState();\n";

const DEFAULT_LOCKERS = Array.from({ length: 6 }, (_, index) => ({
  id: `locker-${index + 1}`,
  name: `Locker ${index + 1}`,
  deviceId: "",
  pinLength: 6,
}));

function readLockers(fileConfig) {
  if (process.env.LOCKERS_JSON) {
    const parsed = JSON.parse(process.env.LOCKERS_JSON);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("LOCKERS_JSON must be a non-empty JSON array");
    return parsed;
  }
  if (Array.isArray(fileConfig.lockers) && fileConfig.lockers.length) return fileConfig.lockers;
  return DEFAULT_LOCKERS;
}

function loadConfig(rootDir = process.cwd()) {
  const configPath = process.env.LOCKER_CONFIG || path.join(rootDir, "config.json");
  let fileConfig = {};
  if (fs.existsSync(configPath)) fileConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const config = {
    mode: process.env.LOCKER_MODE || fileConfig.mode || "demo",
    host: process.env.LOCKER_HOST || fileConfig.host || "0.0.0.0",
    port: Number(process.env.LOCKER_PORT || process.env.PORT || fileConfig.port || 3000),
    staffPassword: process.env.STAFF_PASSWORD || fileConfig.staffPassword || "locker-demo",
    tuya: {
      baseUrl: process.env.TUYA_BASE_URL || fileConfig.tuya?.baseUrl || "https://openapi.tuyaus.com",
      clientId: process.env.TUYA_CLIENT_ID || fileConfig.tuya?.clientId || "",
      clientSecret: process.env.TUYA_CLIENT_SECRET || fileConfig.tuya?.clientSecret || "",
      passwordKey: process.env.TUYA_PASSWORD_KEY || fileConfig.tuya?.passwordKey || "",
      timeZone: process.env.TUYA_TIME_ZONE || fileConfig.tuya?.timeZone || "Asia/Manila",
    },
    lockers: readLockers(fileConfig),
  };
  if (!["demo", "tuya"].includes(config.mode)) throw new Error('mode must be either "demo" or "tuya"');
  if (config.mode === "tuya") {
    if (!config.tuya.clientId || !config.tuya.clientSecret) throw new Error("Tuya mode requires clientId and clientSecret");
    const missingDevice = config.lockers.find((locker) => !locker.deviceId);
    if (missingDevice) throw new Error(`Tuya mode requires a deviceId for ${missingDevice.name}`);
  }
  return config;
}

class LockerStore {
  constructor(filePath, lockers) {
    this.filePath = filePath;
    this.state = {
      lockers: Object.fromEntries(lockers.map((locker) => [locker.id, { status: "available", assignment: null, updatedAt: Date.now() }])),
      activity: [],
    };
    this.load();
  }
  load() {
    if (!fs.existsSync(this.filePath)) return;
    const saved = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    this.state.activity = Array.isArray(saved.activity) ? saved.activity : [];
    for (const [id, locker] of Object.entries(saved.lockers || {})) {
      if (this.state.lockers[id]) this.state.lockers[id] = locker;
    }
    this.expireAssignments();
  }
  persist() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
  }
  expireAssignments() {
    const now = Date.now();
    let changed = false;
    for (const locker of Object.values(this.state.lockers)) {
      if (locker.assignment && new Date(locker.assignment.invalidAt).getTime() <= now) {
        locker.status = "available";
        locker.assignment = null;
        locker.updatedAt = now;
        changed = true;
      }
    }
    if (changed) this.persist();
  }
  snapshot(lockers, mode) {
    this.expireAssignments();
    return {
      mode,
      lockers: lockers.map((definition) => ({
        ...definition,
        deviceId: definition.deviceId ? `${definition.deviceId.slice(0, 4)}...${definition.deviceId.slice(-4)}` : "",
        ...this.state.lockers[definition.id],
        assignment: this.state.lockers[definition.id].assignment ? {
          riderName: this.state.lockers[definition.id].assignment.riderName,
          effectiveAt: this.state.lockers[definition.id].assignment.effectiveAt,
          invalidAt: this.state.lockers[definition.id].assignment.invalidAt,
          singleUse: this.state.lockers[definition.id].assignment.singleUse,
        } : null,
      })),
      activity: this.state.activity.slice(0, 30),
    };
  }
  getAssignment(lockerId) {
    return this.state.lockers[lockerId]?.assignment || null;
  }
  assign(lockerId, assignment) {
    this.state.lockers[lockerId] = { status: "occupied", assignment, updatedAt: Date.now() };
    this.addActivity({ type: "pin-created", lockerId, riderName: assignment.riderName, invalidAt: assignment.invalidAt });
    this.persist();
  }
  release(lockerId) {
    const riderName = this.state.lockers[lockerId]?.assignment?.riderName || "";
    this.state.lockers[lockerId] = { status: "available", assignment: null, updatedAt: Date.now() };
    this.addActivity({ type: "released", lockerId, riderName });
    this.persist();
  }
  addActivity(activity) {
    this.state.activity.unshift({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...activity });
    this.state.activity = this.state.activity.slice(0, 100);
  }
}

class TuyaClient {
  constructor({ baseUrl, clientId, clientSecret, passwordKey, timeZone }) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.passwordKey = passwordKey || clientSecret;
    this.timeZone = timeZone || "Asia/Manila";
    this.token = null;
    this.tokenExpiresAt = 0;
  }
  sign({ method, path, body = "", token = "" }) {
    const t = Date.now().toString();
    const nonce = crypto.randomUUID().replaceAll("-", "");
    const contentHash = crypto.createHash("sha256").update(body).digest("hex");
    const stringToSign = `${method}\n${contentHash}\n\n${path}`;
    const payload = `${this.clientId}${token}${t}${nonce}${stringToSign}`;
    const sign = crypto.createHmac("sha256", this.clientSecret).update(payload).digest("hex").toUpperCase();
    return { client_id: this.clientId, t, nonce, sign, sign_method: "HMAC-SHA256", ...(token ? { access_token: token } : {}) };
  }
  async request(method, requestPath, data, needsToken = true) {
    const body = data === undefined ? "" : JSON.stringify(data);
    const token = needsToken ? await this.getToken() : "";
    const headers = this.sign({ method, path: requestPath, body, token });
    const response = await fetch(`${this.baseUrl}${requestPath}`, {
      method,
      headers: { ...headers, "Content-Type": "application/json" },
      ...(body ? { body } : {}),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.msg || `Tuya request failed (${response.status})`);
    return result.result;
  }
  async getToken() {
    if (this.token && Date.now() < this.tokenExpiresAt - 60_000) return this.token;
    const result = await this.request("GET", "/v1.0/token?grant_type=1", undefined, false);
    this.token = result.access_token;
    this.tokenExpiresAt = Date.now() + result.expire_time * 1000;
    return this.token;
  }
  aesAlgorithm(key) {
    if (![16, 24, 32].includes(key.length)) throw new Error("TUYA_PASSWORD_KEY must be 16, 24, or 32 bytes for AES encryption");
    return `aes-${key.length * 8}-ecb`;
  }
  decryptTicketKey(ticketKey) {
    const key = Buffer.from(this.passwordKey, "utf8");
    const decipher = crypto.createDecipheriv(this.aesAlgorithm(key), key, null);
    decipher.setAutoPadding(true);
    return Buffer.concat([decipher.update(Buffer.from(ticketKey, "hex")), decipher.final()]);
  }
  encryptPassword(password, ticketKey) {
    const key = this.decryptTicketKey(ticketKey);
    const cipher = crypto.createCipheriv(this.aesAlgorithm(key), key, null);
    cipher.setAutoPadding(true);
    return Buffer.concat([cipher.update(Buffer.from(password, "utf8")), cipher.final()]).toString("hex");
  }
  async createTemporaryPassword(deviceId, details) {
    const ticket = await this.request("POST", `/v1.0/devices/${deviceId}/door-lock/password-ticket`, {});
    const password = this.encryptPassword(details.pin, ticket.ticket_key);
    return this.request("POST", `/v1.0/devices/${deviceId}/door-lock/temp-password`, {
      name: details.name,
      password,
      effective_time: details.effectiveTime,
      invalid_time: details.invalidTime,
      password_type: "ticket",
      ticket_id: ticket.ticket_id,
      type: details.singleUse ? 1 : 0,
      time_zone: this.timeZone,
    });
  }
  async deleteTemporaryPassword(deviceId, passwordId) {
    return this.request("DELETE", `/v1.0/devices/${deviceId}/door-lock/temp-passwords/${passwordId}`);
  }
}

class DemoTuyaClient {
  async createTemporaryPassword() {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return { id: `demo-${Date.now()}` };
  }
  async deleteTemporaryPassword() {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return true;
  }
}

const ROOT = __dirname;
const config = loadConfig(ROOT);
const store = new LockerStore(path.join(ROOT, "data", "locker-state.json"), config.lockers);
const tuya = config.mode === "tuya" ? new TuyaClient(config.tuya) : new DemoTuyaClient();
const sessions = new Map();
const loginAttempts = new Map();

function json(res, status, data, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(data));
}
function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").filter(Boolean).map((item) => item.trim().split(/=(.*)/s).slice(0, 2)));
}
function authenticated(req) {
  const token = parseCookies(req).locker_session;
  const session = token && sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return false;
  }
  session.expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  return true;
}
function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100_000) throw new Error("Request is too large");
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}
function findLocker(id) {
  return config.lockers.find((locker) => locker.id === id);
}
function generatePin(length) {
  const minimum = 10 ** (length - 1);
  return String(crypto.randomInt(minimum, 10 ** length));
}
async function handleApi(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/login") {
    const ip = req.socket.remoteAddress || "local";
    const attempt = loginAttempts.get(ip) || { count: 0, resetAt: Date.now() };
    if (attempt.resetAt < Date.now()) {
      attempt.count = 0;
      attempt.resetAt = Date.now() + 60_000;
    }
    if (attempt.count >= 8) return json(res, 429, { error: "Try again in one minute." });
    const body = await readBody(req);
    if (!safeEqual(body.password || "", config.staffPassword)) {
      attempt.count += 1;
      loginAttempts.set(ip, attempt);
      return json(res, 401, { error: "Incorrect staff password." });
    }
    loginAttempts.delete(ip);
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    return json(res, 200, { ok: true }, { "Set-Cookie": `locker_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800` });
  }
  if (req.method === "POST" && url.pathname === "/api/logout") {
    const token = parseCookies(req).locker_session;
    if (token) sessions.delete(token);
    return json(res, 200, { ok: true }, { "Set-Cookie": "locker_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
  }
  if (!authenticated(req)) return json(res, 401, { error: "Please sign in." });
  if (req.method === "GET" && url.pathname === "/api/state") return json(res, 200, store.snapshot(config.lockers, config.mode));
  const pinMatch = url.pathname.match(/^\/api\/lockers\/([^/]+)\/pin$/);
  if (req.method === "POST" && pinMatch) {
    const locker = findLocker(pinMatch[1]);
    if (!locker) return json(res, 404, { error: "Locker not found." });
    const body = await readBody(req);
    const riderName = String(body.riderName || "").trim().slice(0, 80);
    const hours = Math.min(72, Math.max(1, Number(body.hours) || 4));
    const pin = String(body.pin || "").trim() || generatePin(locker.pinLength || 6);
    if (!riderName) return json(res, 400, { error: "Enter a rider or order name." });
    if (!new RegExp(`^\\d{${locker.pinLength || 6}}$`).test(pin)) return json(res, 400, { error: `PIN must be ${locker.pinLength || 6} digits.` });
    const effectiveTime = Math.floor(Date.now() / 1000) - 30;
    const invalidTime = Math.floor(Date.now() / 1000) + hours * 60 * 60;
    const result = await tuya.createTemporaryPassword(locker.deviceId, {
      pin,
      name: `Grab - ${riderName}`.slice(0, 50),
      effectiveTime,
      invalidTime,
      singleUse: Boolean(body.singleUse),
    });
    const assignment = {
      riderName,
      effectiveAt: new Date(effectiveTime * 1000).toISOString(),
      invalidAt: new Date(invalidTime * 1000).toISOString(),
      singleUse: Boolean(body.singleUse),
      tuyaPasswordId: result?.id || result?.password_id || null,
    };
    store.assign(locker.id, assignment);
    return json(res, 201, { pin, lockerName: locker.name, assignment });
  }
  const releaseMatch = url.pathname.match(/^\/api\/lockers\/([^/]+)\/release$/);
  if (req.method === "POST" && releaseMatch) {
    const locker = findLocker(releaseMatch[1]);
    if (!locker) return json(res, 404, { error: "Locker not found." });
    const assignment = store.getAssignment(locker.id);
    if (assignment?.tuyaPasswordId) await tuya.deleteTemporaryPassword(locker.deviceId, assignment.tuyaPasswordId);
    store.release(locker.id);
    return json(res, 200, { ok: true });
  }
  return json(res, 404, { error: "Not found." });
}
function serveStatic(req, res, url) {
  const routes = {
    "/": ["text/html", INDEX_HTML],
    "/index.html": ["text/html", INDEX_HTML],
    "/styles.css": ["text/css", STYLES_CSS],
    "/app.js": ["text/javascript", APP_JS],
  };
  const route = routes[url.pathname];
  if (!route) {
    res.writeHead(404);
    return res.end("Not found");
  }
  res.writeHead(200, { "Content-Type": route[0], "Cache-Control": "no-store" });
  res.end(route[1]);
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error.message || "Something went wrong." });
  }
});
server.listen(config.port, config.host, () => {
  console.log(`Locker Console running at http://${config.host}:${config.port}`);
  console.log(`Mode: ${config.mode}`);
});
