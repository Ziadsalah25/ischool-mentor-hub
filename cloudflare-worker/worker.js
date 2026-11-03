/**
 * =====================================================================
 * iSchool Mentor Hub — Full-Stack Cloudflare Worker + D1 + Google Sheets
 * =====================================================================
 * Modes supported automatically:
 * 1. If `GOOGLE_SCRIPT_URL` is set -> Proxies to Google Sheets Web App.
 * 2. If `DB` (Cloudflare D1) is bound -> Runs full relational SQLite DB.
 * 3. Serves `public/` static frontend assets directly if deployed on Cloudflare.
 * =====================================================================
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}

function cairoToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
}

async function verifyGoogleToken(idToken, env) {
  if (!idToken) return null;
  // Support demo/dev token when testing before Google OAuth client is set
  if (idToken.startsWith("dev:")) {
    const [, email, name, role] = idToken.split(":");
    return { email: (email || "admin@ischool.com").toLowerCase(), name: name || "Admin", sub: "dev-" + email, role: role || "admin" };
  }
  const res = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken));
  if (!res.ok) return null;
  const payload = await res.json();
  if (!payload || !payload.email || payload.email_verified === "false") return null;
  if (env.GOOGLE_CLIENT_ID && payload.aud && payload.aud !== env.GOOGLE_CLIENT_ID) {
    return null;
  }
  return {
    email: String(payload.email).toLowerCase().trim(),
    name: payload.name || payload.email,
    sub: payload.sub || ""
  };
}

async function ensureD1Schema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'mentor',
      active INTEGER NOT NULL DEFAULT 1,
      google_sub TEXT UNIQUE,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS tutors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_id INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS template_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      weekday INTEGER NOT NULL,
      slot INTEGER NOT NULL,
      class_name TEXT NOT NULL DEFAULT '',
      topic TEXT NOT NULL DEFAULT '',
      tutor_id INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS session_overrides (
      session_id INTEGER NOT NULL,
      on_date TEXT NOT NULL,
      tutor_overridden INTEGER NOT NULL DEFAULT 0,
      tutor_id INTEGER,
      cancelled INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (session_id, on_date)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS access_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL,
      owner_id INTEGER,
      from_date TEXT NOT NULL,
      until_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      schools_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS report_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      field_type TEXT NOT NULL,
      options TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS school_reports (
      school_id INTEGER NOT NULL,
      report_date TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      answers_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (school_id, report_date)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS daily_summaries (
      member_id INTEGER NOT NULL,
      report_date TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      submitted_at TEXT,
      PRIMARY KEY (member_id, report_date)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS master_report_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL,
      from_date TEXT NOT NULL,
      to_date TEXT NOT NULL,
      admin_decision TEXT,
      approvals_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
  ]);

  const rfCount = await db.prepare("SELECT COUNT(*) as c FROM report_fields").first();
  if (!rfCount || rfCount.c === 0) {
    await db.batch([
      db.prepare("INSERT INTO report_fields (id, label, field_type, options, sort_order) VALUES (1, 'Sessions delivered', 'number', '', 1)"),
      db.prepare("INSERT INTO report_fields (id, label, field_type, options, sort_order) VALUES (2, 'Students present', 'number', '', 2)"),
      db.prepare("INSERT INTO report_fields (id, label, field_type, options, sort_order) VALUES (3, 'Topics covered', 'long', '', 3)"),
      db.prepare("INSERT INTO report_fields (id, label, field_type, options, sort_order) VALUES (4, 'All tutors on time?', 'yesno', '', 4)"),
      db.prepare("INSERT INTO report_fields (id, label, field_type, options, sort_order) VALUES (5, 'Problems or issues', 'long', '', 5)"),
      db.prepare("INSERT INTO report_fields (id, label, field_type, options, sort_order) VALUES (6, 'Overall day rating', 'choice', 'Excellent,Good,Fair,Poor', 6)"),
      db.prepare("INSERT INTO report_fields (id, label, field_type, options, sort_order) VALUES (7, 'Follow-up needed', 'long', '', 7)")
    ]);
  }
}

async function hasSchoolAccessD1(db, caller, schoolId, onDate) {
  if (caller.role === "admin") return true;
  const sch = await db.prepare("SELECT owner_id FROM schools WHERE id = ?").bind(schoolId).first();
  if (sch && Number(sch.owner_id) === caller.id) return true;
  const reqs = await db
    .prepare("SELECT schools_json FROM access_requests WHERE requester_id = ? AND status = 'approved' AND from_date <= ? AND until_date >= ?")
    .bind(caller.id, onDate, onDate)
    .all();
  return (reqs.results || []).some(r => {
    try {
      return JSON.parse(r.schools_json || "[]").map(Number).includes(Number(schoolId));
    } catch (e) {
      return false;
    }
  });
}

async function handleD1Api(body, env) {
  const db = env.DB;
  await ensureD1Schema(db);
  const action = body.action;

  if (action === "ping") {
    return jsonResponse({ ok: true, now: new Date().toISOString() });
  }

  const authUser = await verifyGoogleToken(body.idToken, env);
  if (!authUser) {
    return jsonResponse({ ok: false, code: "UNAUTHENTICATED", error: "Invalid or expired Google token." });
  }

  const memCount = await db.prepare("SELECT COUNT(*) as c FROM members").first();
  if (!memCount || memCount.c === 0) {
    await db
      .prepare("INSERT INTO members (email, name, role, active, google_sub, last_login_at) VALUES (?, ?, 'admin', 1, ?, datetime('now'))")
      .bind(authUser.email, authUser.name || "Admin", authUser.sub)
      .run();
  }

  const callerRow = await db.prepare("SELECT * FROM members WHERE lower(email) = ? AND active = 1").bind(authUser.email).first();
  if (!callerRow) {
    return jsonResponse({
      ok: false,
      code: "NOT_AUTHORIZED",
      email: authUser.email,
      error: "Account not in active members allowlist."
    });
  }

  if (!callerRow.google_sub || action === "claim_membership") {
    await db
      .prepare("UPDATE members SET google_sub = ?, last_login_at = datetime('now') WHERE id = ?")
      .bind(authUser.sub, callerRow.id)
      .run();
    callerRow.google_sub = authUser.sub;
  }

  const caller = {
    id: Number(callerRow.id),
    email: callerRow.email,
    name: callerRow.name,
    role: callerRow.role,
    active: Boolean(callerRow.active),
    auth_user_id: callerRow.google_sub || null
  };

  if (action === "claim_membership") {
    return jsonResponse({ ok: true, data: caller });
  }

  if (action === "load_bootstrap") {
    const [mRes, tRes, sRes, tsRes, rfRes, arRes, mrRes] = await Promise.all([
      db.prepare("SELECT * FROM members ORDER BY id").all(),
      db.prepare("SELECT * FROM tutors ORDER BY id").all(),
      db.prepare("SELECT * FROM schools ORDER BY id").all(),
      db.prepare("SELECT * FROM template_sessions ORDER BY id").all(),
      db.prepare("SELECT * FROM report_fields ORDER BY sort_order, id").all(),
      db.prepare("SELECT * FROM access_requests ORDER BY id").all(),
      db.prepare("SELECT * FROM master_report_requests ORDER BY id").all()
    ]);

    return jsonResponse({
      ok: true,
      data: {
        me: caller,
        members: (mRes.results || []).map(m => ({
          id: Number(m.id),
          email: m.email,
          name: m.name,
          role: m.role,
          active: Boolean(m.active),
          auth_user_id: m.google_sub || null
        })),
        tutors: (tRes.results || []).map(t => ({ id: Number(t.id), name: t.name, archived: Boolean(t.archived) })),
        schools: (sRes.results || []).map(s => ({ id: Number(s.id), name: s.name, owner_id: Number(s.owner_id) })),
        template_sessions: (tsRes.results || []).map(ts => ({
          id: Number(ts.id),
          school_id: Number(ts.school_id),
          weekday: Number(ts.weekday),
          slot: Number(ts.slot),
          class_name: ts.class_name,
          topic: ts.topic,
          tutor_id: ts.tutor_id ? Number(ts.tutor_id) : null
        })),
        report_fields: (rfRes.results || []).map(rf => ({
          id: Number(rf.id),
          label: rf.label,
          field_type: rf.field_type,
          options: rf.options || "",
          sort_order: Number(rf.sort_order)
        })),
        access_requests: (arRes.results || [])
          .map(r => ({
            id: Number(r.id),
            requester_id: Number(r.requester_id),
            owner_id: r.owner_id ? Number(r.owner_id) : null,
            from_date: r.from_date,
            until_date: r.until_date,
            status: r.status,
            school_ids: JSON.parse(r.schools_json || "[]").map(Number)
          }))
          .filter(r => caller.role === "admin" || r.requester_id === caller.id || r.owner_id === caller.id),
        master_report_requests: (mrRes.results || [])
          .map(mr => ({
            id: Number(mr.id),
            requester_id: Number(mr.requester_id),
            from_date: mr.from_date,
            to_date: mr.to_date,
            admin_decision: mr.admin_decision || null,
            approvals: JSON.parse(mr.approvals_json || "{}")
          }))
          .filter(mr => caller.role === "admin" || mr.requester_id === caller.id || mr.approvals[caller.id] !== undefined)
      }
    });
  }

  if (action === "load_day") {
    const date = String(body.date || cairoToday());
    const [ovRes, srRes, dsRes] = await Promise.all([
      db.prepare("SELECT * FROM session_overrides WHERE on_date = ?").bind(date).all(),
      db.prepare("SELECT * FROM school_reports WHERE report_date = ?").bind(date).all(),
      db.prepare("SELECT * FROM daily_summaries WHERE report_date = ?").bind(date).all()
    ]);

    const reports = [];
    for (const sr of srRes.results || []) {
      if (await hasSchoolAccessD1(db, caller, Number(sr.school_id), date)) {
        reports.push({
          school_id: Number(sr.school_id),
          report_date: sr.report_date,
          author_id: Number(sr.author_id),
          answers: JSON.parse(sr.answers_json || "{}")
        });
      }
    }

    return jsonResponse({
      ok: true,
      data: {
        date,
        overrides: (ovRes.results || []).map(o => ({
          session_id: Number(o.session_id),
          on_date: o.on_date,
          tutor_overridden: Boolean(o.tutor_overridden),
          tutor_id: o.tutor_id ? Number(o.tutor_id) : null,
          cancelled: Boolean(o.cancelled)
        })),
        reports,
        summaries: (dsRes.results || [])
          .filter(ds => caller.role === "admin" || Number(ds.member_id) === caller.id)
          .map(ds => ({
            member_id: Number(ds.member_id),
            report_date: ds.report_date,
            note: ds.note || "",
            submitted_at: ds.submitted_at || null
          }))
      }
    });
  }

  if (action === "add_member") {
    if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
    const email = String(body.email || "").toLowerCase().trim();
    const name = String(body.name || "").trim();
    const role = body.role === "admin" ? "admin" : "mentor";
    const info = await db.prepare("INSERT INTO members (email, name, role, active) VALUES (?, ?, ?, 1)").bind(email, name, role).run();
    return jsonResponse({ ok: true, data: { id: Number(info.meta.last_row_id), email, name, role, active: true, auth_user_id: null } });
  }

  if (action === "update_member") {
    if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
    const target = await db.prepare("SELECT * FROM members WHERE id = ?").bind(Number(body.id)).first();
    if (!target) return jsonResponse({ ok: false, error: "Not found" });
    const newRole = body.role !== undefined ? body.role : target.role;
    const newActive = body.active !== undefined ? (body.active ? 1 : 0) : Number(target.active);
    if (target.role === "admin" && Number(target.active) === 1 && (newRole !== "admin" || newActive === 0)) {
      const c = await db.prepare("SELECT COUNT(*) as c FROM members WHERE role = 'admin' AND active = 1 AND id != ?").bind(target.id).first();
      if (!c || c.c === 0) return jsonResponse({ ok: false, error: "Cannot remove the last active admin" });
    }
    await db.prepare("UPDATE members SET role = ?, active = ? WHERE id = ?").bind(newRole, newActive, target.id).run();
    return jsonResponse({ ok: true });
  }

  if (action === "add_tutor") {
    if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
    const name = String(body.name || "").trim();
    const info = await db.prepare("INSERT INTO tutors (name, archived) VALUES (?, 0)").bind(name).run();
    return jsonResponse({ ok: true, data: { id: Number(info.meta.last_row_id), name, archived: false } });
  }

  if (action === "toggle_tutor") {
    if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
    await db.prepare("UPDATE tutors SET archived = CASE WHEN archived = 1 THEN 0 ELSE 1 END WHERE id = ?").bind(Number(body.id)).run();
    return jsonResponse({ ok: true });
  }

  if (action === "add_school") {
    if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
    const name = String(body.name || "").trim();
    const owner_id = Number(body.owner_id);
    const info = await db.prepare("INSERT INTO schools (name, owner_id) VALUES (?, ?)").bind(name, owner_id).run();
    return jsonResponse({ ok: true, data: { id: Number(info.meta.last_row_id), name, owner_id } });
  }

  if (action === "update_school_owner") {
    if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
    await db.prepare("UPDATE schools SET owner_id = ? WHERE id = ?").bind(Number(body.owner_id), Number(body.id)).run();
    return jsonResponse({ ok: true });
  }

  if (action === "add_template_session") {
    const school_id = Number(body.school_id);
    if (!(await hasSchoolAccessD1(db, caller, school_id, cairoToday()))) return jsonResponse({ ok: false, error: "No access" });
    const weekday = Number(body.weekday) || 0,
      slot = Number(body.slot) || 0,
      class_name = String(body.class_name ?? "Grade 4"),
      topic = String(body.topic ?? "New topic"),
      tutor_id = body.tutor_id ? Number(body.tutor_id) : null;
    const info = await db
      .prepare("INSERT INTO template_sessions (school_id, weekday, slot, class_name, topic, tutor_id) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(school_id, weekday, slot, class_name, topic, tutor_id)
      .run();
    return jsonResponse({ ok: true, data: { id: Number(info.meta.last_row_id), school_id, weekday, slot, class_name, topic, tutor_id } });
  }

  if (action === "update_template_session") {
    const target = await db.prepare("SELECT * FROM template_sessions WHERE id = ?").bind(Number(body.id)).first();
    if (!target || !(await hasSchoolAccessD1(db, caller, Number(target.school_id), cairoToday())))
      return jsonResponse({ ok: false, error: "No access" });
    await db
      .prepare("UPDATE template_sessions SET slot = ?, class_name = ?, topic = ?, tutor_id = ? WHERE id = ?")
      .bind(Number(body.slot), String(body.class_name), String(body.topic), body.tutor_id ? Number(body.tutor_id) : null, Number(body.id))
      .run();
    return jsonResponse({ ok: true });
  }

  if (action === "delete_template_session") {
    const target = await db.prepare("SELECT * FROM template_sessions WHERE id = ?").bind(Number(body.id)).first();
    if (target && (await hasSchoolAccessD1(db, caller, Number(target.school_id), cairoToday()))) {
      await db.prepare("DELETE FROM template_sessions WHERE id = ?").bind(Number(body.id)).run();
    }
    return jsonResponse({ ok: true });
  }

  if (action === "copy_template_day") {
    const school_id = Number(body.school_id),
      weekday = Number(body.weekday);
    if (!(await hasSchoolAccessD1(db, caller, school_id, cairoToday()))) return jsonResponse({ ok: false, error: "No access" });
    const src = await db.prepare("SELECT * FROM template_sessions WHERE school_id = ? AND weekday = ?").bind(school_id, weekday).all();
    await db.prepare("DELETE FROM template_sessions WHERE school_id = ? AND weekday != ?").bind(school_id, weekday).run();
    const stmts = [];
    for (let d = 0; d < 7; d++) {
      if (d === weekday) continue;
      for (const s of src.results || []) {
        stmts.push(
          db
            .prepare("INSERT INTO template_sessions (school_id, weekday, slot, class_name, topic, tutor_id) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(school_id, d, s.slot, s.class_name, s.topic, s.tutor_id)
        );
      }
    }
    if (stmts.length) await db.batch(stmts);
    return jsonResponse({ ok: true });
  }

  if (action === "upsert_override") {
    const session_id = Number(body.session_id),
      on_date = String(body.on_date);
    const ex = await db.prepare("SELECT * FROM session_overrides WHERE session_id = ? AND on_date = ?").bind(session_id, on_date).first();
    const tutor_overridden = body.tutor_overridden !== undefined ? (body.tutor_overridden ? 1 : 0) : ex ? ex.tutor_overridden : 0;
    const tutor_id = body.tutor_id !== undefined ? (body.tutor_id ? Number(body.tutor_id) : null) : ex ? ex.tutor_id : null;
    const cancelled = body.cancelled !== undefined ? (body.cancelled ? 1 : 0) : ex ? ex.cancelled : 0;
    await db
      .prepare(
        "INSERT INTO session_overrides (session_id, on_date, tutor_overridden, tutor_id, cancelled) VALUES (?, ?, ?, ?, ?) ON CONFLICT(session_id, on_date) DO UPDATE SET tutor_overridden = excluded.tutor_overridden, tutor_id = excluded.tutor_id, cancelled = excluded.cancelled"
      )
      .bind(session_id, on_date, tutor_overridden, tutor_id, cancelled)
      .run();
    return jsonResponse({ ok: true });
  }

  if (action === "create_access_request") {
    const school_ids = (body.school_ids || []).map(Number),
      from_date = String(body.from_date),
      until_date = String(body.until_date);
    const requester_id = caller.role === "admin" ? Number(body.requester_id) : caller.id;
    const owner_id = caller.role === "admin" ? null : Number(body.owner_id);
    const status = caller.role === "admin" ? "approved" : "pending";
    const info = await db
      .prepare("INSERT INTO access_requests (requester_id, owner_id, from_date, until_date, status, schools_json) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(requester_id, owner_id, from_date, until_date, status, JSON.stringify(school_ids))
      .run();
    return jsonResponse({
      ok: true,
      data: { id: Number(info.meta.last_row_id), requester_id, owner_id, from_date, until_date, status, school_ids }
    });
  }

  if (action === "set_access_request_status") {
    await db.prepare("UPDATE access_requests SET status = ? WHERE id = ?").bind(String(body.status), Number(body.id)).run();
    return jsonResponse({ ok: true });
  }

  if (action === "set_report_answer") {
    const school_id = Number(body.school_id),
      report_date = String(body.report_date),
      field_id = String(body.field_id),
      value = String(body.value ?? "");
    const ex = await db.prepare("SELECT * FROM school_reports WHERE school_id = ? AND report_date = ?").bind(school_id, report_date).first();
    if (ex) {
      const ans = JSON.parse(ex.answers_json || "{}");
      ans[field_id] = value;
      await db
        .prepare("UPDATE school_reports SET answers_json = ?, updated_at = datetime('now') WHERE school_id = ? AND report_date = ?")
        .bind(JSON.stringify(ans), school_id, report_date)
        .run();
    } else {
      const sch = await db.prepare("SELECT owner_id FROM schools WHERE id = ?").bind(school_id).first();
      const author_id = caller.role === "admin" && sch ? Number(sch.owner_id) : caller.id;
      await db
        .prepare("INSERT INTO school_reports (school_id, report_date, author_id, answers_json) VALUES (?, ?, ?, ?)")
        .bind(school_id, report_date, author_id, JSON.stringify({ [field_id]: value }))
        .run();
    }
    return jsonResponse({ ok: true });
  }

  if (action === "upsert_daily_summary") {
    const member_id = Number(body.member_id || caller.id),
      report_date = String(body.report_date);
    const ex = await db.prepare("SELECT * FROM daily_summaries WHERE member_id = ? AND report_date = ?").bind(member_id, report_date).first();
    const note = body.note !== undefined ? String(body.note) : ex ? ex.note : "";
    const sub = body.submit ? new Date().toISOString() : ex ? ex.submitted_at : null;
    await db
      .prepare(
        "INSERT INTO daily_summaries (member_id, report_date, note, submitted_at) VALUES (?, ?, ?, ?) ON CONFLICT(member_id, report_date) DO UPDATE SET note = excluded.note, submitted_at = excluded.submitted_at"
      )
      .bind(member_id, report_date, note, sub)
      .run();
    return jsonResponse({ ok: true });
  }

  if (action === "add_report_field") {
    const info = await db
      .prepare("INSERT INTO report_fields (label, field_type, options, sort_order) VALUES ('New question', 'text', '', 99)")
      .run();
    return jsonResponse({
      ok: true,
      data: { id: Number(info.meta.last_row_id), label: "New question", field_type: "text", options: "", sort_order: 99 }
    });
  }

  if (action === "update_report_field") {
    await db
      .prepare("UPDATE report_fields SET label = ?, field_type = ?, options = ? WHERE id = ?")
      .bind(String(body.label), String(body.field_type), String(body.options || ""), Number(body.id))
      .run();
    return jsonResponse({ ok: true });
  }

  if (action === "delete_report_field") {
    await db.prepare("DELETE FROM report_fields WHERE id = ?").bind(Number(body.id)).run();
    return jsonResponse({ ok: true });
  }

  if (action === "move_report_field") {
    const rows = (await db.prepare("SELECT * FROM report_fields ORDER BY sort_order, id").all()).results || [];
    const idx = rows.findIndex(f => Number(f.id) === Number(body.id));
    const otherIdx = Number(body.dir) < 0 ? idx - 1 : idx + 1;
    if (idx >= 0 && otherIdx >= 0 && otherIdx < rows.length) {
      await db.batch([
        db.prepare("UPDATE report_fields SET sort_order = ? WHERE id = ?").bind(otherIdx + 1, rows[idx].id),
        db.prepare("UPDATE report_fields SET sort_order = ? WHERE id = ?").bind(idx + 1, rows[otherIdx].id)
      ]);
    }
    return jsonResponse({ ok: true });
  }

  if (action === "create_master_request") {
    const from_date = String(body.from_date),
      to_date = String(body.to_date);
    const ms = (await db.prepare("SELECT id FROM members WHERE role = 'mentor' AND active = 1 AND id != ?").bind(caller.id).all()).results || [];
    const ap = {};
    ms.forEach(m => (ap[Number(m.id)] = "pending"));
    const info = await db
      .prepare("INSERT INTO master_report_requests (requester_id, from_date, to_date, approvals_json) VALUES (?, ?, ?, ?)")
      .bind(caller.id, from_date, to_date, JSON.stringify(ap))
      .run();
    return jsonResponse({
      ok: true,
      data: { id: Number(info.meta.last_row_id), requester_id: caller.id, from_date, to_date, admin_decision: null, approvals: ap }
    });
  }

  if (action === "decide_master_request") {
    const target = await db.prepare("SELECT * FROM master_report_requests WHERE id = ?").bind(Number(body.id)).first();
    if (!target) return jsonResponse({ ok: false, error: "Not found" });
    if (body.as_admin) {
      await db.prepare("UPDATE master_report_requests SET admin_decision = ? WHERE id = ?").bind(String(body.status), target.id).run();
    } else {
      const ap = JSON.parse(target.approvals_json || "{}");
      ap[caller.id] = String(body.status);
      await db.prepare("UPDATE master_report_requests SET approvals_json = ? WHERE id = ?").bind(JSON.stringify(ap), target.id).run();
    }
    return jsonResponse({ ok: true });
  }

  if (action === "full_backup") {
    if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
    const tables = [
      "members",
      "tutors",
      "schools",
      "template_sessions",
      "session_overrides",
      "access_requests",
      "report_fields",
      "school_reports",
      "daily_summaries",
      "master_report_requests"
    ];
    const backup = { exported_at: new Date().toISOString() };
    for (const t of tables) {
      backup[t] = (await db.prepare(`SELECT * FROM ${t}`).all()).results || [];
    }
    return jsonResponse({ ok: true, data: backup });
  }

  return jsonResponse({ ok: false, error: "Unknown action: " + action });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // API calls (POST or /api)
    if (request.method === "POST" || url.pathname.startsWith("/api")) {
      try {
        // 1. If Google Sheets Web App URL is configured, proxy to Google Sheets
        if (env.GOOGLE_SCRIPT_URL) {
          const bodyText = request.method === "POST" ? await request.text() : "";
          const res = await fetch(env.GOOGLE_SCRIPT_URL, {
            method: request.method,
            headers: request.method === "POST" ? { "Content-Type": "text/plain;charset=utf-8" } : {},
            body: request.method === "POST" ? bodyText : undefined,
            redirect: "follow"
          });
          const text = await res.text();
          return new Response(text, { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
        }

        // 2. If Cloudflare D1 is bound, execute against D1 SQLite database
        if (env.DB) {
          if (request.method === "GET") {
            return jsonResponse({ ok: true, service: "iSchool Mentor Hub Cloudflare D1 API", today: cairoToday() });
          }
          const body = await request.json();
          return await handleD1Api(body, env);
        }

        return jsonResponse({
          ok: false,
          error: "Neither GOOGLE_SCRIPT_URL nor D1 database (DB) is bound on this Worker."
        }, 500);
      } catch (err) {
        return jsonResponse({ ok: false, error: String(err.message || err) }, 500);
      }
    }

    // Serve static frontend assets if ASSETS binding exists
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return jsonResponse({ ok: true, service: "iSchool Mentor Hub API Gateway", today: cairoToday() });
  }
};
