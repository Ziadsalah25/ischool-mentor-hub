import { S, ui, SL, E, opts, tutOpts, acc, inst, conf, curU, tut, chip } from "../state.js";
import { tr } from "../i18n.js";

export function dash() {
  const me = ui.me,
    date = ui.date,
    u = curU(),
    ids = acc(u, date).map(k => k.id),
    l = inst(date).filter(i => ids.includes(i.k.id)).sort((a, b) => a.e.t - b.e.t),
    live = l.filter(i => !i.x);
  const un = live.filter(i => !i.tu).length,
    cf = live.filter(i => conf(date, i.tu, i.e.t, i.key)).length;
  let h =
    (me.role == "admin"
      ? `<label class="m">${E(tr("Viewing mentor"))}<select data-c="va">${opts(
          S.users.filter(x => x.role == "mentor" && (x.on || x.id == ui.va)).map(x => [x.id, x.n]),
          ui.va
        )}</select></label>`
      : "") +
    `<div class="r"><h2 style="margin:0">${me.role == "admin" ? E(u.n) + " " + E(tr("Dashboard").toLowerCase()) : E(tr("My dashboard"))}</h2><input type="date" id="dt" value="${date}" style="width:auto" aria-label="Date"></div>
<div class="g g4"><div class="k"><b>${live.length}</b><span>${E(tr("Sessions"))}</span></div><div class="k"><b class="${un ? "bad" : ""}">${un}</b><span>${E(tr("Without tutor"))}</span></div><div class="k"><b class="${cf ? "bad" : ""}">${cf}</b><span>${E(tr("Conflicts"))}</span></div><div class="k"><b>${ids.length}</b><span>${E(tr("Schools in scope"))}</span></div></div>
<p class="m">${E(tr("Today comes from each school template. Changes here apply to this date only."))}</p>`;
  if (!l.length) return h + `<p class="m">${E(tr("No sessions on this date (weekend or empty template)."))}</p>`;
  return (
    h +
    l
      .map(i => {
        const c = !i.x && conf(date, i.tu, i.e.t, i.key);
        return `<div class="c" style="${i.x ? "opacity:.6" : ""}"><div><b>${E(i.k.n)}</b> ${chip(i.k.own)}${
          i.k.own != u.id ? `<span class="tg">${E(tr("Temporary"))}</span>` : ""
        }<div class="m">${SL[i.e.t]} - ${E(i.e.cls)} - ${E(i.e.tp)}${i.x ? " - " + E(tr("Cancelled")) : ""}</div></div>
<div class="tb"><select data-c="ov" data-k="${i.key}" aria-label="Tutor"${i.x ? " disabled" : ""}>${tutOpts(i.tu)}</select><button class="sm" data-a="cx" data-k="${i.key}">${
          i.x ? E(tr("Restore")) : E(tr("Cancel for this day"))
        }</button></div>${c ? `<div class="bad">Conflict: ${E(tut(i.tu).n)} is also booked at ${E(c.k.n)} at this time.</div>` : ""}${
          !i.tu && !i.x ? `<div class="bad">${E(tr("No tutor assigned."))}</div>` : ""
        }</div>`;
      })
      .join("")
  );
}

