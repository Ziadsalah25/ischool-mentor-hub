import { tr } from "./i18n.js";

export const SL = ["08:00-09:30", "09:45-11:15", "11:30-13:00", "13:15-14:45"];
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
export const E = t => String(t ?? "").replace(/[&<>"']/g, c => ({
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
  const users = [{ id: 1, u: "admin", p: "admin123", n: "Admin", role: "admin", on: 1 }].concat(
    [2, 3, 4, 5].map(i => ({ id: i, u: "mentor" + (i - 1), p: "pass1234", n: "Mentor " + (i - 1), role: "mentor", on: 1 }))
  );
  const tutors = ["Omar Hassan", "Nada Ali", "Youssef Adel", "Mariam Samir", "Karim Fathy", "Salma Nabil", "Ahmed Tarek", "Hana Mostafa"].map(
    (n, i) => ({ id: i + 1, n, ar: 0 })
  );
  const schools = ["Future Language School", "Al Nour International", "Cairo Modern School", "Sunrise Academy", "Horizon Schools", "Delta STEM School"].map(
    (n, i) => ({ id: i + 1, n, own: [2, 3, 4, 5, 2, 3][i] })
  );
  const cls = ["Grade 4", "Grade 5", "Grade 6"],
    tp = ["Scratch basics", "Python loops", "Web pages", "Robotics", "Game design"],
    tpl = {};
  schools.forEach((k, si) => {
    tpl[k.id] = {};
    for (let d = 0; d < 7; d++)
      tpl[k.id][d] = (d > 4 ? [] : [0, 1]).map(e => {
        const i = si * 2 + e;
        return { id: i + 1, t: (i + (i >= 8 ? 1 : 0)) % 4, cls: cls[(i + d) % 3], tu: i == 5 ? 0 : (i % 8) + 1, tp: tp[(i + d) % 5] };
      });
  });
  return { users, tutors, schools, tpl, over: {}, reqs: [], rtpl: DEF, reps: {}, msub: {}, mnote: {}, mreqs: [] };
}

export let S;
try {
  S = JSON.parse(localStorage.getItem(KEY));
} catch (e) {}
if (!S || !S.users) S = seed();

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
  mt: td()
};

export const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {}
};

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

export function inst(d) {
  const w = new Date(d + "T12:00").getDay();
  const o = [];
  S.schools.forEach(k =>
    ((S.tpl[k.id] || {})[w] || []).forEach(e => {
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

