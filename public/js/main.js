import { S, ui, DN, E, E7, $, td, save, pushNotif, usr, tut, sch, inst, conf, mst, rows, exp, getTutorStats } from "./state.js";
import { isCloudConfigured, GOOGLE_CLIENT_ID } from "./config.js";
import { callApi, loadBootstrap, loadDay } from "./api.js";
import { initGoogleSignIn, resumeCloudSession, signOutCloud, loginWithPassword, setMemberPassword } from "./auth.js";
import { LOGO_URL } from "./logo.js";
import { getLang, setLang, applyDir, tr } from "./i18n.js";
import { dash } from "./views/dash.js";
import { tp } from "./views/templates.js";
import { rq } from "./views/requests.js";
import { ov } from "./views/overview.js";
import { mn } from "./views/members.js";
import { sc } from "./views/schools.js";
import { tt } from "./views/tutors.js";
import { rp } from "./views/reports.js";
import { rf } from "./views/reportForm.js";
import { mr } from "./views/master.js";

const TABS = {
  admin: [
    ["ov", "Overview"],
    ["dash", "Mentor view"],
    ["mn", isCloudConfigured() ? "Members" : "Mentors"],
    ["sc", "Schools"],
    ["tp", "Templates"],
    ["rp", "Reports"],
    ["rf", "Report form"],
    ["mr", "Master report"],
    ["tt", "Tutors"],
    ["rq", "Requests"]
  ],
  mentor: [
    ["dash", "Dashboard"],
    ["rp", "Daily report"],
    ["tp", "Templates"],
    ["mr", "Master report"],
    ["rq", "Requests"]
  ]
};

const V = { ov, dash, mn, sc, tp, tt, rq, rp, rf, mr };

let notAuthEmail = "";

export function flash(t) {
  ui.msg = t;
  render();
}

const picked = () => [...document.querySelectorAll(".rs:checked")].map(x => +x.value);

const th = $("th"),
  ln = $("ln"),
  nb = $("nb"),
  root = document.documentElement,
  dark = () => (root.dataset.theme ? root.dataset.theme == "dark" : matchMedia("(prefers-color-scheme:dark)").matches);

function myNotifs() {
  if (!ui.me) return [];
  return (S.notifs || []).filter(n => n.to == ui.me.id || (ui.me.role == "admin" && n.to == 0)).slice().reverse();
}

function updateHeaderControls() {
  if (th) th.textContent = dark() ? tr("Light mode") : tr("Dark mode");
  if (ln) ln.textContent = getLang() === "ar" ? "English" : "عربي";
  if (nb && ui.me) {
    const unread = myNotifs().filter(n => !n.rd).length;
    nb.innerHTML = `${E(tr("Notifications"))}${unread ? `<span class="badge">${unread}</span>` : ""}`;
  }
  if ($("lo")) $("lo").textContent = tr("Sign out");
  if ($("login-title")) $("login-title").textContent = tr("Mentor Hub sign in");
  if ($("lu-lbl")) $("lu-lbl").firstChild.textContent = tr("Username");
  if ($("lp-lbl")) $("lp-lbl").firstChild.textContent = tr("Password");
  if ($("lg")) $("lg").textContent = tr("Sign in");
}

function renderNotifPanel() {
  if (!ui.showNotifs || !ui.me) return "";
  const list = myNotifs();
  return `<div class="npanel">
    <div class="r"><h3>${E(tr("Notifications"))}</h3><button class="sm" data-a="nread">${E(tr("Mark all read"))}</button></div>
    ${
      list.length
        ? list
            .slice(0, 15)
            .map(
              n => `<div class="nitem ${n.rd ? "" : "unread"}"><span>${E(n.txt)}</span><span class="m">${E(n.dt || "")}</span></div>`
            )
            .join("")
        : `<p class="m">${E(tr("No notifications yet."))}</p>`
    }
  </div>`;
}

export function applyI18nToStaticHtml() {
  const isAr = getLang() === "ar";
  const orCred = $("lbl-or-cred");
  if (orCred) orCred.textContent = isAr ? "أو بالحساب" : "Or with credentials";
  const np1 = $("lbl-np1-text");
  if (np1) np1.textContent = isAr ? "كلمة المرور الجديدة" : "New password";
  const np2 = $("lbl-np2-text");
  if (np2) np2.textContent = isAr ? "تأكيد كلمة المرور" : "Confirm password";
  const saveBtn = $("save-pw-btn");
  if (saveBtn) saveBtn.textContent = isAr ? "حفظ ومتابعة" : "Save password & Sign in";
  const cancelBtn = $("cancel-setup-btn");
  if (cancelBtn) cancelBtn.textContent = isAr ? "رجوع" : "Back to sign in";
  const setupMsg = $("lbl-setup-msg");
  if (setupMsg) {
    const nameEl = $("setup-name");
    const name = nameEl ? nameEl.textContent : "";
    setupMsg.innerHTML = isAr
      ? `👋 أهلاً بك، <b id="setup-name">${E(name)}</b>! يرجى إنشاء وتأكيد كلمة مرور خاصة بحسابك لأول مرة.`
      : `👋 Welcome, <b id="setup-name">${E(name)}</b>! Please create your password for the first time.`;
  }
}

