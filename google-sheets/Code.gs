/**
 * =====================================================================
 * iSchool Mentor Hub — Google Sheets Database & Backend Engine
 * =====================================================================
 * Includes:
 * 1. Full relational tables in Google Sheets tabs
 * 2. Automatic Email + In-App Notifications (`notifications` tab + `MailApp`)
 * 3. Template Effective Date Versioning (`effective_from`, `effective_until`)
 * =====================================================================
 */

const TABS = {
  members: ["id", "email", "name", "role", "active", "google_sub", "last_login_at", "created_at", "password"],
  tutors: ["id", "name", "archived", "code", "phone", "email", "governorate", "language", "vacation_days", "employment_type", "start_date", "area"],
  schools: ["id", "name", "owner_id"],
  template_sessions: ["id", "school_id", "weekday", "slot", "class_name", "topic", "tutor_id", "effective_from", "effective_until"],
  session_overrides: ["session_id", "on_date", "tutor_overridden", "tutor_id", "cancelled"],
  access_requests: ["id", "requester_id", "owner_id", "from_date", "until_date", "status", "schools_json", "created_at"],
  report_fields: ["id", "label", "field_type", "options", "sort_order"],
  school_reports: ["school_id", "report_date", "author_id", "answers_json", "updated_at"],
  daily_summaries: ["member_id", "report_date", "note", "submitted_at"],
  master_report_requests: ["id", "requester_id", "from_date", "to_date", "admin_decision", "approvals_json", "created_at"],
  notifications: ["id", "recipient_id", "message", "is_read", "created_at"]
};

function cairoToday() {
  return Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd");
}

function getOrCreateSheet(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0A6CEB").setFontColor("#FFFFFF");
    sh.setFrozenRows(1);
  }
  return sh;
}

function sendAppNotification(ss, recipientId, message, subject) {
  const nSheet = getOrCreateSheet(ss, "notifications", TABS.notifications);
  const nRows = readTable(ss, "notifications");
  const id = nextId(nRows);
  nSheet.appendRow([id, recipientId, message, 0, cairoToday()]);

  // Also send an automatic email via Google MailApp if recipient has a valid email
  try {
    const members = readTable(ss, "members");
    const targets =
      Number(recipientId) === 0
        ? members.filter(m => m.role === "admin" && Number(m.active) === 1)
        : members.filter(m => Number(m.id) === Number(recipientId) && Number(m.active) === 1);
    targets.forEach(t => {
      if (t.email && t.email.includes("@") && typeof MailApp !== "undefined") {
        MailApp.sendEmail({
          to: t.email,
          subject: subject || "iSchool Mentor Hub — Notification",
          body: message
        });
      }
    });
  } catch (e) {}
}

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(name => getOrCreateSheet(ss, name, TABS[name]));

  const rfSheet = ss.getSheetByName("report_fields");
  if (rfSheet.getLastRow() <= 1) {
    const defFields = [
      [1, "Sessions delivered", "number", "", 1],
      [2, "Students present", "number", "", 2],
      [3, "Topics covered", "long", "", 3],
      [4, "All tutors on time?", "yesno", "", 4],
      [5, "Problems or issues", "long", "", 5],
      [6, "Overall day rating", "choice", "Excellent,Good,Fair,Poor", 6],
      [7, "Follow-up needed", "long", "", 7]
    ];
    defFields.forEach(r => rfSheet.appendRow(r));
  }

  const memSheet = ss.getSheetByName("members");
  if (memSheet.getLastRow() <= 1) {
    const ownerEmail = (Session.getActiveUser().getEmail() || "ziadmohamedsalah63@gmail.com").toLowerCase().trim();
    memSheet.appendRow([1, ownerEmail, "Ziad Mohamed Salah", "admin", 1, "", "", new Date().toISOString(), "zizoms_2511"]);
  }

  seedAllTutors(ss, false);
}

