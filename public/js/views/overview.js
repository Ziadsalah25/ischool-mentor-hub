import { S, td, acc, inst, chip, E } from "../state.js";
import { tr } from "../i18n.js";

export function ov() {
  const d = td();
  return `<h2>${E(tr("Overview"))}</h2><div class="g g4"><div class="k"><b>${
    S.users.filter(u => u.role == "mentor").length
  }</b><span>${E(tr("Mentors"))}</span></div><div class="k"><b>${S.schools.length}</b><span>${E(tr("Schools"))}</span></div><div class="k"><b>${
    S.tutors.filter(t => !t.ar).length
  }</b><span>${E(tr("Tutors"))}</span></div><div class="k"><b>${
    S.reqs.filter(r => r.st == "pending").length
  }</b><span>${E(tr("Pending requests"))}</span></div></div>
<div class="c sc"><table><tr><th>${E(tr("Mentor"))}</th><th>${E(tr("Schools"))}</th><th>${E(tr("Today"))}</th><th>${E(
    tr("Without tutor")
  )}</th><th></th></tr>${S.users
    .filter(u => u.role == "mentor")
    .map(u => {
      const ids = acc(u, d).map(k => k.id),
        l = inst(d).filter(i => ids.includes(i.k.id) && !i.x);
      return `<tr><td>${chip(u.id)}${u.on ? "" : " (off)"}</td><td>${ids.length}</td><td>${l.length}</td><td class="${
        l.some(i => !i.tu) ? "bad" : ""
      }">${l.filter(i => !i.tu).length}</td><td><button class="sm" data-a="open" data-id="${u.id}">${E(tr("Open"))}</button></td></tr>`;
    })
    .join("")}</table></div>
<div class="tb"><button class="sm" data-a="backup">Download full backup (JSON)</button></div>`;
}