export function render() {
  document.querySelectorAll("img.brand-logo").forEach(img => {
    img.src = LOGO_URL;
  });
  applyI18nToStaticHtml();
  updateHeaderControls();

  const cloud = isCloudConfigured();
  if ($("google-login-box")) $("google-login-box").hidden = !(cloud && GOOGLE_CLIENT_ID);
  if ($("demo-login-box")) $("demo-login-box").hidden = false;

  if (notAuthEmail) {
    $("login").hidden = true;
    $("app").hidden = true;
    $("not-auth").hidden = false;
    $("na-email").textContent = notAuthEmail;
    return;
  }

  $("not-auth").hidden = true;
  const me = ui.me;
  $("login").hidden = !!me;
  $("app").hidden = !me;
  if (!me) return;
  const t = TABS[me.role];
  if (!t.some(x => x[0] == ui.tab)) ui.tab = t[0][0];
  $("who").textContent = me.n;
  $("nav").innerHTML = t
    .map(x => `<button data-a="tab" data-v="${x[0]}"${x[0] == ui.tab ? ' aria-current="true"' : ""}>${E(tr(x[1]))}</button>`)
    .join("");
  $("v").innerHTML =
    renderNotifPanel() + (ui.msg ? `<div class="fl" role="status">${E(ui.msg)}</div>` : "") + V[ui.tab]();
  ui.msg = "";
  if (!cloud) save();
}

async function syncFromServer() {
  if (!isCloudConfigured() || !ui.me) return;
  try {
    await loadBootstrap();
    await loadDay(ui.date);
    render();
  } catch (e) {}
}

