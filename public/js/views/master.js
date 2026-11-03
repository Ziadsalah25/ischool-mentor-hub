import { S, ui, E, usr, mst, rows } from "../state.js";
import { tr } from "../i18n.js";

export function mr() {
  const me = ui.me,
    adm = me.role == "admin",
    rg = `<div class="f"><label class="m">${E(tr("From"))}<input type="date" data-c="mfr" value="${ui.mf}"></label><label class="m">${E(
      tr("To")
    )}<input type="date" data-c="mto" value="${ui.mt}"></label></div>`;
  let h =
    `<h2>${E(tr("Master report"))}</h2><p class="m">${E(
      tr("One large report that merges every mentor's reports for a date range. A mentor needs approval from all other mentors. The admin can approve instead.")
    )}</p>` +
    (adm
      ? `<div class="c"><h3>${E(tr("Build merged report"))}</h3>${rg}<button class="p" data-a="mbuild">${E(tr("Build now"))}</button></div>`
      : `<div class="c"><h3>${E(tr("Request access to all mentors' reports"))}</h3>${rg}<button class="p" data-a="mrq">${E(
          tr("Request from all mentors")
        )}</button></div>`);
  const l = S.mreqs
    .filter(r => adm || r.by == me.id || r.ap[me.id])
    .slice()
    .reverse();
  h += `<h2>${E(tr("Requests"))}</h2>` + (l.length ? "" : `<p class="m">${E(tr("No requests yet."))}</p>`);
  h += l
    .map(r => {
      const s = mst(r);
      return `<div class="c"><b>${E(usr(r.by).n)}</b> wants the merged report<div class="m">${r.from} to ${r.to}</div><div class="m">${Object.keys(r.ap)
        .map(i => E(usr(i).n) + ": " + r.ap[i])
        .join(" - ")}${r.adm ? " - Admin: " + r.adm : ""}</div><b class="${
        s == "approved" ? "ok" : s == "declined" ? "bad" : ""
      }">${s == "approved" ? E(tr("Approved")) : s == "declined" ? E(tr("Declined")) : E(tr("Waiting for approval"))}</b><div class="tb">${
        r.ap[me.id] == "pending"
          ? `<button class="sm p" data-a="map" data-id="${r.id}" data-v="approved">${E(
              tr("Approve")
            )}</button><button class="sm" data-a="map" data-id="${r.id}" data-v="declined">${E(tr("Decline"))}</button>`
          : ""
      }${adm && r.adm != "approved" ? `<button class="sm p" data-a="aap" data-id="${r.id}" data-v="approved">${E(tr("Admin approve"))}</button>` : ""}${
        adm && r.adm != "declined" ? `<button class="sm" data-a="aap" data-id="${r.id}" data-v="declined">${E(tr("Admin decline"))}</button>` : ""
      }${
        s == "approved" && (adm || r.by == me.id)
          ? `<button class="sm" data-a="mview" data-id="${r.id}">${E(tr("View"))}</button><button class="sm" data-a="mexpr" data-id="${
              r.id
            }">${E(tr("Export CSV"))}</button>`
          : ""
      }</div></div>`;
    })
    .join("");
  if (ui.mv) {
    const R = rows(ui.mv.from, ui.mv.to, S.users.filter(x => x.role == "mentor"));
    h += `<h2>Merged report ${ui.mv.from} to ${ui.mv.to}</h2><div class="tb"><button class="sm p" data-a="mexpv">${E(
      tr("Export CSV")
    )}</button></div><p class="m">${R.length - 1} rows from ${
      new Set(R.slice(1).map(r => r[1])).size
    } mentors.</p><div class="c sc"><table>${R.slice(0, 201)
      .map((r, i) => `<tr>${r.map(c => (i ? `<td>${E(c)}</td>` : `<th>${E(c)}</th>`)).join("")}</tr>`)
      .join("")}</table></div>`;
  }
  return h;
}

