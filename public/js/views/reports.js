import { S, ui, E, acc, inst } from "../state.js";
import { tr } from "../i18n.js";

function fld(f, v, at) {
  v = v == null ? "" : v;
  const a = `data-c="rv" ${at} data-f="${f.id}" aria-label="${E(f.l)}"`;
  if (f.t == "long") return `<textarea ${a} rows="2">${E(v)}</textarea>`;
  if (f.t == "number") return `<input type="number" min="0" ${a} value="${E(v)}">`;
  if (f.t == "yesno" || f.t == "choice") {
    const o =
      f.t == "yesno"
        ? ["Yes", "No"]
        : (f.o || "")
            .split(",")
            .map(x => x.trim())
            .filter(Boolean);
    return `<select ${a}><option value="">${E(tr("Select"))}</option>${o
      .map(x => `<option value="${E(x)}"${x == v ? " selected" : ""}>${E(tr(x))}</option>`)
      .join("")}</select>`;
  }
  return `<input ${a} value="${E(v)}">`;
}

export function rp() {
  const me = ui.me,
    adm = me.role == "admin",
    d = ui.date,
    ms = adm ? S.users.filter(x => x.role == "mentor") : [me];
  let h =
    `<div class="r"><h2 style="margin:0">${E(tr("Daily report"))}</h2><input type="date" id="dt" value="${d}" style="width:auto" aria-label="Date"></div><p class="m">${E(
      tr("Fill one report per school using the report form, then submit your daily summary. Open a school to fill it in.")
    )}</p>` +
    (adm ? `<div class="tb"><button class="sm p" data-a="aexp">${E(tr("Export all mentors for this date (CSV)"))}</button></div>` : "");
  ms.forEach(u => {
    const ks = acc(u, d),
      sub = S.msub[d + "|" + u.id],
      miss = ks.filter(k => !S.reps[d + "|" + k.id]).length;
    h +=
      `<h2>${adm ? E(u.n) : E(tr("My schools"))}${sub ? ` <span class="tg">${E(tr("Submitted"))}</span>` : ""}</h2>` +
      ks
        .map(k => {
          const r = S.reps[d + "|" + k.id],
            n = inst(d).filter(i => i.k.id == k.id && !i.x).length;
          return `<details class="c"><summary><b>${E(k.n)}</b>${
            k.own != u.id ? `<span class="tg">${E(tr("Temporary"))}</span>` : ""
          } <span class="m">${n} sessions scheduled - ${r ? "report started" : "no report yet"}</span></summary>${S.rtpl
            .map(f => `<label class="m">${E(f.l)}${fld(f, ((r && r.v) || {})[f.id], `data-sid="${k.id}"`)}</label>`)
            .join("")}</details>`;
        })
        .join("") +
      `<div class="c"><h3>${E(tr("Daily summary"))}${adm ? " - " + E(u.n) : ""}</h3><textarea data-c="mn" data-mid="${
        u.id
      }" rows="3" placeholder="${E(tr("Notes for the day (optional)"))}" aria-label="Mentor note">${E(
        S.mnote[d + "|" + u.id] || ""
      )}</textarea><div class="m">${ks.length - miss} of ${ks.length} school reports started.</div><div class="tb"><button class="p sm" data-a="msub" data-id="${
        u.id
      }">${sub ? E(tr("Update submission")) : E(tr("Submit daily report"))}</button><button class="sm" data-a="mexp" data-id="${u.id}">${E(
        tr("Export CSV")
      )}</button></div></div>`;
  });
  return h;
}