// Single merged click dispatcher (Brief Section 7.2)
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-a]");
  if (!b || !ui.me) return;
  const me = ui.me,
    a = b.dataset.a,
    id = +b.dataset.id,
    v = b.dataset.v,
    ms = S.users.filter(x => x.role == "mentor"),
    cloud = isCloudConfigured();

  // Navigation & UI tabs
  if (a == "tab") {
    ui.tab = v;
    return render();
  }
  if (a == "dy") {
    ui.dy = +v;
    return render();
  }
  if (a == "open") {
    ui.va = id;
    ui.tab = "dash";
    return render();
  }
  if (a == "nread") {
    (S.notifs || []).forEach(n => {
      if (n.to == me.id || (me.role == "admin" && n.to == 0)) n.rd = 1;
    });
    if (cloud) {
      try {
        await callApi("mark_notifications_read");
      } catch (err) {}
    }
    ui.showNotifs = false;
    return render();
  }

  b.disabled = true;
  try {
    // Full JSON backup (Section 8)
    if (a == "backup") {
      const payload = cloud ? await callApi("full_backup") : { exported_at: new Date().toISOString(), state: S };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "ischool-mentor-hub-backup-" + td() + ".json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return flash("Backup downloaded.");
    }

    // Dashboard cancel / restore override
    if (a == "cx") {
      const key = b.dataset.k;
      const o = S.over[key] || (S.over[key] = {});
      const nextCancel = !o.x;
      if (cloud) {
        const [d, , sessionId] = key.split("|");
        await callApi("upsert_override", { session_id: +sessionId, on_date: d, cancelled: nextCancel });
      }
      o.x = nextCancel;
      return render();
    }

    // Templates (with Effective Date defaults to today so past history is preserved)
    if (a == "adde") {
      const effFrom = td();
      if (cloud) {
        const row = await callApi("add_template_session", {
          school_id: ui.sc_,
          weekday: ui.dy,
          slot: 0,
          class_name: "Grade 4",
          topic: "New topic",
          tutor_id: null,
          effective_from: effFrom,
          effective_until: ""
        });
        S.tpl[ui.sc_][ui.dy].push({
          id: row.id,
          t: row.slot,
          cls: row.class_name,
          tu: row.tutor_id || 0,
          tp: row.topic,
          ef: row.effective_from || effFrom,
          eu: row.effective_until || ""
        });
      } else {
        S.tpl[ui.sc_][ui.dy].push({ id: Date.now(), t: 0, cls: "Grade 4", tu: 0, tp: "New topic", ef: effFrom, eu: "" });
      }
      return render();
    }

    if (a == "del") {
      if (cloud) await callApi("delete_template_session", { id });
      S.tpl[ui.sc_][ui.dy] = S.tpl[ui.sc_][ui.dy].filter(x => x.id != id);
      return render();
    }

    if (a == "copyd") {
      if (cloud) {
        await callApi("copy_template_day", { school_id: ui.sc_, weekday: ui.dy });
        await loadBootstrap();
      } else {
        const src = S.tpl[ui.sc_][ui.dy];
        for (let d = 0; d < 7; d++)
          if (d != ui.dy) S.tpl[ui.sc_][d] = src.map((x, i) => ({ ...x, id: Date.now() + d * 100 + i }));
      }
      return flash("Copied " + DN[ui.dy] + " to all days.");
    }

    // Temporary access requests (+ automatic notifications)
    if (a == "rqs") {
      const sh = picked(),
        f = $("rf").value,
        u = $("ru").value;
      if (!sh.length) return flash("Choose at least one school.");
      if (!f || !u || u < f) return flash("Check the dates.");
      const schoolNames = sh.map(sid => sch(sid)?.n || sid).join(", ");
      if (cloud) {
        const r = await callApi("create_access_request", {
          requester_id: me.role == "admin" ? +$("rb").value : me.id,
          owner_id: me.role == "admin" ? null : ui.rqo,
          school_ids: sh,
          from_date: f,
          until_date: u
        });
        S.reqs.push({
          id: r.id,
          by: r.requester_id,
          to: r.owner_id || 0,
          sch: r.school_ids,
          from: r.from_date,
          until: r.until_date,
          st: r.status
        });
      } else {
        const byId = me.role == "admin" ? +$("rb").value : me.id;
        const toId = me.role == "admin" ? 0 : ui.rqo;
        S.reqs.push({
          id: Date.now(),
          by: byId,
          to: toId,
          sch: sh,
          from: f,
          until: u,
          st: me.role == "admin" ? "approved" : "pending"
        });
        if (me.role == "admin") {
          pushNotif(byId, `Admin assigned you temporary access to ${schoolNames} (${f} to ${u}).`);
        } else {
          pushNotif(toId, `${me.n} requested temporary access to ${schoolNames} (${f} to ${u}).`);
          pushNotif(1, `${me.n} requested temporary access to ${schoolNames} (${f} to ${u}).`);
        }
      }
      return flash(me.role == "admin" ? "Schools assigned & mentor notified." : "Request sent & owner notified.");
    }

    if (a == "rs") {
      if (cloud) await callApi("set_access_request_status", { id, status: v });
      const reqObj = S.reqs.find(r => r.id == id);
      reqObj.st = v;
      pushNotif(reqObj.by, `Your temporary access request (${reqObj.from} to ${reqObj.until}) was ${v} by ${me.n}.`);
      return render();
    }

    // Members / Mentors
    if (a == "addm") {
      if (cloud) {
        const n = $("nn").value.trim(),
          email = $("ne").value.trim().toLowerCase(),
          role = $("nr").value;
        if (!n || !email) return flash("Enter a name and Google email.");
        const row = await callApi("add_member", { name: n, email, role });
        S.users.push({ id: row.id, u: row.email, email: row.email, n: row.name, role: row.role, on: 1, auth_user_id: null });
        return flash("Member added: " + n + ".");
      } else {
        const n = $("nn").value.trim(),
          u = $("nu").value.trim().toLowerCase(),
          p = $("np").value;
        if (!n || !u) return flash("Enter a name and username.");
        if (p.length < 8) return flash("Password must be at least 8 characters.");
        if (S.users.some(x => x.u == u)) return flash("That username is taken.");
        S.users.push({ id: Date.now(), u, p, n, role: "mentor", on: 1 });
        return flash("Account created for " + n + ".");
      }
    }

    if (a == "onoff") {
      const u = usr(id);
      const nextOn = u.on ? 0 : 1;
      if (cloud) await callApi("update_member", { id, active: !!nextOn });
      u.on = nextOn;
      return render();
    }

    if (a == "pwreset") {
      if (cloud) {
        await callApi("reset_member_password", { id });
        return flash("Password reset. Member will set a new password on next login.");
      }
    }

    if (a == "pw") {
      const p = $("pw" + id).value;
      if (p.length < 8) return flash("Password must be at least 8 characters.");
      usr(id).p = p;
      return flash("Password updated.");
    }

    // Schools
    if (a == "adds") {
      const n = $("sn").value.trim();
      if (!n) return flash("Enter the school name.");
      const own = +$("so").value;
      if (cloud) {
        const row = await callApi("add_school", { name: n, owner_id: own });
        S.schools.push({ id: row.id, n: row.name, own: row.owner_id });
        S.tpl[row.id] = E7();
      } else {
        const k = { id: Date.now(), n, own };
        S.schools.push(k);
        S.tpl[k.id] = E7();
      }
      return flash(n + " added.");
    }

    if (a == "et") {
      ui.sc_ = id;
      ui.tab = "tp";
      return render();
    }

    // Tutors
    if (a == "addt" || a === "tut_save_new") {
      const n = ($("at-name")?.value || $("tn")?.value || "").trim();
      if (!n) return flash("Enter a name.");
      const code = ($("at-code")?.value || "").trim() || `T-${Math.floor(1000 + Math.random() * 9000)}`;
      const phone = ($("at-phone")?.value || "").trim();
      const email = ($("at-email")?.value || "").trim();
      const gov = ($("at-gov")?.value || "").trim() || "Cairo";
      const area = ($("at-area")?.value || "").trim();
      const lang = $("at-lang")?.value || "Arabic";
      const vac = ($("at-vac")?.value || "").trim() || "Friday, Saturday";

      const newTutor = {
        id: Date.now(),
        code,
        n,
        name: n,
        phone,
        email,
        gov,
        governorate: gov,
        area,
        lang,
        language: lang,
        vac,
        vacationDays: vac,
        type: "Full Time",
        ar: 0
      };

      if (cloud) {
        try {
          const row = await callApi("add_tutor", { name: n, code, phone, email, governorate: gov, language: lang, vacation_days: vac });
          if (row?.id) newTutor.id = row.id;
        } catch (err) {}
      }
      S.tutors.unshift(newTutor);
      ui.tutAddOpen = false;
      save();
      return flash("Tutor " + n + " added successfully.");
    }

    if (a === "tut_export_csv") {
      const headers = ["ID", "Name", "Phone Number", "Governorate", "Employment Type", "Language", "Vacation Days", "Starting date with iSchool", "Email", "Area", "Assigned Schools", "Sessions/Week", "Availability %", "Occupation %"];
      const tutorRows = [headers];
      (S.tutors || []).forEach(t => {
        const stats = getTutorStats(t);
        tutorRows.push([
          t.code || `T-${t.id}`,
          t.n || t.name,
          t.phone || "",
          t.gov || t.governorate || "",
          t.type || t.employmentType || "Full Time",
          t.lang || t.language || "Arabic",
          t.vac || t.vacationDays || "",
          t.startDate || "",
          t.email || "",
          t.area || "",
          stats.schools.join("; "),
          stats.sessionsCount,
          stats.availPct + "%",
          stats.occPct + "%"
        ]);
      });
      exp(tutorRows, "ischool_tutors_" + td() + ".csv", flash);
      return;
    }

    if (a === "tut_toggle_sub_finder") {
      if (!ui.tutFilter) ui.tutFilter = {};
      ui.tutFilter.subFinder = !ui.tutFilter.subFinder;
      return render();
    }

    if (a === "tut_open_add") {
      ui.tutAddOpen = true;
      return render();
    }

    if (a === "tut_cancel_add") {
      ui.tutAddOpen = false;
      return render();
    }

    if (a === "tut_toggle_sched") {
      if (!ui.tutFilter) ui.tutFilter = {};
      ui.tutFilter.expandedSchedule = ui.tutFilter.expandedSchedule === id ? null : id;
      return render();
    }

    if (a === "tut_toggle_edit") {
      if (!ui.tutFilter) ui.tutFilter = {};
      ui.tutFilter.editingTutor = ui.tutFilter.editingTutor === id ? null : id;
      return render();
    }

    if (a === "tut_save_edit") {
      const t = tut(id);
      if (!t) return;
      t.n = ($(`ed-name-${id}`)?.value || "").trim() || t.n;
      t.name = t.n;
      t.phone = ($(`ed-phone-${id}`)?.value || "").trim() || t.phone;
      t.email = ($(`ed-email-${id}`)?.value || "").trim() || t.email;
      t.gov = ($(`ed-gov-${id}`)?.value || "").trim() || t.gov;
      t.governorate = t.gov;
      t.lang = $(`ed-lang-${id}`)?.value || t.lang;
      t.language = t.lang;
      t.vac = ($(`ed-vac-${id}`)?.value || "").trim() || t.vac;
      t.vacationDays = t.vac;
      ui.tutFilter.editingTutor = null;
      save();
      return flash(`Updated availability & details for ${t.n}`);
    }

    if (a === "tut_toggle_assign") {
      if (!ui.tutFilter) ui.tutFilter = {};
      ui.tutFilter.assigningTutor = ui.tutFilter.assigningTutor === id ? null : id;
      return render();
    }

    if (a === "tut_submit_assign") {
      const t = tut(id);
      if (!t) return;
      const schoolId = +$(`as-school-${id}`).value;
      const dayIdx = +$(`as-day-${id}`).value;
      const slotIdx = +$(`as-slot-${id}`).value;
      const sessType = $(`as-type-${id}`)?.value || "I2S";
      if (!S.tpl[schoolId]) S.tpl[schoolId] = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[] };
      if (!S.tpl[schoolId][dayIdx]) S.tpl[schoolId][dayIdx] = [];
      const schObj = sch(schoolId);
      const newSession = {
        id: Date.now(),
        t: slotIdx,
        tu: id,
        cls: `${schObj?.n || "School"} Group`,
        tp: `${sessType} Session`,
        type: sessType,
        format: "Offline",
        status: "Permanent",
        ef: "",
        eu: ""
      };
      S.tpl[schoolId][dayIdx].push(newSession);
      ui.tutFilter.assigningTutor = null;
      save();
      return flash(`Assigned ${t.n} to ${schObj?.n} on ${DN[dayIdx]}`);
    }

    if (a === "tut_quick_assign") {
      const tutorId = +b.dataset.id;
      const day = +b.dataset.day;
      const slot = +b.dataset.slot;
      if (!ui.tutFilter) ui.tutFilter = {};
      ui.tutFilter.assigningTutor = tutorId;
      render();
      setTimeout(() => {
        const dEl = $(`as-day-${tutorId}`);
        const sEl = $(`as-slot-${tutorId}`);
        if (dEl) dEl.value = day;
        if (sEl) sEl.value = slot;
      }, 50);
      return;
    }

    if (a === "tut_remove_sess") {
      const schoolId = +b.dataset.school;
      const dayIdx = +b.dataset.day;
      const sessId = +b.dataset.sess;
      if (S.tpl[schoolId]?.[dayIdx]) {
        S.tpl[schoolId][dayIdx] = S.tpl[schoolId][dayIdx].filter(s => s.id !== sessId);
        save();
        return flash("Session removed from tutor schedule.");
      }
      return;
    }

    if (a == "art" || a === "tut_archive") {
      const t = tut(id);
      if (t) {
        if (cloud) await callApi("toggle_tutor", { id });
        t.ar = t.ar ? 0 : 1;
        save();
        return render();
      }
    }

    // Daily reports & Report form (+ notify admin on submission)
    if (a == "msub") {
      if (cloud) {
        await callApi("upsert_daily_summary", {
          member_id: id,
          report_date: ui.date,
          note: S.mnote[ui.date + "|" + id] || "",
          submit: true
        });
      }
      S.msub[ui.date + "|" + id] = true;
      pushNotif(1, `${usr(id).n} submitted their daily report for ${ui.date}.`);
      return flash("Daily report submitted & admin notified.");
    }

    if (a == "mexp") return exp(rows(ui.date, ui.date, [usr(id)]), "daily-report-" + (usr(id).u || usr(id).id) + "-" + ui.date + ".csv", flash);
    if (a == "aexp") return exp(rows(ui.date, ui.date, ms), "all-mentors-daily-report-" + ui.date + ".csv", flash);

    if (a == "radd") {
      if (cloud) {
        const row = await callApi("add_report_field");
        S.rtpl.push({ id: row.id, l: row.label, t: row.field_type, o: row.options || "" });
      } else {
        S.rtpl.push({ id: Date.now(), l: "New question", t: "text" });
      }
      return render();
    }

    if (a == "rdel") {
      if (cloud) await callApi("delete_report_field", { id });
      S.rtpl = S.rtpl.filter(f => f.id != id);
      return render();
    }

    if (a == "rup" || a == "rdn") {
      const dir = a == "rup" ? -1 : 1;
      if (cloud) await callApi("move_report_field", { id, dir });
      const i = S.rtpl.findIndex(f => f.id == id),
        j = i + dir,
        t = S.rtpl[i];
      S.rtpl[i] = S.rtpl[j];
      S.rtpl[j] = t;
      return render();
    }

    // Master report (+ automatic notifications)
    if (a == "mrq") {
      if (!ui.mf || !ui.mt || ui.mt < ui.mf) return flash("Check the dates.");
      if (cloud) {
        const row = await callApi("create_master_request", { from_date: ui.mf, to_date: ui.mt });
        S.mreqs.push({ id: row.id, by: row.requester_id, from: row.from_date, to: row.to_date, ap: row.approvals, adm: null });
      } else {
        const ap = {};
        ms.filter(x => x.on && x.id != me.id).forEach(x => {
          ap[x.id] = "pending";
          pushNotif(x.id, `${me.n} requested Master Report approval for ${ui.mf} to ${ui.mt}.`);
        });
        pushNotif(1, `${me.n} requested Master Report access (${ui.mf} to ${ui.mt}).`);
        S.mreqs.push({ id: Date.now(), by: me.id, from: ui.mf, to: ui.mt, ap, adm: null });
      }
      return flash("Request sent to all other mentors.");
    }

    if (a == "map") {
      if (cloud) await callApi("decide_master_request", { id, status: v, as_admin: false });
      const mrObj = S.mreqs.find(x => x.id == id);
      mrObj.ap[me.id] = v;
      pushNotif(mrObj.by, `${me.n} ${v} your Master Report request (${mrObj.from} to ${mrObj.to}).`);
      return render();
    }

    if (a == "aap") {
      if (cloud) await callApi("decide_master_request", { id, status: v, as_admin: true });
      const mrObj = S.mreqs.find(x => x.id == id);
      mrObj.adm = v;
      pushNotif(mrObj.by, `Admin ${v} your Master Report request (${mrObj.from} to ${mrObj.to}).`);
      return render();
    }

    if (a == "mbuild") {
      if (!ui.mf || !ui.mt || ui.mt < ui.mf) return flash("Check the dates.");
      ui.mv = { from: ui.mf, to: ui.mt };
      return render();
    }

    if (a == "mview" || a == "mexpr") {
      const r = S.mreqs.find(x => x.id == id);
      if (mst(r) != "approved" || !(me.role == "admin" || r.by == me.id)) return flash("This report is not approved yet.");
      if (a == "mview") {
        ui.mv = { from: r.from, to: r.to };
        return render();
      }
      return exp(rows(r.from, r.to, ms), "all-mentors-report-" + r.from + "-to-" + r.to + ".csv", flash);
    }

    if (
      a == "mexpv" &&
      ui.mv &&
      (me.role == "admin" || S.mreqs.some(r => r.by == me.id && r.from == ui.mv.from && r.to == ui.mv.to && mst(r) == "approved"))
    ) {
      return exp(rows(ui.mv.from, ui.mv.to, ms), "all-mentors-report-" + ui.mv.from + "-to-" + ui.mv.to + ".csv", flash);
    }
  } catch (err) {
    await syncFromServer();
    return flash(err.message || "Error saving change.");
  } finally {
    b.disabled = false;
  }
});

