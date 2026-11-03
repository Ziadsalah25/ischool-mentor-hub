import { S, E } from "../state.js";
import { tr } from "../i18n.js";

export function tt() {
  return (
    `<h2>${E(tr("Tutors"))}</h2><div class="c"><div class="f"><input id="tn" placeholder="${E(
      tr("Tutor name")
    )}" aria-label="Tutor name"></div><button class="p" data-a="addt">${E(tr("Add tutor"))}</button></div>` +
    S.tutors
      .map(
        t =>
          `<div class="c r"><span${t.ar ? ' class="m"' : ""}>${E(t.n)}${t.ar ? " (archived)" : ""}</span><button class="sm" data-a="art" data-id="${
            t.id
          }">${t.ar ? E(tr("Restore")) : E(tr("Archive"))}</button></div>`
      )
      .join("")
  );
}

