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
        k =>
          `<div class="c"><div class="r"><b>${E(k.n)}</b>${chip(k.own)}</div><div class="tb"><select data-c="own" data-id="${
            k.id
          }" aria-label="Owner">${opts(
            S.users.filter(x => x.role == "mentor" && (x.on || x.id == k.own)).map(x => [x.id, x.n]),
            k.own
          )}</select><button class="sm" data-a="et" data-id="${k.id}">${E(tr("Edit template"))}</button></div></div>`
      )
      .join("")
  );
}