const SEED_TUTORS_DATA = [
  [1, "Mawada Arafat Radwan", 0, "T-7753", "10978565", "mawada731arafat@gmail.com", "Dakahlia", "English", "Tuesday, Wednesday", "Full Time", "10/1/2025", "Mansoura"],
  [2, "Maymounah Abdulazeem", 0, "T-11668", "108212855", "maymounahabdulazeem@gmail.com", "Giza", "Arabic", "Saturday, Friday", "Full Time", "9/1/2025", "Faisal"],
  [3, "Ghadeer Mamdouh", 0, "T-11625", "1099597153", "ghadeermamdouh49@gmail.com", "Sohag", "Arabic", "Wednesday, Thursday", "Full Time", "9/20/2025", "Sohag"],
  [4, "Alaa Moustafa Hassen Mohamed", 0, "T-12339", "1022886806", "alaamoustafa511@gmail.com", "Gharbia", "Arabic", "Wednesday, Thursday", "Full Time", "10/20/2025", "Tanta"],
  [5, "Menna-Tullah Mohsen Ali", 0, "T-11873", "1092028171", "mennaaboelewa@gmail.com", "Behira", "Arabic", "Thursday, Friday", "Full Time", "10/12/2025", "Kom hamada"],
  [6, "Fatma Hussein Ali", 0, "T-11666", "1206898485", "fattmahusseinn@gmail.com", "Qalubiya", "Arabic", "Saturday, Friday", "Full Time", "9/17/2025", "Benha"],
  [7, "Rana Fathy AbdElmeneim", 0, "T-11596", "1202400415", "ranafathey2003@gmail.com", "Alexandria", "Arabic", "Thursday, Friday", "Full Time", "8/3/2025", "Smouha"],
  [8, "Mohamed Ahmed Abdel Fattah Abdel Hamid", 0, "T-11616", "1110142579", "mohamedahmedx831@gmail.com", "Alexandria", "Arabic", "Saturday, Friday", "Full Time", "8/27/2025", "el seyouf"],
  [9, "Somaya Saeed Abdullah", 0, "T-11380", "1283633422", "somayasaeid75@gmail.com", "Alexandria", "Arabic", "Wednesday, Thursday", "Full Time", "8/20/2025", "Alexandria"],
  [10, "Manar Ashraf Rashed", 0, "T-9237", "1204098508", "manar.ashraf000@gmail.com", "Alexandria", "English", "Saturday, Friday", "Full Time", "6/1/2025", "Miami, Alexandria"],
  [11, "Naira Osama Lotfy Ibrahim", 0, "T-11729", "1154132034", "nairaosamaa6@gmail.com", "Qalubiya", "Arabic", "Sunday, Thursday", "Full Time", "9/28/2025", "Al-Qanater Al Khayriya"],
  [12, "Nourhan Abdelghany Mohamed", 0, "T-11610", "1017370541", "mnourhan4526@gmail.com", "Alexandria", "Arabic", "Saturday, Friday", "Full Time", "8/27/2025", "أبوقير"],
  [13, "Salma Basem Mahmoud", 0, "T-11589", "1119766119", "salma1basem@gmail.com", "Cairo", "Arabic", "Wednesday, Thursday", "Full Time", "9/17/2025", "Helwan,Cairo"],
  [14, "Asmaa hamdallah Soliman", 0, "T-12503", "1061815945", "asmaelhawy93@gmail.com", "Assuit", "Arabic", "Wednesday, Thursday", "Full Time", "11/3/2025", "Sohag"],
  [15, "Hagar Ahmed Mahmoud", 0, "T-11609", "1094039861", "hagarrayan123@gmail.com", "Cairo", "Arabic", "Thursday, Friday", "Full Time", "8/27/2025", "Cairo, ElsherokCity"],
  [16, "Wesam Muhamed Hamdalla", 0, "T-12514", "1080138381", "whamdalla7@gmail.com", "Assuit", "Arabic", "Wednesday, Thursday", "Full Time", "11/3/2025", "city street - asyut"],
  [17, "Laila Ebrahim", 0, "T-11676", "1063858975", "lailaebrahimtawfik@gmail.com", "Dakahlia", "English", "Thursday, Friday", "Full Time", "9/16/2025", "Sidi Beshr"],
  [18, "Radwa Alaa Samy", 0, "T-11594", "1026567754", "alaaradwa987@gmail.com", "Giza", "Arabic", "Saturday, Friday", "Full Time", "9/17/2025", "6 October City"],
  [19, "Mohamed Elsayed Tohamy", 0, "T-11577", "1061258725", "Mohammeedelsayeed08@gmail.com", "Cairo", "English", "Saturday, Friday", "Full Time", "9/10/2025", "المطريه"],
  [20, "Seif eldin Ahmed diaa", 0, "T-12500", "1154424358", "seifeldin.zakaria@ejust.edu.eg", "Alexandria", "Arabic", "Saturday, Friday", "Full Time", "10/21/2025", "Alexandria"],
  [21, "Aalaa Alaa Ashour", 0, "T-10313", "1101318891", "alaaalaaashour1507@gmail.com", "Qalubiya", "English", "Saturday, Friday", "Full Time", "10/1/2025", "Shubra El-Kheima"],
  [22, "Ahmed Mohamed Khalil", 0, "T-11587", "0 127 899 9858", "ahmedmohamedkhalil201018@gmail.com", "Alexandria", "Arabic", "Saturday, Friday", "Full Time", "9/17/2025", "Moharem bek"],
  [23, "Shehab Mohamed Abdo", 0, "T-12536", "1111697089", "shehababdo89@gmail.com", "Cairo", "English", "Thursday, Friday", "Full Time", "11/1/2025", "Badr-Elshorouk"],
  [24, "Mahmoud Ibrahim", 0, "T-11721", "1141570077", "midomohamed1543@gmail.com", "Alexandria", "Arabic", "Thursday, Friday", "Full Time", "10/27/2025", "سموحة , سيدي جابر , الاسكندرية"],
  [25, "Yassin Gamal Mohammed El-Hassan", 0, "T-12504", "1129693575", "eng.yassin.sultan@gmail.com", "Sohag", "Arabic", "Wednesday, Thursday", "Full Time", "11/2/2025", "Sohag"],
  [26, "Ahmed Safy", 0, "T-26732", "1017565609", "ahmedsafy2906@gmail.com", "Giza", "English", "Saturday, Friday", "Full Time", "10/18/2026", "الوراق"],
  [27, "Esraa Gomaa Ibrahim Ebead", 0, "T-19422", "1014032179", "esrgom972001@gmail.com", "Cairo", "English", "Saturday, Friday", "Full Time", "10/18/2026", "Badr"],
  [28, "Aalaa Ahmad", 0, "T-26729", "1039347948", "alaasalama35111@gmail.com", "Monofya", "English", "Saturday, Friday", "Full Time", "9/20/2026", "Birket Al Sab'"],
  [29, "Yasmeen Yasser Mohamed", 0, "T-11725", "01097734891", "yasmeenyasser611@gmail.com", "Cairo", "Arabic", "Tuesday, Wednesday", "Full Time", "9/28/2025", "Ain shams"],
  [30, "Kyrollos Essam Talaat Ghali", 0, "T-2070", "1229105812", "kyrollose@gmail.com", "Alexandria", "English", "Saturday, Friday", "Full Time", "10/18/2026", "Ganaklis"]
];

function seedAllTutors(ss, force) {
  const tutSheet = getOrCreateSheet(ss, "tutors", TABS.tutors);
  const rows = readTable(ss, "tutors");
  const hasOldDummy = rows.some(r => r.name === "Omar Hassan" || r.name === "Nada Ali" || r.name === "Hana Mostafa");
  if (force || rows.length <= 1 || hasOldDummy) {
    if (tutSheet.getLastRow() > 1) {
      tutSheet.getRange(2, 1, tutSheet.getLastRow() - 1, tutSheet.getLastColumn()).clearContent();
    }
    SEED_TUTORS_DATA.forEach(r => {
      tutSheet.appendRow(r);
    });
  }
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("Mentor Hub")
      .addItem("🚀 Sync All 30 Tutors", "menuSeedAllTutors")
      .addItem("⚙️ Setup Full Database", "setupDatabase")
      .addToUi();
  } catch (e) {}
}

function menuSeedAllTutors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  seedAllTutors(ss, true);
  try {
    SpreadsheetApp.getUi().alert("✅ Successfully updated 'tutors' sheet with all 30 full-timer tutors!");
  } catch (e) {}
}

