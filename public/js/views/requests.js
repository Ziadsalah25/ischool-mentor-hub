import { S, ui, E, td, opts, usr, sch, chip } from "../state.js";
import { tr } from "../i18n.js";

export function rq() {
  const me = ui.me,
    adm = me.role == "admin",
    d = td(),
    ms = S.users.filter(x => x.role == "mentor" && x.on && x.id != me.id),
    st = r => (r.st == "approved" && r.until < d ? "ended" : r.st);
  let h = `<h2>${E(tr("Temporary access"))}</h2>`;
  if (adm) {
    const activeMentors = S.users.filter(x => x.role == "mentor" && x.on);
    h += `<div class="c"><h3>${E(tr("Assign schools temporarily"))}</h3><div class="f"><label class="m">${E(
      tr("Mentor who covers")
    )}<select id="rb">${opts(
      activeMentors.map(x => [x.id, x.n]),
      activeMentors[0]?.id || 2
    )}</select></label><div>${S.schools
      .map(k => `<label><input type="checkbox" class="rs" value="${k.id}" style="width:auto"> ${E(k.n)} ${chip(k.own)}</label>`)
      .join("<br>")}</div><label class="m">${E(tr("From"))}<input type="date" id="rf" value="${d}"></label><label class="m">${E(
      tr("Until")
    )}<input type="date" id="ru" value="${d}"></label></div><button class="p" data-a="rqs">${E(tr("Assign now"))}</button></div>`;
  } else if (!ms.length) {
    h += `<div class="c"><p class="m">No other mentors yet.</p></div>`;
  } else {
    if (!ms.some(x => x.id == ui.rqo)) ui.rqo = ms[0].id;
    h += `<div class="c"><h3>${E(tr("Request access to a mentor's schools"))}</h3><p class="m">${E(
      tr(
        "For when a mentor is on vacation. The school owner or the admin approves. The schools then appear on your dashboard as Temporary for the dates you choose."
      )
    )}</p><div class="f"><label class="m">${E(tr("Mentor"))}<select data-c="rqo">${opts(
      ms.map(x => [x.id, x.n]),
      ui.rqo
    )}</select></label><div>${S.schools
      .filter(k => k.own == ui.rqo)
      .map(k => `<label><input type="checkbox" class="rs" value="${k.id}" checked style="width:auto"> ${E(k.n)}</label>`)
      .join("<br>")}</div><label class="m">${E(tr("From"))}<input type="date" id="rf" value="${d}"></label><label class="m">${E(
      tr("Until")
    )}<input type="date" id="ru" value="${d}"></label></div><button class="p" data-a="rqs">${E(tr("Send request"))}</button></div>`;
  }
  const l = S.reqs
    .filter(r => adm || r.by == me.id || r.to == me.id)
    .slice()
    .reverse();
  h += `<h2>${E(tr("Requests"))}</h2>` + (l.length ? "" : `<p class="m">${E(tr("No requests yet."))}</p>`);
  return (
    h +
    l
      .map(
        r =>
          `<div class="c"><b>${E(usr(r.by).n)}</b> ${r.to ? "asks " + E(usr(r.to).n) : "assigned by admin"}<div>${r.sch
            .map(i => E(sch(i)?.n || "?"))
            .join(", ")}</div><div class="m">${r.from} to ${r.until} - <b>${st(r)}</b></div><div class="tb">${
            r.st == "pending" && (adm || r.to == me.id)
              ? `<button class="sm p" data-a="rs" data-id="${r.id}" data-v="approved">${E(
                  tr("Approve")
                )}</button><button class="sm" data-a="rs" data-id="${r.id}" data-v="declined">${E(tr("Decline"))}</button>`
              : ""
          }${
            r.st == "approved" && (adm || r.to == me.id)
              ? `<button class="sm" data-a="rs" data-id="${r.id}" data-v="revoked">${E(tr("Revoke"))}</button>`
              : ""
          }</div></div>`
      )
      .join("")
  );
}