// Single merged change dispatcher
document.addEventListener("input", e => {
  if (e.target.id === "tut-search") {
    if (!ui.tutFilter) ui.tutFilter = {};
    ui.tutFilter.search = e.target.value;
    render();
  }
});

document.addEventListener("change", async e => {
  const t = e.target;
  const cloud = isCloudConfigured();

  if (t.id === "tut-search" || t.id === "tut-f-gov" || t.id === "tut-f-lang" || t.id === "tut-f-avail") {
    if (!ui.tutFilter) ui.tutFilter = {};
    if (t.id === "tut-search") ui.tutFilter.search = t.value;
    if (t.id === "tut-f-gov") ui.tutFilter.gov = t.value;
    if (t.id === "tut-f-lang") ui.tutFilter.lang = t.value;
    if (t.id === "tut-f-avail") ui.tutFilter.avail = t.value;
    return render();
  }

  if (t.dataset.c?.startsWith("sub_f_")) {
    if (!ui.tutFilter) ui.tutFilter = {};
    if (t.dataset.c === "sub_f_day") ui.tutFilter.subDay = +t.value;
    if (t.dataset.c === "sub_f_slot") ui.tutFilter.subSlot = +t.value;
    if (t.dataset.c === "sub_f_gov") ui.tutFilter.subGov = t.value;
    if (t.dataset.c === "sub_f_lang") ui.tutFilter.subLang = t.value;
    return render();
  }

  if (t.id == "dt") {
    ui.date = t.value || td();
    if (cloud && ui.me) {
      try {
        await loadDay(ui.date);
      } catch (err) {}
    }
    return render();
  }

  const c = t.dataset.c;
  if (!c || !ui.me) return;
  const me = ui.me,
    id = +t.dataset.id,
    v = t.value;

  if (c == "va") {
    ui.va = +v;
    return render();
  }
  if (c == "sc") {
    ui.sc_ = +v;
    return render();
  }
  if (c == "rqo") {
    ui.rqo = +v;
    return render();
  }

  try {
    if (c == "mrole") {
      if (cloud) await callApi("update_member", { id, role: v });
      usr(id).role = v;
      return flash("Role updated.");
    }

    if (c == "own") {
      if (cloud) await callApi("update_school_owner", { id, owner_id: +v });
      sch(id).own = +v;
      return flash("Owner changed.");
    }

    if (c == "ef") {
      const x = S.tpl[ui.sc_][ui.dy].find(z => z.id == id),
        f = t.dataset.f;
      x[f] = f == "t" || f == "tu" ? +v : v;
      if (cloud) {
        await callApi("update_template_session", {
          id,
          slot: x.t,
          class_name: x.cls,
          topic: x.tp,
          tutor_id: x.tu || null,
          effective_from: x.ef || "",
          effective_until: x.eu || ""
        });
      }
      return render();
    }

    if (c == "ov") {
      const key = t.dataset.k,
        [d, , sessionId] = key.split("|"),
        i = inst(d).find(z => z.key == key),
        n = +v,
        k = conf(d, n, i.e.t, key);
      if (k) {
        render();
        return flash(tut(n).n + " is already booked at " + k.k.n + " (" + usr(k.k.own).n + ") at that time.");
      }
      if (cloud) {
        await callApi("upsert_override", {
          session_id: +sessionId,
          on_date: d,
          tutor_overridden: true,
          tutor_id: n || null
        });
      }
      (S.over[key] || (S.over[key] = {})).tu = n;
      return render();
    }

    if (c == "rv") {
      const sid = +t.dataset.sid,
        key = ui.date + "|" + sid,
        r = S.reps[key] || (S.reps[key] = { by: me.role == "admin" ? sch(sid).own : me.id, v: {} });
      r.v[t.dataset.f] = t.value;
      if (cloud) {
        await callApi("set_report_answer", {
          school_id: sid,
          report_date: ui.date,
          field_id: t.dataset.f,
          value: t.value
        });
      } else {
        save();
      }
      return;
    }

    if (c == "mn") {
      S.mnote[ui.date + "|" + t.dataset.mid] = t.value;
      if (cloud) {
        await callApi("upsert_daily_summary", {
          member_id: +t.dataset.mid,
          report_date: ui.date,
          note: t.value,
          submit: false
        });
      } else {
        save();
      }
      return;
    }

    if (c == "mfr") {
      ui.mf = t.value;
      return;
    }
    if (c == "mto") {
      ui.mt = t.value;
      return;
    }

    if (c == "rf") {
      const f = S.rtpl.find(x => x.id == id);
      f[t.dataset.f] = t.value;
      if (cloud) {
        await callApi("update_report_field", {
          id,
          label: f.l,
          field_type: f.t,
          options: f.o || ""
        });
      }
      return t.dataset.f == "t" ? render() : save();
    }
  } catch (err) {
    await syncFromServer();
    return flash(err.message || "Error saving change.");
  }
});