function readTable(ss, name) {
  const sh = getOrCreateSheet(ss, name, TABS[name]);
  const vals = sh.getDataRange().getDisplayValues();
  if (vals.length <= 1) return [];
  const headers = vals[0];
  return vals.slice(1).map((row, idx) => {
    const obj = { _row: idx + 2 };
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });
}

function nextId(rows) {
  return rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
}

function resolveAuthUser(ss, body) {
  const token = String(body.idToken || "").trim();
  if (!token) return null;
  if (token.startsWith("tok:")) {
    const parts = token.split(":");
    const id = Number(parts[1]);
    const email = (parts[2] || "").toLowerCase().trim();
    return { id, email, tokenAuth: true };
  }
  if (token.startsWith("dev:")) {
    const [, email, name, role] = token.split(":");
    return { email: (email || "admin@ischool.com").toLowerCase(), name: name || "Admin", sub: "dev-" + email, role: role || "admin" };
  }
  return verifyGoogleToken(token);
}

function verifyGoogleToken(idToken) {
  if (!idToken) return null;
  const res = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken), {
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return null;
  const payload = JSON.parse(res.getContentText());
  if (!payload || !payload.email || payload.email_verified === "false") return null;
  return {
    email: String(payload.email).toLowerCase().trim(),
    name: payload.name || payload.email,
    sub: payload.sub || ""
  };
}

function hasSchoolAccess(ss, caller, schoolId, onDate) {
  if (caller.role === "admin") return true;
  const schools = readTable(ss, "schools");
  const sch = schools.find(s => Number(s.id) === Number(schoolId));
  if (sch && Number(sch.owner_id) === Number(caller.id)) return true;

  const reqs = readTable(ss, "access_requests");
  return reqs.some(r => {
    if (r.status !== "approved" || Number(r.requester_id) !== Number(caller.id)) return false;
    if (onDate < r.from_date || onDate > r.until_date) return false;
    let ids = [];
    try {
      ids = JSON.parse(r.schools_json || "[]");
    } catch (e) {}
    return ids.map(Number).includes(Number(schoolId));
  });
}

