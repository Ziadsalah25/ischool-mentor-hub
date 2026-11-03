import { S, TY, E, opts } from "../state.js";
import { tr } from "../i18n.js";

export function rf() {
  return (
    `<h2>${E(tr("Report form"))}</h2><p class="m">${E(
      tr("These are the questions every school report uses. Add, edit, reorder or remove questions and the change applies to all reports.")
    )}</p>` +
    S.rtpl
      .map(
        (f, i) =>
          `<div class="c"><div class="f"><input data-c="rf" data-f="l" data-id="${f.id}" value="${E(
            f.l
          )}" aria-label="Question"><select data-c="rf" data-f="t" data-id="${f.id}" aria-label="Answer type">${opts(
            TY.map(t => [t[0], tr(t[1])]),
            f.t
          )}</select>${
            f.t == "choice"
              ? `<input data-c="rf" data-f="o" data-id="${f.id}" value="${E(f.o || "")}" placeholder="${E(
                  tr("Options separated by commas")
                )}" aria-label="Options">`
              : ""
          }</div><div class="tb"><button class="sm" data-a="rup" data-id="${f.id}"${i ? "" : " disabled"}>${E(
            tr("Move up")
          )}</button><button class="sm" data-a="rdn" data-id="${f.id}"${i < S.rtpl.length - 1 ? "" : " disabled"}>${E(
            tr("Move down")
          )}</button><button class="sm" data-a="rdel" data-id="${f.id}">${E(tr("Remove"))}</button></div></div>`
      )
      .join("") +
    `<button class="p" data-a="radd">${E(tr("Add question"))}</button>`
  );
}

