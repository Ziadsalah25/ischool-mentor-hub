import { BACKEND_URL, isCloudConfigured } from "./config.js";
import { S, E7 } from "./state.js";

const TOKEN_KEY = "mh-google-id-token";

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch (e) {
    return "";
  }
}

export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (e) {}
}

export async function callApi(action, payload = {}) {
  if (!isCloudConfigured()) {
    throw new Error("Backend URL is not configured yet.");
  }
  const idToken = getAuthToken();
  const res = await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, idToken, ...payload })
  });
  const json = await res.json();
  if (!json.ok) {
    const err = new Error(json.error || "Request failed");
    err.code = json.code;
    err.email = json.email;
    throw err;
  }
  return json.data;
}

/**
 * Maps server bootstrap rows (from Google Sheets / Cloudflare) into the prototype's in-memory `S` shape
 */
export function applyBootstrapToState(data) {
  S.users = (data.members || []).map(m => ({
    id: Number(m.id),
    u: m.email,
    email: m.email,
    n: m.name,
    role: m.role,
    on: m.active ? 1 : 0,
    auth_user_id: m.auth_user_id || null
  }));

  S.tutors = (data.tutors || []).map(t => ({
    id: Number(t.id),
    n: t.name,
    ar: t.archived ? 1 : 0
  }));

  S.schools = (data.schools || []).map(s => ({
    id: Number(s.id),
    n: s.name,
    own: Number(s.owner_id)
  }));

  S.tpl = {};
  S.schools.forEach(k => (S.tpl[k.id] = E7()));
  (data.template_sessions || []).forEach(ts => {
    const sid = Number(ts.school_id),
      w = Number(ts.weekday);
    if (!S.tpl[sid]) S.tpl[sid] = E7();
    S.tpl[sid][w].push({
      id: Number(ts.id),
      t: Number(ts.slot),
      cls: ts.class_name || "",
      tu: ts.tutor_id ? Number(ts.tutor_id) : 0,
      tp: ts.topic || "",
      ef: ts.effective_from || "",
      eu: ts.effective_until || ""
    });
  });

  if (data.report_fields && data.report_fields.length) {
    S.rtpl = data.report_fields.map(rf => ({
      id: Number(rf.id),
      l: rf.label,
      t: rf.field_type,
      o: rf.options || ""
    }));
  }

  S.reqs = (data.access_requests || []).map(r => ({
    id: Number(r.id),
    by: Number(r.requester_id),
    to: r.owner_id ? Number(r.owner_id) : 0,
    sch: (r.school_ids || []).map(Number),
    from: r.from_date,
    until: r.until_date,
    st: r.status
  }));

  S.mreqs = (data.master_report_requests || []).map(mr => ({
    id: Number(mr.id),
    by: Number(mr.requester_id),
    from: mr.from_date,
    to: mr.to_date,
    adm: mr.admin_decision || null,
    ap: mr.approvals || {}
  }));

  if (data.notifications) {
    S.notifs = data.notifications.map(n => ({
      id: Number(n.id),
      to: Number(n.recipient_id),
      txt: n.message,
      dt: n.created_at,
      rd: n.is_read ? 1 : 0
    }));
  }
}

/**
 * Maps day-specific rows (overrides, reports, daily summaries) into `S`
 */
export function applyDayToState(date, data) {
  Object.keys(S.over).forEach(k => {
    if (k.startsWith(date + "|")) delete S.over[k];
  });

  const sessionSchoolMap = {};
  Object.keys(S.tpl).forEach(sid => {
    for (let d = 0; d < 7; d++) {
      (S.tpl[sid][d] || []).forEach(e => (sessionSchoolMap[e.id] = sid));
    }
  });

  (data.overrides || []).forEach(o => {
    const sid = sessionSchoolMap[o.session_id];
    if (!sid) return;
    const key = date + "|" + sid + "|" + o.session_id;
    const entry = { x: !!o.cancelled };
    if (o.tutor_overridden) {
      entry.tu = o.tutor_id ? Number(o.tutor_id) : 0;
    }
    S.over[key] = entry;
  });

  (data.reports || []).forEach(r => {
    const key = date + "|" + r.school_id;
    S.reps[key] = {
      by: Number(r.author_id),
      v: r.answers || {}
    };
  });

  (data.summaries || []).forEach(ds => {
    const key = date + "|" + ds.member_id;
    S.mnote[key] = ds.note || "";
    if (ds.submitted_at) S.msub[key] = true;
  });
}

export async function loadBootstrap() {
  const data = await callApi("load_bootstrap");
  applyBootstrapToState(data);
  return data.me;
}

export async function loadDay(date) {
  const data = await callApi("load_day", { date });
  applyDayToState(date, data);
}
