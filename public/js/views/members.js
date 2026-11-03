import { S, E, opts } from "../state.js";
import { isCloudConfigured } from "../config.js";
import { tr } from "../i18n.js";

export function mn() {
  if (isCloudConfigured()) {
    return (
      `<h2>${E(tr("Members"))}</h2><div class="c"><h3>${E(tr("Create account"))}</h3><div class="f"><input id="nn" placeholder="${E(
        tr("Full name")
      )}" aria-label="Full name"><input id="ne" type="email" placeholder="Google email (e.g. name@gmail.com)" aria-label="Google email" autocapitalize="none"><select id="nr" aria-label="Role">${opts(
        [
          ["mentor", "Mentor"],
          ["admin", "Admin"]
        ],
        "mentor"
      )}</select></div><button class="p" data-a="addm">${E(tr("Create mentor"))}</button></div>` +
      S.users
        .map(
          u =>
            `<div class="c"><div class="r"><div><b>${E(u.n)}</b> <span class="tg">${E(u.role)}</span><div class="m">${E(
              u.email || u.u
            )} — ${u.auth_user_id ? "Signed in" : "Not signed in yet"}</div></div><div class="tb"><select data-c="mrole" data-id="${
              u.id
            }" aria-label="Role" style="width:auto;min-width:110px">${opts(
              [
                ["mentor", "Mentor"],
                ["admin", "Admin"]
              ],
              u.role
            )}</select><button class="sm" data-a="onoff" data-id="${u.id}">${u.on ? E(tr("Disable")) : E(
              tr("Enable")
            )}</button></div></div></div>`
        )
        .join("")
    );
  }

  return (
    `<h2>${E(tr("Mentor accounts"))}</h2><div class="c"><h3>${E(tr("Create account"))}</h3><div class="f"><input id="nn" placeholder="${E(
      tr("Full name")
    )}" aria-label="Full name"><input id="nu" placeholder="${E(
      tr("Username")
    )}" aria-label="Username" autocapitalize="none"><input id="np" placeholder="${E(
      tr("Password (min 8 characters)")
    )}" aria-label="Password"></div><button class="p" data-a="addm">${E(tr("Create mentor"))}</button></div>` +
    S.users
      .filter(u => u.role == "mentor")
      .map(
        u =>
          `<div class="c"><div class="r"><div><b>${E(u.n)}</b><div class="m">${E(tr("Username"))}: ${E(
            u.u
          )}</div></div><button class="sm" data-a="onoff" data-id="${u.id}">${u.on ? E(tr("Disable")) : E(
            tr("Enable")
          )}</button></div><div class="tb"><input id="pw${u.id}" placeholder="${E(
            tr("New password")
          )}" style="flex:1;min-width:140px" aria-label="New password"><button class="sm" data-a="pw" data-id="${u.id}">${E(
            tr("Reset password")
          )}</button></div></div>`
      )
      .join("")
  );
}
