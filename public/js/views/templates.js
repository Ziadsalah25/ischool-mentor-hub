import { S, ui, SL, DN, E, E7, td, opts, tutOpts, acc } from "../state.js";
import { tr } from "../i18n.js";

export function tp() {
  const me = ui.me;
  const ls = me.role == "admin" ? S.schools : acc(me, td());
  if (!ls.length) return `<h2>${E(tr("Daily templates"))}</h2><p class="m">${E(tr("No schools yet."))}</p>`;
  if (!ls.some(k => k.id == ui.sc_)) ui.sc_ = ls[0].id;
  const T = S.tpl[ui.sc_] || (S.tpl[ui.sc_] = E7());
  let h = `<h2>${E(tr("Daily templates"))}</h2><p class="m">${E(
    tr("Set the weekly routine for each school once. It repeats every week, and you can change any single day on the dashboard.")
  )}</p><label class="m">${E(tr("School"))}<select data-c="sc">${opts(
    ls.map(k => [k.id, k.n]),
    ui.sc_
  )}</select></label><div class="tb">${DN.map(
    (n, i) => `<button class="sm${i == ui.dy ? " p" : ""}" data-a="dy" data-v="${i}">${E(tr(n))}</button>`
  ).join("")}</div>`;
  (T[ui.dy] || []).forEach(e => {
    const effBadge = e.ef || e.eu ? `<span class="tg">${E(e.ef || "...")} → ${E(e.eu || "∞")}</span>` : `<span class="m">(${E(tr("Always active"))})</span>`;
    h += `<div class="c"><div class="r"><b class="m">${SL[e.t]}</b>${effBadge}</div><div class="f"><select data-c="ef" data-f="t" data-id="${
      e.id
    }" aria-label="Time">${opts(
      SL.map((s, i) => [i, s]),
      e.t
    )}</select><input data-c="ef" data-f="cls" data-id="${e.id}" value="${E(e.cls)}" aria-label="Class"><input data-c="ef" data-f="tp" data-id="${
      e.id
    }" value="${E(e.tp)}" aria-label="Topic"><select data-c="ef" data-f="tu" data-id="${e.id}" aria-label="Tutor">${tutOpts(
      e.tu
    )}</select><label class="m">${E(tr("Effective from"))}<input type="date" data-c="ef" data-f="ef" data-id="${e.id}" value="${E(
      e.ef || ""
    )}"></label><label class="m">${E(tr("Effective until (optional)"))}<input type="date" data-c="ef" data-f="eu" data-id="${
      e.id
    }" value="${E(e.eu || "")}"></label></div><button class="sm" data-a="del" data-id="${e.id}">${E(tr("Remove"))}</button></div>`;
  });
  return (
    h +
    `<div class="tb"><button class="p" data-a="adde">Add session to ${E(tr(DN[ui.dy]))}</button><button data-a="copyd">Copy ${E(
      tr(DN[ui.dy])
    )} to all days</button></div>`
  );
}