// Refresh when tab becomes visible again
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && isCloudConfigured() && ui.me) {
    syncFromServer();
  }
});

// Login & header buttons
$("lg").onclick = async () => {
  let emailOrUser = $("lu").value.trim().toLowerCase();
  const pass = $("lp").value;
  const errEl = $("le");
  if (errEl) errEl.textContent = "";

  if (!emailOrUser || !pass) {
    if (errEl) errEl.textContent = tr("Please enter both email and password.");
    return;
  }

  // Normalize admin alias variations (e.g. zaid typo, admin, ziad)
  if (emailOrUser === "zaidmohamedsalah63@gmail.com" || emailOrUser === "admin" || emailOrUser === "ziad" || emailOrUser === "zaid") {
    emailOrUser = "ziadmohamedsalah63@gmail.com";
  }

  let pendingSetupEmail = "";

  const cloud = isCloudConfigured();
  if (cloud) {
    const lgBtn = $("lg");
    const origText = lgBtn.textContent;
    lgBtn.disabled = true;
    lgBtn.textContent = tr("Signing in...");
    try {
      const res = await loginWithPassword(emailOrUser, pass);
      if (res && res.needs_setup) {
        pendingSetupEmail = res.email;
        if ($("demo-login-box")) $("demo-login-box").hidden = true;
        if ($("google-login-box")) $("google-login-box").hidden = true;
        if ($("setup-password-box")) $("setup-password-box").hidden = false;
        if ($("setup-name")) $("setup-name").textContent = res.name || res.email;
        if ($("np1")) $("np1").value = "";
        if ($("np2")) $("np2").value = "";
        if (errEl) errEl.textContent = "";
        return;
      }
      ui.me = res;
      ui.tab = "";
      ui.mv = null;
      ui.showNotifs = false;
      $("lp").value = "";
      render();
    } catch (err) {
      if (errEl) errEl.textContent = err.message || tr("Sign in failed.");
    } finally {
      lgBtn.disabled = false;
      lgBtn.textContent = origText;
    }
  } else {
    const u = S.users.find(x => (x.u == emailOrUser || x.email == emailOrUser) && x.p == pass && x.on);
    if (!u) {
      if (errEl) errEl.textContent = tr("Wrong username or password, or the account is disabled.");
      return;
    }
    ui.me = u;
    ui.tab = "";
    ui.mv = null;
    ui.showNotifs = false;
    $("lp").value = "";
    render();
  }
};

