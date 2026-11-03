import { tr } from "./i18n.js";
import { SEED_TUTORS, SEED_SCHOOLS, SEED_TPL } from "./data_seed.js";

export const SL = [
  "08:00 AM - 09:00 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM",
  "01:00 PM - 02:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM",
  "07:00 PM - 08:00 PM",
  "08:00 PM - 09:00 PM",
  "09:00 PM - 10:00 PM"
];
export const DN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MC = ["#0A6CEB", "#D9560A", "#12894A", "#7C4DDB"];
export const KEY = "mentor-hub-v3";
export const TY = [
  ["text", "Short text"],
  ["long", "Long text"],
  ["number", "Number"],
  ["yesno", "Yes / No"],
  ["choice", "Choice (dropdown)"]
];

export const td = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
export const $ = i => document.getElementById(i);
export const E = t =>
  String(t ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
export const E7 = () => ({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });

export const DEF = [
  { id: 1, l: "Sessions delivered", t: "number" },
  { id: 2, l: "Students present", t: "number" },
  { id: 3, l: "Topics covered", t: "long" },
  { id: 4, l: "All tutors on time?", t: "yesno" },
  { id: 5, l: "Problems or issues", t: "long" },
  { id: 6, l: "Overall day rating", t: "choice", o: "Excellent,Good,Fair,Poor" },
  { id: 7, l: "Follow-up needed", t: "long" }
];

export function seed() {
  const users = [{ id: 1, u: "admin", p: "zizoms_2511", n: "Admin", role: "admin", on: 1 }].concat(
    [2, 3, 4, 5].map(i => ({ id: i, u: "mentor" + (i - 1), p: "pass1234", n: "Mentor " + (i - 1), role: "mentor", on: 1 }))
  );
  return {
    users,
    tutors: JSON.parse(JSON.stringify(SEED_TUTORS)),
    schools: JSON.parse(JSON.stringify(SEED_SCHOOLS)),
    tpl: JSON.parse(JSON.stringify(SEED_TPL)),
    over: {},
    reqs: [],
    rtpl: DEF,
    reps: {},
    msub: {},
    mnote: {},
    mreqs: [],
    notifs: [
      { id: 1, to: 1, txt: "Welcome to iSchool Mentor Hub! All 30 full-time tutors, availability stats, and school schedules loaded.", dt: td(), rd: 0 }
    ]
  };
}

export let S;
try {
  S = JSON.parse(localStorage.getItem(KEY));
} catch (e) {}
if (!S || !S.users || !S.tutors || S.tutors.length < 20 || !S.tutors[0]?.code || S.tutors.some(t => t.n === "Omar Hassan" || t.name === "Omar Hassan" || t.n === "Nada Ali")) {
  S = seed();
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {}
}
if (!S.notifs) S.notifs = [];

export const ui = {
  me: null,
  tab: "",
  va: 2,
  date: td(),
  sc_: 0,
  dy: 0,
  rqo: 0,
  msg: "",
  mv: null,
  mf: td(),
  mt: td(),
  showNotifs: false
};

export const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {}
};

export function pushNotif(toId, txt) {
  if (!S.notifs) S.notifs = [];
  S.notifs.push({ id: Date.now() + Math.floor(Math.random() * 1000), to: toId, txt, dt: td(), rd: 0 });
}

export const usr = i => S.users.find(u => u.id == i) || { n: "?" };
export const tut = i => S.tutors.find(t => t.id == i);
export const sch = i => S.schools.find(k => k.id == i);
export const chip = o => `<span class="ch" style="background:${MC[Math.abs((o - 2) % 4)]}">${E(usr(o).n)}</span>`;
export const opts = (a, sel) => a.map(x => `<option value="${x[0]}"${x[0] == sel ? " selected" : ""}>${E(x[1])}</option>`).join("");
export const tutOpts = sel => `<option value="0">${E(tr("No tutor"))}</option>` + opts(S.tutors.filter(t => !t.ar).map(t => [t.id, t.n]), sel);

export const acc = (u, d) =>
  u.role == "admin"
    ? S.schools
    : S.schools.filter(k => k.own == u.id || S.reqs.some(r => r.st == "approved" && r.by == u.id && r.sch.includes(k.id) && r.from <= d && d <= r.until));

/**
 * Generates day instances while respecting Template Effective Dates (`ef` = effective_from, `eu` = effective_until)
 */
export function inst(d) {
  const w = new Date(d + "T12:00").getDay();
  const o = [];
  S.schools.forEach(k =>
    ((S.tpl[k.id] || {})[w] || []).forEach(e => {
      if (e.ef && d < e.ef) return; // Not yet effective on date `d`
      if (e.eu && d > e.eu) return; // Expired before date `d`
      const key = d + "|" + k.id + "|" + e.id,
        v = S.over[key] || {};
      o.push({ key, k, e, tu: v.tu !== undefined ? v.tu : e.tu, x: !!v.x });
    })
  );
  return o;
}

export const conf = (d, t, sl, key) => (t ? inst(d).find(i => !i.x && i.tu == t && i.e.t == sl && i.key != key) : null);
export const curU = () => (ui.me.role == "admin" ? usr(ui.va) : ui.me);

export const mst = r =>
  r.adm == "approved"
    ? "approved"
    : r.adm == "declined" || Object.values(r.ap).includes("declined")
    ? "declined"
    : Object.values(r.ap).every(v => v == "approved")
    ? "approved"
    : "pending";

export const dates = (a, b) => {
  const o = [];
  for (let x = new Date(a + "T12:00"); x <= new Date(b + "T12:00") && o.length < 93; x.setDate(x.getDate() + 1))
    o.push(x.toISOString().slice(0, 10));
  return o;
};

