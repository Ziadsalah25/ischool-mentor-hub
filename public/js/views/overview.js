import { S, td, lastNDates, acc, inst, chip, E } from "../state.js";
import { tr } from "../i18n.js";

export function ov() {
  const d = td();
  const mentors = S.users.filter(u => u.role == "mentor");
  const weekDates = lastNDates(d, 7);

  // Compute 7-day compliance & coverage analytics
  let totalScheduled7d = 0,
    withTutor7d = 0,
    cancelled7d = 0,
    expectedReports7d = 0,
    completedReports7d = 0;

  const schoolStats = S.schools.map(k => {
    let schTotal = 0,
      schTutor = 0,
      schRepDone = 0,
      schActiveDays = 0;
    weekDates.forEach(dt => {
      const dayAll = inst(dt).filter(i => i.k.id == k.id);
      const dayLive = dayAll.filter(i => !i.x);
      cancelled7d += dayAll.length - dayLive.length;
      if (dayLive.length > 0) {
        schActiveDays++;
        schTotal += dayLive.length;
        schTutor += dayLive.filter(i => i.tu > 0).length;
        if (S.reps[dt + "|" + k.id]) schRepDone++;
      }
    });
    totalScheduled7d += schTotal;
    withTutor7d += schTutor;
    expectedReports7d += schActiveDays;
    completedReports7d += schRepDone;
    const covPct = schTotal ? Math.round((schTutor / schTotal) * 100) : 100;
    const repPct = schActiveDays ? Math.round((schRepDone / schActiveDays) * 100) : 100;
    return { k, schTotal, covPct, repPct };
  });

  const overallCovPct = totalScheduled7d ? Math.round((withTutor7d / totalScheduled7d) * 100) : 100;
  const overallRepPct = expectedReports7d ? Math.round((completedReports7d / expectedReports7d) * 100) : 100;

  return `<h2>${E(tr("Overview"))}</h2><div class="g g4"><div class="k"><b>${mentors.length}</b><span>${E(
    tr("Mentors")
  )}</span></div><div class="k"><b>${S.schools.length}</b><span>${E(tr("Schools"))}</span></div><div class="k"><b>${
    S.tutors.filter(t => !t.ar).length
  }</b><span>${E(tr("Tutors"))}</span></div><div class="k"><b>${
    S.reqs.filter(r => r.st == "pending").length
  }</b><span>${E(tr("Pending requests"))}</span></div></div>
<div class="c sc"><table><tr><th>${E(tr("Mentor"))}</th><th>${E(tr("Schools"))}</th><th>${E(tr("Today"))}</th><th>${E(
    tr("Without tutor")
  )}</th><th></th></tr>${mentors
    .map(u => {
      const ids = acc(u, d).map(k => k.id),
        l = inst(d).filter(i => ids.includes(i.k.id) && !i.x);
      return `<tr><td>${chip(u.id)}${u.on ? "" : " (off)"}</td><td>${ids.length}</td><td>${l.length}</td><td class="${
        l.some(i => !i.tu) ? "bad" : ""
      }">${l.filter(i => !i.tu).length}</td><td><button class="sm" data-a="open" data-id="${u.id}">${E(tr("Open"))}</button></td></tr>`;
    })
    .join("")}</table></div>

<h2>${E(tr("Weekly Analytics & Compliance (Last 7 Days)"))}</h2>
<div class="g g4">
  <div class="k"><b>${overallCovPct}%</b><span>${E(tr("Tutor Coverage Rate"))}</span><div class="pb ${
    overallCovPct < 80 ? "warn" : ""
  }"><i style="width:${overallCovPct}%"></i></div></div>
  <div class="k"><b>${overallRepPct}%</b><span>${E(tr("Report Completion Rate"))}</span><div class="pb ${
    overallRepPct < 80 ? "warn" : ""
  }"><i style="width:${overallRepPct}%"></i></div></div>
  <div class="k"><b>${totalScheduled7d}</b><span>${E(tr("Total Scheduled (7d)"))}</span></div>
  <div class="k"><b>${cancelled7d}</b><span>${E(tr("Cancelled Sessions (7d)"))}</span></div>
</div>

<div class="c sc">
  <table>
    <tr><th>${E(tr("School"))}</th><th>${E(tr("Mentor"))}</th><th>${E(tr("Total Scheduled (7d)"))}</th><th>${E(
    tr("Tutor Coverage Rate")
  )}</th><th>${E(tr("Report Completion Rate"))}</th></tr>
    ${schoolStats
      .map(
        s => `<tr>
      <td><b>${E(s.k.n)}</b></td>
      <td>${chip(s.k.own)}</td>
      <td>${s.schTotal}</td>
      <td><b>${s.covPct}%</b><div class="pb ${s.covPct < 80 ? "warn" : ""}"><i style="width:${s.covPct}%"></i></div></td>
      <td><b>${s.repPct}%</b><div class="pb ${s.repPct < 80 ? "warn" : ""}"><i style="width:${s.repPct}%"></i></div></td>
    </tr>`
      )
      .join("")}
  </table>
</div>
<div class="tb"><button class="sm" data-a="backup">${E(tr("Download full backup (JSON)"))}</button></div>`;
}