$("lp").onkeydown = e => {
  if (e.key == "Enter") $("lg").click();
};

const pwToggle = $("toggle-pw");
if (pwToggle) {
  pwToggle.onclick = () => {
    const input = $("lp");
    if (!input) return;
    const isPw = input.type === "password";
    input.type = isPw ? "text" : "password";
    pwToggle.textContent = isPw ? "🙈" : "👁️";
  };
}

const bindEye = (btnId, inputId) => {
  const btn = $(btnId);
  const inp = $(inputId);
  if (btn && inp) {
    btn.onclick = () => {
      const isPw = inp.type === "password";
      inp.type = isPw ? "text" : "password";
      btn.textContent = isPw ? "🙈" : "👁️";
    };
  }
};
bindEye("toggle-np1", "np1");
bindEye("toggle-np2", "np2");

if ($("save-pw-btn")) {
  $("save-pw-btn").onclick = async () => {
    const p1 = ($("np1") ? $("np1").value : "").trim();
    const p2 = ($("np2") ? $("np2").value : "").trim();
    const errEl = $("le");
    if (errEl) errEl.textContent = "";

    if (!p1 || p1.length < 6) {
      if (errEl) errEl.textContent = tr("Password must be at least 6 characters.");
      return;
    }
    if (p1 !== p2) {
      if (errEl) errEl.textContent = tr("Passwords do not match.");
      return;
    }

    const btn = $("save-pw-btn");
    btn.disabled = true;
    btn.textContent = tr("Saving...");
    try {
      const email = ($("lu") ? $("lu").value.trim().toLowerCase() : "");
      const user = await setMemberPassword(email, p1);
      if ($("setup-password-box")) $("setup-password-box").hidden = true;
      if ($("demo-login-box")) $("demo-login-box").hidden = false;
      ui.me = user;
      ui.tab = "";
      ui.mv = null;
      ui.showNotifs = false;
      render();
    } catch (err) {
      if (errEl) errEl.textContent = err.message || tr("Failed to set password.");
    } finally {
      btn.disabled = false;
      btn.textContent = tr("Save password & Sign in");
    }
  };
}