export function lastNDates(endDate, n = 7) {
  const o = [];
  const end = new Date(endDate + "T12:00");
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(end);
    x.setDate(end.getDate() - i);
    o.push(x.toISOString().slice(0, 10));
  }
  return o;
}

export function rows(a, b, ms) {
  const R = [["Date", "Mentor", "School"].concat(S.rtpl.map(f => f.l), ["Mentor note"])];
  dates(a, b).forEach(d =>
    ms.forEach(u => {
      Object.keys(S.reps)
        .filter(k => k.startsWith(d + "|") && S.reps[k].by == u.id && sch(+k.split("|")[1]))
        .forEach(k => {
          const r = S.reps[k];
          R.push([d, u.n, sch(+k.split("|")[1]).n].concat(S.rtpl.map(f => (r.v || {})[f.id] || ""), [""]));
        });
      const nt = S.mnote[d + "|" + u.id];
      if (nt) R.push([d, u.n, "Daily summary"].concat(S.rtpl.map(() => ""), [nt]));
    })
  );
  return R;
}

export const csv = R => "\ufeff" + R.map(r => r.map(c => '"' + String(c ?? "").replace(/"/g, '""') + '"').join(",")).join("\r\n");

export function exp(R, name, flashFn) {
  const blob = new Blob([csv(R)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (flashFn) flashFn("Export ready: " + name);
}

export function getTutorStats(tutor) {
  if (!tutor) {
    return {
      schools: [],
      schoolsCount: 0,
      sessionsCount: 0,
      occupiedSlots: 0,
      totalWorkingSlots: 65,
      availableSlots: 65,
      occPct: 0,
      availPct: 100,
      schedule: []
    };
  }

  const schedule = [];
  const schoolsSet = new Set();
  const tutorId = Number(tutor.id);

  const vacationNames = new Set(
    String(tutor.vac || tutor.vacationDays || "")
      .toLowerCase()
      .split(/[,/]+/)
      .map(s => s.trim())
      .filter(Boolean)
  );

  const tpl = S.tpl || {};
  Object.keys(tpl).forEach(schoolId => {
    const schoolObj = S.schools.find(s => Number(s.id) === Number(schoolId));
    const schoolName = schoolObj ? schoolObj.n : `School #${schoolId}`;
    const schoolDays = tpl[schoolId] || {};

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const daySessions = schoolDays[dayIdx] || [];
      const dayName = DN[dayIdx] || `Day ${dayIdx}`;
      daySessions.forEach(session => {
        if (Number(session.tu) === tutorId) {
          schoolsSet.add(schoolName);
          schedule.push({
            id: session.id,
            day: dayName,
            dayIndex: dayIdx,
            slotIndex: session.t,
            hour: SL[session.t] || `Slot ${session.t}`,
            school: schoolName,
            schoolId: Number(schoolId),
            cls: session.cls || "",
            tp: session.tp || "",
            type: session.type || "I2S",
            format: session.format || "Offline",
            status: session.status || "Permanent"
          });
        }
      });
    }
  });

  const vacDaysCount = Math.min(6, Math.max(0, vacationNames.size));
  const workingDays = Math.max(1, 7 - vacDaysCount);
  const totalWorkingSlots = workingDays * 13;
  const occupiedSlots = schedule.length;
  const availableSlots = Math.max(0, totalWorkingSlots - occupiedSlots);
  const occPct = totalWorkingSlots > 0 ? Math.min(100, Math.round((occupiedSlots / totalWorkingSlots) * 100)) : 0;
  const availPct = Math.max(0, 100 - occPct);

  schedule.sort((a, b) => (a.dayIndex - b.dayIndex) || (a.slotIndex - b.slotIndex));

  return {
    schools: Array.from(schoolsSet),
    schoolsCount: schoolsSet.size,
    sessionsCount: schedule.length,
    totalWorkingSlots,
    occupiedSlots,
    availableSlots,
    occPct,
    availPct,
    schedule
  };
}

export function findSubstitutes({ dayIndex, slotIndex, gov, lang }) {
  const targetDay = Number(dayIndex);
  const targetSlot = Number(slotIndex);
  const dayName = (DN[targetDay] || "").toLowerCase();
  const tpl = S.tpl || {};

  const candidates = [];

  (S.tutors || []).filter(t => !t.ar).forEach(tutor => {
    const tutorId = Number(tutor.id);
    const vacDays = String(tutor.vac || tutor.vacationDays || "")
      .toLowerCase()
      .split(/[,/]+/)
      .map(s => s.trim());

    const isVacation = vacDays.includes(dayName);

    let isBusyAtSlot = false;
    let conflictSchool = "";
    Object.keys(tpl).forEach(sId => {
      const list = tpl[sId]?.[targetDay] || [];
      list.forEach(sess => {
        if (Number(sess.tu) === tutorId && Number(sess.t) === targetSlot) {
          isBusyAtSlot = true;
          const sObj = S.schools.find(s => Number(s.id) === Number(sId));
          conflictSchool = sObj ? sObj.n : `School #${sId}`;
        }
      });
    });

    const stats = getTutorStats(tutor);

    let matchScore = 0;
    const tutorGov = tutor.gov || tutor.governorate || "";
    const tutorLang = tutor.lang || tutor.language || "";
    if (gov && tutorGov && tutorGov.toLowerCase() === gov.toLowerCase()) matchScore += 2;
    if (lang && tutorLang && tutorLang.toLowerCase() === lang.toLowerCase()) matchScore += 1;

    candidates.push({
      tutor,
      stats,
      isVacation,
      isBusyAtSlot,
      conflictSchool,
      isAvailable: !isVacation && !isBusyAtSlot,
      matchScore
    });
  });

  candidates.sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return b.stats.availPct - a.stats.availPct;
  });

  return candidates;
}
