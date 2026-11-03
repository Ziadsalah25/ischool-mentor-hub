import { S, E, opts, chip } from "../state.js";
import { tr } from "../i18n.js";

export function sc() {
  const activeMentors = S.users.filter(x => x.role == "mentor" && x.on);
  return (
    `<h2>${E(tr("Schools"))}</h2><div class="c"><h3>${E(tr("Add school"))}</h3><div class="f"><input id="sn" placeholder="${E(
      tr("School name")
    )}" aria-label="School name"><select id="so" aria-label="Owner">${opts(
      activeMentors.map(x => [x.id, x.n]),
      activeMentors[0]?.id || 2
    )}</select></div><button class="p" data-a="adds">${E(tr("Add school"))}</button></div>` +
    S.schools
      .map(
        k => {
          const tplDays = S.tpl[k.id] || {};
          const tutorIds = Array.from(new Set(
            Object.values(tplDays).flat().map(sess => Number(sess.tu)).filter(id => id > 0)
          ));
          const schoolTutors = tutorIds.map(tId => S.tutors.find(t => Number(t.id) === tId)).filter(Boolean);

          return `<div class="c" style="border-radius:14px;margin-bottom:12px;padding:16px">
            <div class="r" style="margin-bottom:8px">
              <b>${E(k.n)}</b>
              ${chip(k.own)}
            </div>
            <div style="font-size:13px;margin:8px 0;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <b>👨‍🏫 ${E(tr("Assigned Tutors"))} (${schoolTutors.length}):</b>
              ${schoolTutors.length === 0 ? `<span class="m">${E(tr("No tutors assigned yet."))}</span>` : ""}
              ${schoolTutors.map(t => `<span class="tg" style="font-size:12px;font-weight:600">${E(t.n || t.name)} (${E(t.code || "Tutor")})</span>`).join("")}
            </div>
            <div class="tb">
              <select data-c="own" data-id="${k.id}" aria-label="Owner">${opts(
                S.users.filter(x => x.role == "mentor" && (x.on || x.id == k.own)).map(x => [x.id, x.n]),
                k.own
              )}</select>
              <button class="sm" data-a="et" data-id="${k.id}">${E(tr("Edit template / المواعيد"))}</button>
            </div>
          </div>`;
        }
      )
      .join("")
  );
}