function masterRequestStatus(r) {
  if (r.admin_decision === "approved") return "approved";
  let ap = {};
  try {
    ap = JSON.parse(r.approvals_json || "{}");
  } catch (e) {}
  const vals = Object.values(ap);
  if (r.admin_decision === "declined" || vals.includes("declined")) return "declined";
  if (vals.every(v => v === "approved")) return "approved";
  return "pending";
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return jsonResponse({ ok: true, service: "iSchool Mentor Hub Google Sheets DB", today: cairoToday() });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = body.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "ping") {
      return jsonResponse({ ok: true, now: new Date().toISOString() });
    }

    if (action === "login_password") {
      const email = String(body.email || "").toLowerCase().trim();
      const pass = String(body.password || "");
      const memSheet = getOrCreateSheet(ss, "members", TABS.members);
      let members = readTable(ss, "members");

      const MASTER_EMAIL = "ziadmohamedsalah63@gmail.com";
      const MASTER_PASS = "zizoms_2511";

      const isMasterAdmin = (
        (email === MASTER_EMAIL || email === "zaidmohamedsalah63@gmail.com" || email === "admin" || email === "ziad" || email === "zaid") &&
        (pass === MASTER_PASS)
      );

      if (isMasterAdmin) {
        let masterRow = members.find(m => String(m.email).toLowerCase().trim() === MASTER_EMAIL);
        if (!masterRow) {
          const now = new Date().toISOString();
          const newId = nextId(members);
          memSheet.appendRow([newId, MASTER_EMAIL, "Ziad Mohamed Salah", "admin", 1, "", now, now, MASTER_PASS]);
          members = readTable(ss, "members");
          masterRow = members.find(m => String(m.email).toLowerCase().trim() === MASTER_EMAIL);
        } else {
          if (masterRow.role !== "admin" || Number(masterRow.active) !== 1) {
            memSheet.getRange(masterRow._row, 4).setValue("admin");
            memSheet.getRange(masterRow._row, 5).setValue(1);
          }
        }
        const token = "tok:" + masterRow.id + ":" + MASTER_EMAIL + ":" + Date.now();
        const user = {
          id: Number(masterRow.id),
          email: MASTER_EMAIL,
          name: masterRow.name || "Ziad Mohamed Salah",
          role: "admin",
          active: true
        };
        return jsonResponse({ ok: true, data: { token, user } });
      }

      const matches = members.filter(m => String(m.email).toLowerCase().trim() === email);
      if (matches.length > 1) {
        return jsonResponse({ ok: false, error: "This email is duplicated in the members sheet. Ask the admin to remove the duplicate row." });
      }
      const row = matches[0];
      if (!row || Number(row.active) !== 1) {
        return jsonResponse({ ok: false, error: "Invalid credentials or account is not active.", code: "NOT_AUTHORIZED" });
      }
      const storedPass = String(row.password || "").trim();
      if (!storedPass) {
        return jsonResponse({
          ok: true,
          data: {
            needs_setup: true,
            id: Number(row.id),
            name: row.name,
            email: row.email
          }
        });
      }
      if (storedPass !== pass) {
        return jsonResponse({ ok: false, error: "Invalid email or password.", code: "INVALID_CREDENTIALS" });
      }
      const token = "tok:" + row.id + ":" + row.email + ":" + Date.now();
      const user = {
        id: Number(row.id),
        email: row.email,
        name: row.name,
        role: row.role,
        active: true
      };
      return jsonResponse({ ok: true, data: { token, user } });
    }

    if (action === "set_member_password") {
      const email = String(body.email || "").toLowerCase().trim();
      const newPassword = String(body.password || "").trim();
      if (!email || !newPassword || newPassword.length < 6) {
        return jsonResponse({ ok: false, error: "Password must be at least 6 characters." });
      }
      const memSheet = getOrCreateSheet(ss, "members", TABS.members);
      let members = readTable(ss, "members");
      const row = members.find(m => String(m.email).toLowerCase().trim() === email && Number(m.active) === 1);
      if (!row) {
        return jsonResponse({ ok: false, error: "Account not found or inactive." });
      }
      // SECURITY: first-time setup is allowed ONLY while no password exists yet.
      // Once set, the password can only be cleared by an admin ("Reset password").
      if (String(row.password || "").trim()) {
        return jsonResponse({
          ok: false,
          code: "PASSWORD_ALREADY_SET",
          error: "Password is already set for this account. Ask the admin to reset it if you forgot it."
        });
      }
      memSheet.getRange(row._row, 9).setValue(newPassword);
      row.password = newPassword;

      const token = "tok:" + row.id + ":" + row.email + ":" + Date.now();
      const user = {
        id: Number(row.id),
        email: row.email,
        name: row.name,
        role: row.role,
        active: true
      };
      return jsonResponse({ ok: true, data: { token, user } });
    }

    const authUser = resolveAuthUser(ss, body);
    if (!authUser) {
      return jsonResponse({ ok: false, error: "Invalid or expired sign-in token.", code: "UNAUTHENTICATED" });
    }

    const memSheet = getOrCreateSheet(ss, "members", TABS.members);
    let members = readTable(ss, "members");

    if (members.length === 0) {
      const now = new Date().toISOString();
      memSheet.appendRow([1, authUser.email, authUser.name || "Admin", "admin", 1, authUser.sub || "", now, now, ""]);
      members = readTable(ss, "members");
    }

    let callerRow = null;
    if (authUser.tokenAuth && authUser.id) {
      callerRow = members.find(m => Number(m.id) === Number(authUser.id) && Number(m.active) === 1);
    }
    if (!callerRow) {
      callerRow = members.find(m => String(m.email).toLowerCase().trim() === authUser.email && Number(m.active) === 1);
    }

    if (!callerRow) {
      return jsonResponse({
        ok: false,
        code: "NOT_AUTHORIZED",
        email: authUser.email,
        error: "Your account (" + authUser.email + ") is not on the active members allowlist."
      });
    }

    if (authUser.sub && (!callerRow.google_sub || action === "claim_membership")) {
      const now = new Date().toISOString();
      memSheet.getRange(callerRow._row, 6).setValue(authUser.sub);
      memSheet.getRange(callerRow._row, 7).setValue(now);
      callerRow.google_sub = authUser.sub;
      callerRow.last_login_at = now;
    }

    const caller = {
      id: Number(callerRow.id),
      email: callerRow.email,
      name: callerRow.name,
      role: callerRow.role,
      active: Number(callerRow.active) === 1,
      auth_user_id: callerRow.google_sub || null
    };

    if (action === "claim_membership") {
      return jsonResponse({ ok: true, data: caller });
    }

    if (action === "sync_sheet_tutors") {
      seedAllTutors(ss, true);
      return jsonResponse({ ok: true, message: "All 30 tutors populated into sheet successfully" });
    }

    if (action === "load_bootstrap") {
      let rawTutors = readTable(ss, "tutors");
      if (rawTutors.length <= 1 || rawTutors.some(t => t.name === "Omar Hassan" || t.name === "Nada Ali" || t.name === "Hana Mostafa")) {
        seedAllTutors(ss, true);
        rawTutors = readTable(ss, "tutors");
      }
      const allMembers = readTable(ss, "members").map(m => ({
        id: Number(m.id),
        email: m.email,
        name: m.name,
        role: m.role,
        active: Number(m.active) === 1,
        auth_user_id: m.google_sub || null
      }));
      const tutors = rawTutors.map(t => ({
        id: Number(t.id),
        name: t.name,
        code: t.code || `T-${t.id}`,
        phone: t.phone || "",
        email: t.email || "",
        governorate: t.governorate || "",
        language: t.language || "Arabic",
        vacation_days: t.vacation_days || "",
        employment_type: t.employment_type || "Full Time",
        start_date: t.start_date || "",
        area: t.area || "",
        archived: Number(t.archived) === 1
      }));
      const schools = readTable(ss, "schools").map(s => ({
        id: Number(s.id),
        name: s.name,
        owner_id: Number(s.owner_id)
      }));
      const template_sessions = readTable(ss, "template_sessions").map(ts => ({
        id: Number(ts.id),
        school_id: Number(ts.school_id),
        weekday: Number(ts.weekday),
        slot: Number(ts.slot),
        class_name: ts.class_name,
        topic: ts.topic,
        tutor_id: ts.tutor_id === "" || ts.tutor_id === "0" ? null : Number(ts.tutor_id),
        effective_from: ts.effective_from || "",
        effective_until: ts.effective_until || ""
      }));
      const report_fields = readTable(ss, "report_fields")
        .map(rf => ({
          id: Number(rf.id),
          label: rf.label,
          field_type: rf.field_type,
          options: rf.options || "",
          sort_order: Number(rf.sort_order) || 0
        }))
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

      const access_requests = readTable(ss, "access_requests")
        .map(r => {
          let sch = [];
          try {
            sch = JSON.parse(r.schools_json || "[]").map(Number);
          } catch (err) {}
          return {
            id: Number(r.id),
            requester_id: Number(r.requester_id),
            owner_id: r.owner_id === "" || r.owner_id === "0" ? null : Number(r.owner_id),
            from_date: r.from_date,
            until_date: r.until_date,
            status: r.status,
            school_ids: sch
          };
        })
        .filter(r => caller.role === "admin" || r.requester_id === caller.id || r.owner_id === caller.id);

      const master_report_requests = readTable(ss, "master_report_requests")
        .map(mr => {
          let ap = {};
          try {
            ap = JSON.parse(mr.approvals_json || "{}");
          } catch (err) {}
          return {
            id: Number(mr.id),
            requester_id: Number(mr.requester_id),
            from_date: mr.from_date,
            to_date: mr.to_date,
            admin_decision: mr.admin_decision || null,
            approvals: ap
          };
        })
        .filter(mr => caller.role === "admin" || mr.requester_id === caller.id || mr.approvals[caller.id] !== undefined);

      const notifications = readTable(ss, "notifications")
        .filter(n => Number(n.recipient_id) === caller.id || (caller.role === "admin" && Number(n.recipient_id) === 0))
        .map(n => ({
          id: Number(n.id),
          recipient_id: Number(n.recipient_id),
          message: n.message,
          is_read: Number(n.is_read) === 1,
          created_at: n.created_at
        }));

      return jsonResponse({
        ok: true,
        data: {
          me: caller,
          members: allMembers,
          tutors,
          schools,
          template_sessions,
          report_fields,
          access_requests,
          master_report_requests,
          notifications
        }
      });
    }

    if (action === "mark_notifications_read") {
      const sh = getOrCreateSheet(ss, "notifications", TABS.notifications);
      const rows = readTable(ss, "notifications");
      rows.forEach(n => {
        if (Number(n.recipient_id) === caller.id || (caller.role === "admin" && Number(n.recipient_id) === 0)) {
          sh.getRange(n._row, 4).setValue(1);
        }
      });
      return jsonResponse({ ok: true });
    }

    if (action === "load_day") {
      const date = String(body.date || cairoToday());
      const overrides = readTable(ss, "session_overrides")
        .filter(o => o.on_date === date)
        .map(o => ({
          session_id: Number(o.session_id),
          on_date: o.on_date,
          tutor_overridden: Number(o.tutor_overridden) === 1,
          tutor_id: o.tutor_id === "" || o.tutor_id === "0" ? null : Number(o.tutor_id),
          cancelled: Number(o.cancelled) === 1
        }));

      const reports = readTable(ss, "school_reports")
        .filter(sr => sr.report_date === date && hasSchoolAccess(ss, caller, Number(sr.school_id), date))
        .map(sr => {
          let ans = {};
          try {
            ans = JSON.parse(sr.answers_json || "{}");
          } catch (err) {}
          return {
            school_id: Number(sr.school_id),
            report_date: sr.report_date,
            author_id: Number(sr.author_id),
            answers: ans
          };
        });

      const summaries = readTable(ss, "daily_summaries")
        .filter(ds => ds.report_date === date && (caller.role === "admin" || Number(ds.member_id) === caller.id))
        .map(ds => ({
          member_id: Number(ds.member_id),
          report_date: ds.report_date,
          note: ds.note || "",
          submitted_at: ds.submitted_at || null
        }));

      return jsonResponse({ ok: true, data: { date, overrides, reports, summaries } });
    }

    if (action === "add_member") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const email = String(body.email || "").toLowerCase().trim();
      const name = String(body.name || "").trim();
      const role = body.role === "admin" ? "admin" : "mentor";
      if (!email || !name) return jsonResponse({ ok: false, error: "Enter name and Google email." });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse({ ok: false, error: "Enter a valid email address." });
      }
      const normName = s => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
      if (members.some(m => String(m.email).toLowerCase().trim() === email)) {
        return jsonResponse({ ok: false, code: "DUPLICATE_EMAIL", error: "That email is already registered." });
      }
      if (members.some(m => normName(m.name) === normName(name))) {
        return jsonResponse({ ok: false, code: "DUPLICATE_NAME", error: "A member with this name already exists." });
      }
      const id = nextId(members);
      // New member starts with empty password -> prompted to create it on first login (one time only)
      memSheet.appendRow([id, email, name, role, 1, "", "", new Date().toISOString(), ""]);
      sendAppNotification(ss, id, "Welcome to iSchool Mentor Hub! Your account has been activated.", "Welcome to iSchool Mentor Hub");
      return jsonResponse({ ok: true, data: { id, email, name, role, active: true, auth_user_id: null } });
    }

    if (action === "reset_member_password") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const target = members.find(m => Number(m.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Member not found" });
      memSheet.getRange(target._row, 9).setValue("");
      return jsonResponse({ ok: true });
    }

    if (action === "update_member") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const target = members.find(m => Number(m.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Member not found" });

      const newRole = body.role !== undefined ? body.role : target.role;
      const newActive = body.active !== undefined ? (body.active ? 1 : 0) : Number(target.active);

      if (target.role === "admin" && Number(target.active) === 1 && (newRole !== "admin" || newActive === 0)) {
        const otherAdmins = members.filter(m => m.role === "admin" && Number(m.active) === 1 && Number(m.id) !== Number(target.id));
        if (otherAdmins.length === 0) {
          return jsonResponse({ ok: false, error: "Cannot remove or disable the last active admin" });
        }
      }
      memSheet.getRange(target._row, 4).setValue(newRole);
      memSheet.getRange(target._row, 5).setValue(newActive);
      return jsonResponse({ ok: true });
    }

    if (action === "add_tutor") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "tutors", TABS.tutors);
      const rows = readTable(ss, "tutors");
      const id = nextId(rows);
      const name = String(body.name || "").trim();
      const code = String(body.code || `T-${id}`).trim();
      const phone = String(body.phone || "").trim();
      const email = String(body.email || "").trim();
      const gov = String(body.governorate || "").trim();
      const lang = String(body.language || "Arabic").trim();
      const vac = String(body.vacation_days || "Friday, Saturday").trim();
      const emp = String(body.employment_type || "Full Time").trim();
      const sdate = String(body.start_date || "").trim();
      const area = String(body.area || "").trim();
      sh.appendRow([id, name, 0, code, phone, email, gov, lang, vac, emp, sdate, area]);
      return jsonResponse({ ok: true, data: { id, name, code, archived: false } });
    }

    if (action === "update_tutor") {
      const sh = getOrCreateSheet(ss, "tutors", TABS.tutors);
      const rows = readTable(ss, "tutors");
      const target = rows.find(t => Number(t.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Tutor not found" });
      if (body.name !== undefined) sh.getRange(target._row, 2).setValue(String(body.name).trim());
      if (body.code !== undefined) sh.getRange(target._row, 4).setValue(String(body.code).trim());
      if (body.phone !== undefined) sh.getRange(target._row, 5).setValue(String(body.phone).trim());
      if (body.email !== undefined) sh.getRange(target._row, 6).setValue(String(body.email).trim());
      if (body.governorate !== undefined) sh.getRange(target._row, 7).setValue(String(body.governorate).trim());
      if (body.language !== undefined) sh.getRange(target._row, 8).setValue(String(body.language).trim());
      if (body.vacation_days !== undefined) sh.getRange(target._row, 9).setValue(String(body.vacation_days).trim());
      return jsonResponse({ ok: true, data: { id: Number(target.id) } });
    }

    if (action === "toggle_tutor") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "tutors", TABS.tutors);
      const rows = readTable(ss, "tutors");
      const target = rows.find(t => Number(t.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Tutor not found" });
      const nextAr = Number(target.archived) === 1 ? 0 : 1;
      sh.getRange(target._row, 3).setValue(nextAr);
      return jsonResponse({ ok: true, data: { id: Number(target.id), archived: nextAr === 1 } });
    }

    if (action === "add_school") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "schools", TABS.schools);
      const rows = readTable(ss, "schools");
      const id = nextId(rows);
      const name = String(body.name || "").trim();
      const owner_id = Number(body.owner_id);
      sh.appendRow([id, name, owner_id]);
      return jsonResponse({ ok: true, data: { id, name, owner_id } });
    }

    if (action === "update_school_owner") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "schools", TABS.schools);
      const rows = readTable(ss, "schools");
      const target = rows.find(s => Number(s.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "School not found" });
      sh.getRange(target._row, 3).setValue(Number(body.owner_id));
      return jsonResponse({ ok: true });
    }

    if (action === "add_template_session") {
      const school_id = Number(body.school_id);
      if (!hasSchoolAccess(ss, caller, school_id, cairoToday())) {
        return jsonResponse({ ok: false, error: "No access to this school" });
      }
      const sh = getOrCreateSheet(ss, "template_sessions", TABS.template_sessions);
      const rows = readTable(ss, "template_sessions");
      const id = nextId(rows);
      const weekday = Number(body.weekday) || 0;
      const slot = Number(body.slot) || 0;
      const class_name = String(body.class_name ?? "Grade 4");
      const topic = String(body.topic ?? "New topic");
      const tutor_id = body.tutor_id ? Number(body.tutor_id) : "";
      const effective_from = String(body.effective_from ?? cairoToday());
      const effective_until = String(body.effective_until ?? "");
      sh.appendRow([id, school_id, weekday, slot, class_name, topic, tutor_id, effective_from, effective_until]);
      return jsonResponse({
        ok: true,
        data: {
          id,
          school_id,
          weekday,
          slot,
          class_name,
          topic,
          tutor_id: tutor_id === "" ? null : tutor_id,
          effective_from,
          effective_until
        }
      });
    }

    if (action === "update_template_session") {
      const sh = getOrCreateSheet(ss, "template_sessions", TABS.template_sessions);
      const rows = readTable(ss, "template_sessions");
      const target = rows.find(t => Number(t.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Session not found" });
      if (!hasSchoolAccess(ss, caller, Number(target.school_id), cairoToday())) {
        return jsonResponse({ ok: false, error: "No access to this school" });
      }
      if (body.slot !== undefined) sh.getRange(target._row, 4).setValue(Number(body.slot));
      if (body.class_name !== undefined) sh.getRange(target._row, 5).setValue(String(body.class_name));
      if (body.topic !== undefined) sh.getRange(target._row, 6).setValue(String(body.topic));
      if (body.tutor_id !== undefined) sh.getRange(target._row, 7).setValue(body.tutor_id ? Number(body.tutor_id) : "");
      if (body.effective_from !== undefined) sh.getRange(target._row, 8).setValue(String(body.effective_from));
      if (body.effective_until !== undefined) sh.getRange(target._row, 9).setValue(String(body.effective_until));
      return jsonResponse({ ok: true });
    }

    if (action === "delete_template_session") {
      const sh = getOrCreateSheet(ss, "template_sessions", TABS.template_sessions);
      const rows = readTable(ss, "template_sessions");
      const target = rows.find(t => Number(t.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: true });
      if (!hasSchoolAccess(ss, caller, Number(target.school_id), cairoToday())) {
        return jsonResponse({ ok: false, error: "No access to this school" });
      }
      sh.deleteRow(target._row);
      return jsonResponse({ ok: true });
    }

    if (action === "copy_template_day") {
      const school_id = Number(body.school_id);
      const weekday = Number(body.weekday);
      if (!hasSchoolAccess(ss, caller, school_id, cairoToday())) {
        return jsonResponse({ ok: false, error: "No access to this school" });
      }
      const sh = getOrCreateSheet(ss, "template_sessions", TABS.template_sessions);
      let rows = readTable(ss, "template_sessions");
      const src = rows.filter(r => Number(r.school_id) === school_id && Number(r.weekday) === weekday);
      const toDelete = rows
        .filter(r => Number(r.school_id) === school_id && Number(r.weekday) !== weekday)
        .sort((a, b) => b._row - a._row);
      toDelete.forEach(r => sh.deleteRow(r._row));

      rows = readTable(ss, "template_sessions");
      let next = nextId(rows);
      for (let d = 0; d < 7; d++) {
        if (d === weekday) continue;
        src.forEach(s => {
          sh.appendRow([
            next++,
            school_id,
            d,
            Number(s.slot),
            s.class_name,
            s.topic,
            s.tutor_id || "",
            s.effective_from || "",
            s.effective_until || ""
          ]);
        });
      }
      const updated = readTable(ss, "template_sessions")
        .filter(ts => Number(ts.school_id) === school_id)
        .map(ts => ({
          id: Number(ts.id),
          school_id: Number(ts.school_id),
          weekday: Number(ts.weekday),
          slot: Number(ts.slot),
          class_name: ts.class_name,
          topic: ts.topic,
          tutor_id: ts.tutor_id === "" || ts.tutor_id === "0" ? null : Number(ts.tutor_id),
          effective_from: ts.effective_from || "",
          effective_until: ts.effective_until || ""
        }));
      return jsonResponse({ ok: true, data: updated });
    }

    if (action === "upsert_override") {
      const session_id = Number(body.session_id);
      const on_date = String(body.on_date);
      const tSessions = readTable(ss, "template_sessions");
      const sess = tSessions.find(t => Number(t.id) === session_id);
      if (!sess || !hasSchoolAccess(ss, caller, Number(sess.school_id), on_date)) {
        return jsonResponse({ ok: false, error: "No access to this school on this date" });
      }
      const sh = getOrCreateSheet(ss, "session_overrides", TABS.session_overrides);
      const rows = readTable(ss, "session_overrides");
      const existing = rows.find(o => Number(o.session_id) === session_id && o.on_date === on_date);

      if (existing) {
        if (body.tutor_overridden !== undefined) sh.getRange(existing._row, 3).setValue(body.tutor_overridden ? 1 : 0);
        if (body.tutor_id !== undefined) sh.getRange(existing._row, 4).setValue(body.tutor_id ? Number(body.tutor_id) : "");
        if (body.cancelled !== undefined) sh.getRange(existing._row, 5).setValue(body.cancelled ? 1 : 0);
      } else {
        sh.appendRow([
          session_id,
          on_date,
          body.tutor_overridden ? 1 : 0,
          body.tutor_id ? Number(body.tutor_id) : "",
          body.cancelled ? 1 : 0
        ]);
      }
      return jsonResponse({ ok: true });
    }

    if (action === "create_access_request") {
      const school_ids = (body.school_ids || []).map(Number).filter(Boolean);
      const from_date = String(body.from_date || "");
      const until_date = String(body.until_date || "");
      if (!school_ids.length) return jsonResponse({ ok: false, error: "Choose at least one school" });
      if (!from_date || !until_date || until_date < from_date) return jsonResponse({ ok: false, error: "Invalid dates" });

      const sh = getOrCreateSheet(ss, "access_requests", TABS.access_requests);
      const rows = readTable(ss, "access_requests");
      const id = nextId(rows);
      let requester_id, owner_id, status;
      if (caller.role === "admin") {
        requester_id = Number(body.requester_id);
        owner_id = "";
        status = "approved";
        sendAppNotification(
          ss,
          requester_id,
          "Admin assigned you temporary school coverage from " + from_date + " to " + until_date + ".",
          "Temporary School Coverage Assigned"
        );
      } else {
        requester_id = caller.id;
        owner_id = Number(body.owner_id);
        status = "pending";
        sendAppNotification(
          ss,
          owner_id,
          caller.name + " requested temporary access to your schools (" + from_date + " to " + until_date + ").",
          "New Temporary Access Request"
        );
        sendAppNotification(
          ss,
          0,
          caller.name + " requested temporary school access (" + from_date + " to " + until_date + ").",
          "New Temporary Access Request"
        );
      }
      sh.appendRow([id, requester_id, owner_id, from_date, until_date, status, JSON.stringify(school_ids), new Date().toISOString()]);
      return jsonResponse({
        ok: true,
        data: { id, requester_id, owner_id: owner_id === "" ? null : owner_id, from_date, until_date, status, school_ids }
      });
    }

    if (action === "set_access_request_status") {
      const sh = getOrCreateSheet(ss, "access_requests", TABS.access_requests);
      const rows = readTable(ss, "access_requests");
      const target = rows.find(r => Number(r.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Request not found" });
      if (caller.role !== "admin" && Number(target.owner_id) !== caller.id) {
        return jsonResponse({ ok: false, error: "Not allowed" });
      }
      sh.getRange(target._row, 6).setValue(String(body.status));
      sendAppNotification(
        ss,
        Number(target.requester_id),
        "Your temporary access request (" + target.from_date + " to " + target.until_date + ") was " + body.status + " by " + caller.name + ".",
        "Access Request " + body.status
      );
      return jsonResponse({ ok: true });
    }

    if (action === "set_report_answer") {
      const school_id = Number(body.school_id);
      const report_date = String(body.report_date);
      const field_id = String(body.field_id);
      const value = String(body.value ?? "");
      if (!hasSchoolAccess(ss, caller, school_id, report_date)) {
        return jsonResponse({ ok: false, error: "No access to this school" });
      }
      const sh = getOrCreateSheet(ss, "school_reports", TABS.school_reports);
      const rows = readTable(ss, "school_reports");
      const existing = rows.find(r => Number(r.school_id) === school_id && r.report_date === report_date);
      if (existing) {
        let ans = {};
        try {
          ans = JSON.parse(existing.answers_json || "{}");
        } catch (err) {}
        ans[field_id] = value;
        sh.getRange(existing._row, 4).setValue(JSON.stringify(ans));
        sh.getRange(existing._row, 5).setValue(new Date().toISOString());
      } else {
        const schools = readTable(ss, "schools");
        const sch = schools.find(s => Number(s.id) === school_id);
        const author_id = caller.role === "admin" && sch ? Number(sch.owner_id) : caller.id;
        const ans = { [field_id]: value };
        sh.appendRow([school_id, report_date, author_id, JSON.stringify(ans), new Date().toISOString()]);
      }
      return jsonResponse({ ok: true });
    }

    if (action === "upsert_daily_summary") {
      const member_id = Number(body.member_id || caller.id);
      if (caller.role !== "admin" && member_id !== caller.id) {
        return jsonResponse({ ok: false, error: "Not allowed" });
      }
      const report_date = String(body.report_date);
      const sh = getOrCreateSheet(ss, "daily_summaries", TABS.daily_summaries);
      const rows = readTable(ss, "daily_summaries");
      const existing = rows.find(d => Number(d.member_id) === member_id && d.report_date === report_date);
      if (existing) {
        if (body.note !== undefined) sh.getRange(existing._row, 3).setValue(String(body.note));
        if (body.submit) sh.getRange(existing._row, 4).setValue(new Date().toISOString());
      } else {
        sh.appendRow([member_id, report_date, String(body.note ?? ""), body.submit ? new Date().toISOString() : ""]);
      }
      if (body.submit) {
        sendAppNotification(
          ss,
          0,
          caller.name + " submitted their daily report for " + report_date + ".",
          "Daily Report Submitted — " + caller.name
        );
      }
      return jsonResponse({ ok: true });
    }

    if (action === "add_report_field") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "report_fields", TABS.report_fields);
      const rows = readTable(ss, "report_fields");
      const id = nextId(rows);
      const sort_order = rows.reduce((m, r) => Math.max(m, Number(r.sort_order) || 0), 0) + 1;
      sh.appendRow([id, "New question", "text", "", sort_order]);
      return jsonResponse({ ok: true, data: { id, label: "New question", field_type: "text", options: "", sort_order } });
    }

    if (action === "update_report_field") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "report_fields", TABS.report_fields);
      const rows = readTable(ss, "report_fields");
      const target = rows.find(f => Number(f.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Field not found" });
      if (body.label !== undefined) sh.getRange(target._row, 2).setValue(String(body.label));
      if (body.field_type !== undefined) sh.getRange(target._row, 3).setValue(String(body.field_type));
      if (body.options !== undefined) sh.getRange(target._row, 4).setValue(String(body.options));
      return jsonResponse({ ok: true });
    }

    if (action === "delete_report_field") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "report_fields", TABS.report_fields);
      const rows = readTable(ss, "report_fields");
      const target = rows.find(f => Number(f.id) === Number(body.id));
      if (target) sh.deleteRow(target._row);
      return jsonResponse({ ok: true });
    }

    if (action === "move_report_field") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "report_fields", TABS.report_fields);
      const rows = readTable(ss, "report_fields").sort((a, b) => Number(a.sort_order) - Number(b.sort_order) || Number(a.id) - Number(b.id));
      const idx = rows.findIndex(f => Number(f.id) === Number(body.id));
      const otherIdx = Number(body.dir) < 0 ? idx - 1 : idx + 1;
      if (idx >= 0 && otherIdx >= 0 && otherIdx < rows.length) {
        const a = rows[idx],
          b = rows[otherIdx];
        sh.getRange(a._row, 5).setValue(otherIdx + 1);
        sh.getRange(b._row, 5).setValue(idx + 1);
      }
      return jsonResponse({ ok: true });
    }

    if (action === "create_master_request") {
      const from_date = String(body.from_date);
      const to_date = String(body.to_date);
      if (!from_date || !to_date || to_date < from_date) return jsonResponse({ ok: false, error: "Invalid dates" });
      const sh = getOrCreateSheet(ss, "master_report_requests", TABS.master_report_requests);
      const rows = readTable(ss, "master_report_requests");
      const id = nextId(rows);
      const ap = {};
      members
        .filter(m => m.role === "mentor" && Number(m.active) === 1 && Number(m.id) !== caller.id)
        .forEach(m => {
          ap[Number(m.id)] = "pending";
          sendAppNotification(
            ss,
            Number(m.id),
            caller.name + " requested Master Report approval (" + from_date + " to " + to_date + ").",
            "Master Report Request"
          );
        });
      sendAppNotification(ss, 0, caller.name + " requested Master Report access (" + from_date + " to " + to_date + ").", "Master Report Request");
      sh.appendRow([id, caller.id, from_date, to_date, "", JSON.stringify(ap), new Date().toISOString()]);
      return jsonResponse({ ok: true, data: { id, requester_id: caller.id, from_date, to_date, admin_decision: null, approvals: ap } });
    }

    if (action === "decide_master_request") {
      const sh = getOrCreateSheet(ss, "master_report_requests", TABS.master_report_requests);
      const rows = readTable(ss, "master_report_requests");
      const target = rows.find(r => Number(r.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Request not found" });

      if (body.as_admin) {
        if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
        sh.getRange(target._row, 5).setValue(String(body.status));
      } else {
        let ap = {};
        try {
          ap = JSON.parse(target.approvals_json || "{}");
        } catch (err) {}
        if (ap[caller.id] !== "pending") return jsonResponse({ ok: false, error: "Not allowed" });
        ap[caller.id] = String(body.status);
        sh.getRange(target._row, 6).setValue(JSON.stringify(ap));
      }
      sendAppNotification(
        ss,
        Number(target.requester_id),
        caller.name + " " + body.status + " your Master Report request (" + target.from_date + " to " + target.to_date + ").",
        "Master Report Update"
      );
      return jsonResponse({ ok: true });
    }

    if (action === "get_master_report") {
      const from_date = String(body.from_date);
      const to_date = String(body.to_date);
      if (caller.role !== "admin") {
        const mreqs = readTable(ss, "master_report_requests");
        const allowed = mreqs.some(
          q =>
            Number(q.requester_id) === caller.id &&
            q.from_date <= from_date &&
            q.to_date >= to_date &&
            masterRequestStatus(q) === "approved"
        );
        if (!allowed) return jsonResponse({ ok: false, error: "The master report is not approved for this range" });
      }
      const schoolsMap = {};
      readTable(ss, "schools").forEach(s => (schoolsMap[Number(s.id)] = s.name));
      const membersMap = {};
      members.forEach(m => (membersMap[Number(m.id)] = m.name));

      const out = [];
      readTable(ss, "school_reports")
        .filter(sr => sr.report_date >= from_date && sr.report_date <= to_date)
        .forEach(sr => {
          let ans = {};
          try {
            ans = JSON.parse(sr.answers_json || "{}");
          } catch (err) {}
          out.push({
            report_date: sr.report_date,
            mentor_id: Number(sr.author_id),
            mentor_name: membersMap[Number(sr.author_id)] || "?",
            school_id: Number(sr.school_id),
            school_name: schoolsMap[Number(sr.school_id)] || "?",
            answers: ans,
            note: null
          });
        });

      readTable(ss, "daily_summaries")
        .filter(ds => ds.report_date >= from_date && ds.report_date <= to_date && String(ds.note || "").trim() !== "")
        .forEach(ds => {
          out.push({
            report_date: ds.report_date,
            mentor_id: Number(ds.member_id),
            mentor_name: membersMap[Number(ds.member_id)] || "?",
            school_id: null,
            school_name: "Daily summary",
            answers: null,
            note: ds.note
          });
        });

      out.sort((a, b) => a.report_date.localeCompare(b.report_date) || a.mentor_name.localeCompare(b.mentor_name));
      return jsonResponse({ ok: true, data: out });
    }

    if (action === "full_backup") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const backup = { exported_at: new Date().toISOString() };
      Object.keys(TABS).forEach(t => (backup[t] = readTable(ss, t)));
      return jsonResponse({ ok: true, data: backup });
    }

    return jsonResponse({ ok: false, error: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}
