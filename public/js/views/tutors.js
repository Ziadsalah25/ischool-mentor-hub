import { S, ui, SL, DN, E, getTutorStats, findSubstitutes } from "../state.js";
import { tr } from "../i18n.js";

// Persistent UI filters for tutors view
if (!ui.tutFilter) {
  ui.tutFilter = {
    search: "",
    gov: "",
    lang: "",
    avail: "",
    expandedSchedule: null, // tutorId whose schedule is expanded
    editingTutor: null,      // tutorId being edited
    assigningTutor: null,    // tutorId being assigned to school
    subFinder: false,        // whether substitute finder is open
    subDay: 0,
    subSlot: 1,
    subGov: "",
    subLang: ""
  };
}

export function tt() {
  const tf = ui.tutFilter;
  const tutors = S.tutors || [];
  const activeTutors = tutors.filter(t => !t.ar);

  // Compute Overall Stats dynamically across all active tutors
  let totalWork = 0, totalOcc = 0;
  const tutorData = tutors.map(t => {
    const stats = getTutorStats(t);
    if (!t.ar) {
      totalWork += stats.totalWorkingSlots;
      totalOcc += stats.occupiedSlots;
    }
    return { t, stats };
  });

  const overallOccPct = totalWork > 0 ? Math.min(100, Math.round((totalOcc / totalWork) * 100)) : 0;
  const overallAvailPct = Math.max(0, 100 - overallOccPct);

  // Collect distinct governorates
  const govs = Array.from(new Set(tutors.map(t => t.gov || t.governorate).filter(Boolean))).sort();

  // Filter tutors
  const filtered = tutorData.filter(({ t, stats }) => {
    const s = tf.search.toLowerCase().trim();
    if (s) {
      const matchName = (t.n || t.name || "").toLowerCase().includes(s);
      const matchCode = (t.code || "").toLowerCase().includes(s);
      const matchPhone = (t.phone || "").includes(s);
      const matchArea = (t.area || "").toLowerCase().includes(s);
      const matchSchool = stats.schools.some(sch => sch.toLowerCase().includes(s));
      if (!matchName && !matchCode && !matchPhone && !matchArea && !matchSchool) return false;
    }
    if (tf.gov && (t.gov || t.governorate) !== tf.gov) return false;
    if (tf.lang && (t.lang || t.language) !== tf.lang) return false;
    if (tf.avail === "high" && stats.availPct < 40) return false;
    if (tf.avail === "busy" && stats.availPct >= 40) return false;
    return true;
  });

  let h = `
    <div class="r" style="margin-bottom:12px;align-items:flex-end">
      <div>
        <h2 style="margin:0 0 4px">${E(tr("Tutors & Full-Timers Availability"))}</h2>
        <div class="m">${E(tr("Manage tutor schedules, vacation days, availability %, and school assignments."))}</div>
      </div>
      <div class="tb" style="margin:0">
        <button class="sm" data-a="tut_export_csv">📥 ${E(tr("Export Tutors CSV"))}</button>
        <button class="sm${tf.subFinder ? " p" : ""}" data-a="tut_toggle_sub_finder">
          🔍 ${tf.subFinder ? E(tr("Close Substitute Finder")) : E(tr("Smart Substitute Finder"))}
        </button>
        ${ui.me.role === "admin" ? `<button class="sm p" data-a="tut_open_add">➕ ${E(tr("Add Tutor"))}</button>` : ""}
      </div>
    </div>

    <!-- Quick Stats Cards -->
    <div class="g g4" style="margin-bottom:16px">
      <div class="k">
        <b>${activeTutors.length}</b>
        <span>${E(tr("Active Full-Timers"))}</span>
      </div>
      <div class="k">
        <b style="color:var(--good,#0b8a4b)">${overallAvailPct}%</b>
        <span>${E(tr("Overall Availability %"))}</span>
      </div>
      <div class="k">
        <b style="color:var(--orange,#ff7a1a)">${overallOccPct}%</b>
        <span>${E(tr("Overall Occupation %"))}</span>
      </div>
      <div class="k">
        <b>${totalOcc}</b>
        <span>${E(tr("Total Sessions / Week"))}</span>
      </div>
    </div>
  `;

  // Smart Substitute Finder Tool
  if (tf.subFinder) {
    const candidates = findSubstitutes({
      dayIndex: tf.subDay,
      slotIndex: tf.subSlot,
      gov: tf.subGov,
      lang: tf.subLang
    });

    h += `
      <div class="c" style="border:2px solid var(--blue);background:var(--card);box-shadow:var(--shadow-md);margin-bottom:20px;border-radius:14px">
        <div class="r" style="border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:12px">
          <div>
            <h3 style="margin:0;color:var(--blue)">🔍 ${E(tr("Smart Substitute Finder"))}</h3>
            <div class="m" style="font-size:13px">${E(tr("Find tutors who are 100% FREE at this hour and NOT on their vacation day."))}</div>
          </div>
          <span class="tg" style="font-size:13px;font-weight:600">${candidates.filter(c => c.isAvailable).length} ${E(tr("Available now"))}</span>
        </div>
        <div class="f" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:14px">
          <label class="m">${E(tr("Day"))}
            <select data-c="sub_f_day">${DN.map((n, i) => `<option value="${i}"${i == tf.subDay ? " selected" : ""}>${E(tr(n))}</option>`).join("")}</select>
          </label>
          <label class="m">${E(tr("Time slot"))}
            <select data-c="sub_f_slot">${SL.map((s, i) => `<option value="${i}"${i == tf.subSlot ? " selected" : ""}>${E(s)}</option>`).join("")}</select>
          </label>
          <label class="m">${E(tr("Governorate (optional)"))}
            <select data-c="sub_f_gov">
              <option value="">${E(tr("All Governorates"))}</option>
              ${govs.map(g => `<option value="${E(g)}"${g === tf.subGov ? " selected" : ""}>${E(g)}</option>`).join("")}
            </select>
          </label>
          <label class="m">${E(tr("Language"))}
            <select data-c="sub_f_lang">
              <option value="">${E(tr("All Languages"))}</option>
              <option value="Arabic"${tf.subLang === "Arabic" ? " selected" : ""}>Arabic</option>
              <option value="English"${tf.subLang === "English" ? " selected" : ""}>English</option>
            </select>
          </label>
        </div>

        <div style="max-height:280px;overflow-y:auto;border:1px solid var(--line);border-radius:10px;padding:6px">
          ${candidates.length === 0 ? `<p class="m" style="padding:10px;text-align:center">${E(tr("No tutors found."))}</p>` : ""}
          ${candidates.map(({ tutor, stats, isAvailable, isVacation, isBusyAtSlot, conflictSchool }) => `
            <div class="r" style="padding:8px 10px;border-bottom:1px solid var(--line);background:${isAvailable ? "transparent" : "rgba(0,0,0,0.03)"}">
              <div style="flex:1;min-width:200px">
                <b>${E(tutor.n || tutor.name)}</b>
                <span class="tg" style="margin-left:6px">${E(tutor.code || "Tutor")}</span>
                <span class="m" style="font-size:12px;margin-left:6px">📍 ${E(tutor.gov || tutor.governorate || "—")} (${E(tutor.lang || tutor.language || "Ar")})</span>
                <div style="font-size:12px;margin-top:2px" class="m">
                  ${isAvailable ? `<span style="color:var(--good);font-weight:600">✅ Available (${stats.availPct}% free capacity)</span>` : ""}
                  ${isVacation ? `<span style="color:var(--orange);font-weight:600">🏖️ On weekly vacation (${E(tutor.vac || tutor.vacationDays)})</span>` : ""}
                  ${isBusyAtSlot ? `<span style="color:var(--bad);font-weight:600">⛔ Busy teaching at ${E(conflictSchool)}</span>` : ""}
                </div>
              </div>
              <div class="tb" style="margin:0">
                ${tutor.phone ? `<a href="tel:${E(tutor.phone)}" class="sm button" style="text-decoration:none;padding:4px 8px;font-size:12px;border:1px solid var(--line);border-radius:99px">📞 ${E(tutor.phone)}</a>` : ""}
                ${isAvailable ? `<button class="sm p" data-a="tut_quick_assign" data-id="${tutor.id}" data-day="${tf.subDay}" data-slot="${tf.subSlot}">${E(tr("Assign"))}</button>` : ""}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // Filters & Search Bar
  h += `
    <div class="c" style="margin-bottom:16px">
      <div class="f" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
        <input id="tut-search" placeholder="🔍 ${E(tr("Search by name, code, phone, school..."))}" value="${E(tf.search)}" aria-label="Search">
        <select id="tut-f-gov" aria-label="Governorate">
          <option value="">${E(tr("All Governorates"))}</option>
          ${govs.map(g => `<option value="${E(g)}"${g === tf.gov ? " selected" : ""}>${E(g)}</option>`).join("")}
        </select>
        <select id="tut-f-lang" aria-label="Language">
          <option value="">${E(tr("All Languages"))}</option>
          <option value="Arabic"${tf.lang === "Arabic" ? " selected" : ""}>${E(tr("Arabic"))}</option>
          <option value="English"${tf.lang === "English" ? " selected" : ""}>${E(tr("English"))}</option>
        </select>
        <select id="tut-f-avail" aria-label="Availability">
          <option value="">${E(tr("All Availabilities"))}</option>
          <option value="high"${tf.avail === "high" ? " selected" : ""}>🟢 ${E(tr("High Availability"))}</option>
          <option value="busy"${tf.avail === "busy" ? " selected" : ""}>🟠 ${E(tr("High Workload"))}</option>
        </select>
      </div>
    </div>
  `;

  // Add Tutor Modal Form (when active)
  if (ui.tutAddOpen) {
    h += `
      <div class="c" style="border:2px solid var(--good);border-radius:14px;padding:16px;margin-bottom:16px">
        <h3 style="margin-top:0">➕ ${E(tr("Add New Full-Timer Tutor"))}</h3>
        <div class="f" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
          <label class="m">${E(tr("Full Name"))}<input id="at-name" placeholder="Name"></label>
          <label class="m">${E(tr("Code (e.g. T-8000)"))}<input id="at-code" placeholder="T-8000"></label>
          <label class="m">${E(tr("Phone (010...)"))}<input id="at-phone" placeholder="01012345678"></label>
          <label class="m">${E(tr("Email"))}<input id="at-email" placeholder="tutor@ischool.tech"></label>
          <label class="m">${E(tr("Governorate"))}
            <input id="at-gov" list="gov-list" placeholder="Alexandria">
            <datalist id="gov-list">${govs.map(g => `<option value="${E(g)}">`).join("")}</datalist>
          </label>
          <label class="m">${E(tr("Area"))}<input id="at-area" placeholder="Area"></label>
          <label class="m">${E(tr("Language"))}
            <select id="at-lang"><option value="Arabic">Arabic</option><option value="English">English</option></select>
          </label>
          <label class="m">${E(tr("Weekly Vacation Days (e.g. Friday, Saturday)"))}
            <input id="at-vac" placeholder="Friday, Saturday">
          </label>
        </div>
        <div class="tb" style="margin-top:12px">
          <button class="p" data-a="tut_save_new">Save & Add Tutor</button>
          <button class="sm" data-a="tut_cancel_add">Cancel</button>
        </div>
      </div>
    `;
  }

  // Tutors List
  if (filtered.length === 0) {
    h += `<div class="c" style="text-align:center;padding:30px"><p class="m">${E(tr("No tutors match the selected filters."))}</p></div>`;
  } else {
    filtered.forEach(({ t, stats }) => {
      const isExpanded = tf.expandedSchedule === t.id;
      const isEditing = tf.editingTutor === t.id;
      const isAssigning = tf.assigningTutor === t.id;

      // Color coding for availability %
      const availColor = stats.availPct >= 50 ? "#0b8a4b" : stats.availPct >= 20 ? "#ff7a1a" : "#d92d20";
      const occColor = stats.occPct >= 80 ? "#d92d20" : stats.occPct >= 50 ? "#ff7a1a" : "#0b8a4b";

      h += `
        <div class="c" style="border-radius:14px;margin-bottom:12px;padding:16px;box-shadow:var(--shadow-sm);border:1px solid ${t.ar ? "var(--bad)" : "var(--line)"}">
          <!-- Tutor Header -->
          <div class="r" style="margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <b style="font-size:17px">${E(t.n || t.name)}</b>
              <span class="tg" style="font-weight:700;font-size:12px">${E(t.code || "Tutor")}</span>
              <span class="ch" style="background:#0a6ceb">${E(t.lang || t.language || "Arabic")}</span>
              <span class="m" style="font-size:13px">📍 ${E(t.gov || t.governorate || "Egypt")}${t.area ? " - " + E(t.area) : ""}</span>
              ${t.ar ? `<span style="color:var(--bad);font-size:12px;font-weight:600">(Archived)</span>` : ""}
            </div>
            <div class="tb" style="margin:0">
              <button class="sm${isExpanded ? " p" : ""}" data-a="tut_toggle_sched" data-id="${t.id}">
                📅 ${isExpanded ? E(tr("Hide Schedule")) : `${E(tr("Schedule"))} (${stats.sessionsCount})`}
              </button>
              <button class="sm" data-a="tut_toggle_edit" data-id="${t.id}">
                ✏️ ${E(tr("Edit Availability"))}
              </button>
              <button class="sm" data-a="tut_toggle_assign" data-id="${t.id}">
                🏫 ${E(tr("Assign School"))}
              </button>
              ${ui.me.role === "admin" ? `<button class="sm" data-a="tut_archive" data-id="${t.id}">${t.ar ? E(tr("Restore")) : E(tr("Archive"))}</button>` : ""}
            </div>
          </div>

          <!-- Availability & Occupation Bars & Details -->
          <div class="g" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;align-items:center;background:var(--bg);padding:10px 14px;border-radius:10px;margin-bottom:10px">
            <div>
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                <span><b>${E(tr("Availability"))}:</b> <span style="color:${availColor};font-weight:700">${stats.availPct}%</span></span>
                <span class="m">${stats.availableSlots} slots free</span>
              </div>
              <div style="height:8px;background:var(--line);border-radius:99px;overflow:hidden">
                <div style="height:100%;width:${stats.availPct}%;background:${availColor};border-radius:99px;transition:width .3s"></div>
              </div>
            </div>

            <div>
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                <span><b>${E(tr("Occupation"))}:</b> <span style="color:${occColor};font-weight:700">${stats.occPct}%</span></span>
                <span class="m">${stats.occupiedSlots} / ${stats.totalWorkingSlots} slots</span>
              </div>
              <div style="height:8px;background:var(--line);border-radius:99px;overflow:hidden">
                <div style="height:100%;width:${stats.occPct}%;background:${occColor};border-radius:99px;transition:width .3s"></div>
              </div>
            </div>

            <div style="font-size:13px">
              <div><b>🏖️ ${E(tr("Vacation Days"))}:</b> <span class="m">${E(t.vac || t.vacationDays || "None specified")}</span></div>
              <div style="margin-top:3px"><b>📞 ${E(tr("Phone"))}:</b> ${t.phone ? `<a href="tel:${E(t.phone)}" style="color:var(--blue);text-decoration:none">${E(t.phone)}</a>` : '<span class="m">—</span>'}</div>
            </div>
          </div>

          <!-- Schools Assigned Tags -->
          <div style="font-size:13px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <b>🏫 ${E(tr("Assigned Schools"))} (${stats.schoolsCount}):</b>
            ${stats.schools.length === 0 ? `<span class="m">${E(tr("No schools assigned yet."))}</span>` : ""}
            ${stats.schools.map(schName => `<span class="tg" style="font-size:12px;font-weight:600;padding:2px 8px">${E(schName)}</span>`).join("")}
          </div>

          <!-- Inline Edit Drawer (when active) -->
          ${isEditing ? `
            <div style="margin-top:14px;padding:14px;border:1px solid var(--orange);border-radius:10px;background:var(--warnbg,#fff8e7)">
              <h4 style="margin:0 0 10px;color:var(--orange)">✏️ ${E(tr("Edit Tutor Profile & Availability"))} - ${E(t.n || t.name)}</h4>
              <div class="f" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">
                <label class="m">${E(tr("Full Name"))}<input id="ed-name-${t.id}" value="${E(t.n || t.name)}"></label>
                <label class="m">${E(tr("Phone"))}<input id="ed-phone-${t.id}" value="${E(t.phone || "")}"></label>
                <label class="m">${E(tr("Email"))}<input id="ed-email-${t.id}" value="${E(t.email || "")}"></label>
                <label class="m">${E(tr("Governorate"))}
                  <input id="ed-gov-${t.id}" list="gov-list" value="${E(t.gov || t.governorate || "")}">
                </label>
                <label class="m">${E(tr("Language"))}
                  <select id="ed-lang-${t.id}">
                    <option value="Arabic"${(t.lang || t.language) === "Arabic" ? " selected" : ""}>Arabic</option>
                    <option value="English"${(t.lang || t.language) === "English" ? " selected" : ""}>English</option>
                  </select>
                </label>
                <label class="m">${E(tr("Weekly Vacation Days (e.g. Friday, Saturday)"))}
                  <input id="ed-vac-${t.id}" value="${E(t.vac || t.vacationDays || "")}" placeholder="Friday, Saturday">
                </label>
              </div>
              <div class="tb" style="margin-top:10px">
                <button class="p sm" data-a="tut_save_edit" data-id="${t.id}">Save Changes</button>
                <button class="sm" data-a="tut_toggle_edit" data-id="${t.id}">Cancel</button>
              </div>
            </div>
          ` : ""}

          <!-- Assign to School Drawer (when active) -->
          ${isAssigning ? `
            <div style="margin-top:14px;padding:14px;border:1px solid var(--blue);border-radius:10px;background:var(--card)">
              <h4 style="margin:0 0 8px;color:var(--blue)">🏫 ${E(tr("Assign Tutor to School"))}</h4>
              <p class="m" style="font-size:13px;margin:0 0 10px">${E(tr("Choose a school and time to add a weekly session with this tutor:"))}</p>
              <div class="f" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">
                <label class="m">${E(tr("School"))}
                  <select id="as-school-${t.id}">
                    ${(S.schools || []).map(sc => `<option value="${sc.id}">${E(sc.n)}</option>`).join("")}
                  </select>
                </label>
                <label class="m">${E(tr("Day"))}
                  <select id="as-day-${t.id}">${DN.map((n, i) => `<option value="${i}">${E(tr(n))}</option>`).join("")}</select>
                </label>
                <label class="m">${E(tr("Time Slot"))}
                  <select id="as-slot-${t.id}">${SL.map((s, i) => `<option value="${i}">${E(s)}</option>`).join("")}</select>
                </label>
                <label class="m">${E(tr("Session Type"))}
                  <select id="as-type-${t.id}">
                    <option value="I2S">I2S</option>
                    <option value="Partnerships">Partnerships</option>
                    <option value="ADH">ADH</option>
                  </select>
                </label>
              </div>
              <div class="tb" style="margin-top:10px">
                <button class="p sm" data-a="tut_submit_assign" data-id="${t.id}">${E(tr("Confirm Assignment"))}</button>
                <button class="sm" data-a="tut_toggle_assign" data-id="${t.id}">Cancel</button>
              </div>
            </div>
          ` : ""}

          <!-- Expanded Schedule Breakdown (when active) -->
          ${isExpanded ? `
            <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:12px">
              <h4 style="margin:0 0 8px">📋 ${E(tr("Weekly Sessions Detailed Schedule"))} (${stats.sessionsCount} ${E(tr("sessions"))})</h4>
              ${stats.schedule.length === 0 ? `<p class="m">${E(tr("No scheduled sessions yet for this tutor."))}</p>` : `
                <div class="sc">
                  <table>
                    <thead>
                      <tr>
                        <th>${E(tr("Day"))}</th>
                        <th>${E(tr("Time"))}</th>
                        <th>${E(tr("School"))}</th>
                        <th>${E(tr("Type"))}</th>
                        <th>${E(tr("Format"))}</th>
                        <th>${E(tr("Status"))}</th>
                        <th>${E(tr("Action"))}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${stats.schedule.map(sess => `
                        <tr>
                          <td><b>${E(sess.day)}</b></td>
                          <td>${E(sess.hour)}</td>
                          <td><b>${E(sess.school)}</b></td>
                          <td><span class="tg">${E(sess.type)}</span></td>
                          <td><span class="m">${E(sess.format)}</span></td>
                          <td><span class="m">${E(sess.status)}</span></td>
                          <td>
                            <button class="sm" style="color:var(--bad);padding:2px 8px" data-a="tut_remove_sess" data-tut="${t.id}" data-school="${sess.schoolId}" data-day="${sess.dayIndex}" data-sess="${sess.id}">
                              Remove
                            </button>
                          </td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          ` : ""}
        </div>
      `;
    });
  }

  return h;
}
