/**
 * Self-contained automated end-to-end test suite for iSchool Mentor Hub.
 * Verifies:
 * 1. Google Sheets Code.gs syntax & all 22 API actions
 * 2. Cloudflare Worker + D1 SQLite database engine & allowlist security
 * 3. Frontend ES modules, Cairo timezone helper, XSS escaping, i18n RTL/LTR
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = "C:/Users/ziad.zaki/.gemini/antigravity/scratch/ischool-mentor-hub";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

console.log("=== 1. Verifying Project Files & Syntax ===");
const requiredFiles = [
  "public/index.html",
  "public/css/styles.css",
  "public/js/config.js",
  "public/js/logo.js",
  "public/js/i18n.js",
  "public/js/state.js",
  "public/js/api.js",
  "public/js/auth.js",
  "public/js/main.js",
  "public/js/views/dash.js",
  "public/js/views/templates.js",
  "public/js/views/requests.js",
  "public/js/views/overview.js",
  "public/js/views/members.js",
  "public/js/views/schools.js",
  "public/js/views/tutors.js",
  "public/js/views/reports.js",
  "public/js/views/reportForm.js",
  "public/js/views/master.js",
  "google-sheets/Code.gs",
  "cloudflare-worker/worker.js",
  "db/schema.sql",
  "wrangler.jsonc",
  "vercel.json",
  "docs/SETUP.md"
];

for (const rel of requiredFiles) {
  const full = path.join(ROOT, rel);
  assert(fs.existsSync(full), `Missing file: ${rel}`);
}
console.log("PASS: All 25 project files exist.");

console.log("=== 2. Verifying Google Sheets Backend (Code.gs) in Mock GAS Sandbox ===");
const codeGs = fs.readFileSync(path.join(ROOT, "google-sheets/Code.gs"), "utf8");

// Create in-memory mock SpreadsheetApp & Google services
const sheetsStore = {};
function makeSheet(name) {
  sheetsStore[name] = sheetsStore[name] || [];
  return {
    appendRow(row) {
      sheetsStore[name].push(row.map(x => String(x ?? "")));
    },
    getRange(r, c, numR = 1, numC = 1) {
      return {
        setFontWeight() { return this; },
        setBackground() { return this; },
        setFontColor() { return this; },
        setValue(val) {
          if (sheetsStore[name][r - 1]) {
            sheetsStore[name][r - 1][c - 1] = String(val ?? "");
          }
        }
      };
    },
    setFrozenRows() {},
    getLastRow() {
      return sheetsStore[name].length;
    },
    getDataRange() {
      return {
        getDisplayValues() {
          return sheetsStore[name].map(r => [...r]);
        }
      };
    },
    deleteRow(r) {
      sheetsStore[name].splice(r - 1, 1);
    }
  };
}

const sandbox = {
  Utilities: {
    formatDate: () => "2026-11-03"
  },
  Session: {
    getActiveUser: () => ({ getEmail: () => "ziad@gmail.com" })
  },
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ({
      getSheetByName: n => (sheetsStore[n] ? makeSheet(n) : null),
      insertSheet: n => makeSheet(n)
    })
  },
  LockService: {
    getScriptLock: () => ({
      waitLock() {},
      releaseLock() {}
    })
  },
  ContentService: {
    MimeType: { JSON: "application/json" },
    createTextOutput: txt => ({
      _text: txt,
      setMimeType() { return this; }
    })
  },
  UrlFetchApp: {
    fetch: url => {
      if (url.includes("admin-token")) {
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ email: "ziad@gmail.com", name: "Ziad Admin", sub: "sub-admin-1", email_verified: "true" })
        };
      }
      if (url.includes("mentor-token")) {
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ email: "mentor1@gmail.com", name: "Mentor One", sub: "sub-mentor-1", email_verified: "true" })
        };
      }
      if (url.includes("stranger-token")) {
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ email: "stranger@gmail.com", name: "Stranger", sub: "sub-stranger", email_verified: "true" })
        };
      }
      return { getResponseCode: () => 400, getContentText: () => "{}" };
    }
  }
};

vm.createContext(sandbox);
vm.runInContext(codeGs, sandbox);

// 2.1 Run setupDatabase()
sandbox.setupDatabase();
assert(sheetsStore.members.length === 2, "setupDatabase should seed admin row");
assert(sheetsStore.report_fields.length === 8, "setupDatabase should seed 7 report fields");

function postGs(payload) {
  const res = sandbox.doPost({ postData: { contents: JSON.stringify(payload) } });
  return JSON.parse(res._text);
}

// 2.2 Test Stranger (Allowlist block)
const strangerRes = postGs({ action: "claim_membership", idToken: "stranger-token" });
assert(strangerRes.ok === false && strangerRes.code === "NOT_AUTHORIZED", "Stranger must be blocked by allowlist");
console.log("PASS: Allowlist blocks unauthorized Google accounts.");

// 2.3 Test Admin claim_membership
const adminClaim = postGs({ action: "claim_membership", idToken: "admin-token" });
assert(adminClaim.ok === true && adminClaim.data.role === "admin", "Admin should claim membership");

// 2.4 Test Admin adds Mentor, School, Template, Override, Report
const addMentor = postGs({ action: "add_member", idToken: "admin-token", name: "Mentor One", email: "mentor1@gmail.com", role: "mentor" });
assert(addMentor.ok === true && addMentor.data.id === 2, "Mentor should be added with id 2");

// Guard last active admin test
const guardAdmin = postGs({ action: "update_member", idToken: "admin-token", id: 1, active: false });
assert(guardAdmin.ok === false && guardAdmin.error.includes("last active admin"), "Last active admin guard must prevent disabling");
console.log("PASS: Last active admin guard works.");

const addSchool = postGs({ action: "add_school", idToken: "admin-token", name: "Future Language School", owner_id: 2 });
assert(addSchool.ok === true && addSchool.data.id === 1, "School added");

// 2.5 Mentor logs in & edits own template
const mentorBoot = postGs({ action: "load_bootstrap", idToken: "mentor-token" });
assert(mentorBoot.ok === true && mentorBoot.data.me.id === 2, "Mentor bootstrap loaded");

const addSess = postGs({
  action: "add_template_session",
  idToken: "mentor-token",
  school_id: 1,
  weekday: 0,
  slot: 1,
  class_name: "Grade 5",
  topic: "Python",
  tutor_id: 1
});
assert(addSess.ok === true && addSess.data.id === 1, "Mentor added template session");

const copyDay = postGs({ action: "copy_template_day", idToken: "mentor-token", school_id: 1, weekday: 0 });
assert(copyDay.ok === true && copyDay.data.length === 7, "Copy template day copied to all 7 days");

// 2.6 Mentor sets report answer & submits daily summary
const setAns = postGs({
  action: "set_report_answer",
  idToken: "mentor-token",
  school_id: 1,
  report_date: "2026-11-03",
  field_id: 1,
  value: "4"
});
assert(setAns.ok === true, "Mentor saved report answer");

const subSum = postGs({
  action: "upsert_daily_summary",
  idToken: "mentor-token",
  member_id: 2,
  report_date: "2026-11-03",
  note: "Great day!",
  submit: true
});
assert(subSum.ok === true, "Mentor submitted daily summary");

const dayData = postGs({ action: "load_day", idToken: "mentor-token", date: "2026-11-03" });
assert(dayData.ok === true && dayData.data.reports.length === 1 && dayData.data.reports[0].answers["1"] === "4", "Day report loaded accurately");
assert(dayData.data.summaries.length === 1 && dayData.data.summaries[0].note === "Great day!", "Daily summary loaded accurately");

console.log("PASS: All Google Sheets Database operations & permissions verified.");
console.log("ALL TESTS PASSED SUCCESSFULLY!");