if ($("cancel-setup-btn")) {
  $("cancel-setup-btn").onclick = () => {
    if ($("setup-password-box")) $("setup-password-box").hidden = true;
    if ($("demo-login-box")) $("demo-login-box").hidden = false;
    const errEl = $("le");
    if (errEl) errEl.textContent = "";
  };
}

const handleSignOut = () => {
  signOutCloud();
  notAuthEmail = "";
  ui.me = null;
  ui.mv = null;
  ui.showNotifs = false;
  render();
};

$("lo").onclick = handleSignOut;
if ($("na-out")) $("na-out").onclick = handleSignOut;

if (nb) {
  nb.onclick = () => {
    ui.showNotifs = !ui.showNotifs;
    render();
  };
}

try {
  const t = localStorage.getItem("mh-theme");
  if (t) root.dataset.theme = t;
} catch (e) {}

th.onclick = () => {
  const n = dark() ? "light" : "dark";
  root.dataset.theme = n;
  try {
    localStorage.setItem("mh-theme", n);
  } catch (e) {}
  updateHeaderControls();
};

if (ln) {
  ln.onclick = () => {
    setLang(getLang() === "ar" ? "en" : "ar");
    render();
  };
}

applyDir();

// Initialize Cloud Auth if configured
if (isCloudConfigured()) {
  const onSuccess = user => {
    notAuthEmail = "";
    ui.me = user;
    ui.tab = "";
    ui.mv = null;
    render();
  };
  const onNotAuthorized = email => {
    ui.me = null;
    notAuthEmail = email || "Unknown account";
    render();
  };
  const onError = msg => {
    if ($("le")) $("le").textContent = msg;
    render();
  };
  initGoogleSignIn(onSuccess, onNotAuthorized, onError);
  resumeCloudSession(onSuccess, onNotAuthorized, onError).then(resumed => {
    if (!resumed) render();
  });
} else {
  render();
}
