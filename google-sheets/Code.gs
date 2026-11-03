/**
 * =====================================================================
 * iSchool Mentor Hub — Google Sheets Database & Backend Engine
 * =====================================================================
 * Includes:
 * 1. Full relational tables in Google Sheets tabs
 * 2. Automatic Email + In-App Notifications (`notifications` tab + `MailApp`)
 * 3. Template Effective Date Versioning (`effective_from`, `effective_until`)
 * =====================================================================
 */

const TABS = {
  members: ["id", "email", "name", "role", "active", "google_sub", "last_login_at", "created_at", "password"],
  tutors: ["id", "name", "archived", "code", "phone", "email", "governorate", "language", "vacation_days", "employment_type", "start_date", "area"],
  schools: ["id", "name", "owner_id"],
  template_sessions: ["id", "school_id", "weekday", "slot", "class_name", "topic", "tutor_id", "effective_from", "effective_until"],
  session_overrides: ["session_id", "on_date", "tutor_overridden", "tutor_id", "cancelled"],
  access_requests: ["id", "requester_id", "owner_id", "from_date", "until_date", "status", "schools_json", "created_at"],
  report_fields: ["id", "label", "field_type", "options", "sort_order"],
  school_reports: ["school_id", "report_date", "author_id", "answers_json", "updated_at"],
  daily_summaries: ["member_id", "report_date", "note", "submitted_at"],
  master_report_requests: ["id", "requester_id", "from_date", "to_date", "admin_decision", "approvals_json", "created_at"],
  notifications: ["id", "recipient_id", "message", "is_read", "created_at"]
};

function cairoToday() {
  return Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd");
}

function getOrCreateSheet(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0A6CEB").setFontColor("#FFFFFF");
    sh.setFrozenRows(1);
  }
  return sh;
}

function sendAppNotification(ss, recipientId, message, subject) {
  const nSheet = getOrCreateSheet(ss, "notifications", TABS.notifications);
  const nRows = readTable(ss, "notifications");
  const id = nextId(nRows);
  nSheet.appendRow([id, recipientId, message, 0, cairoToday()]);

  // Also send an automatic email via Google MailApp if recipient has a valid email
  try {
    const members = readTable(ss, "members");
    const targets =
      Number(recipientId) === 0
        ? members.filter(m => m.role === "admin" && Number(m.active) === 1)
        : members.filter(m => Number(m.id) === Number(recipientId) && Number(m.active) === 1);
    targets.forEach(t => {
      if (t.email && t.email.includes("@") && typeof MailApp !== "undefined") {
        MailApp.sendEmail({
          to: t.email,
          subject: subject || "iSchool Mentor Hub — Notification",
          body: message
        });
      }
    });
  } catch (e) {}
}

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(name => getOrCreateSheet(ss, name, TABS[name]));

  const rfSheet = ss.getSheetByName("report_fields");
  if (rfSheet.getLastRow() <= 1) {
    const defFields = [
      [1, "Sessions delivered", "number", "", 1],
      [2, "Students present", "number", "", 2],
      [3, "Topics covered", "long", "", 3],
      [4, "All tutors on time?", "yesno", "", 4],
      [5, "Problems or issues", "long", "", 5],
      [6, "Overall day rating", "choice", "Excellent,Good,Fair,Poor", 6],
      [7, "Follow-up needed", "long", "", 7]
    ];
    defFields.forEach(r => rfSheet.appendRow(r));
  }

  const memSheet = ss.getSheetByName("members");
  if (memSheet.getLastRow() <= 1) {
    const ownerEmail = (typeof Session !== "undefined" && Session.getActiveUser ? Session.getActiveUser().getEmail() : "") || "ziadmohamedsalah63@gmail.com";
    memSheet.appendRow([1, ownerEmail.toLowerCase().trim(), "Ziad Mohamed Salah", "admin", 1, "", "", new Date().toISOString(), "zizoms_2511"]);
  }

  seedAllTutors(ss, false);
}


const SEED_SCHOOLS_DATA = [[7,"57357",2],[1,"Mansoura College",3],[2,"The Globe",4],[3,"ADH",5],[4,"FRA",2],[5,"Royal Kings",3],[6,"All Schools",4],[8,"Royal kings",5],[9,"GIZ",2],[10,"Royalty",3],[11,"Blue Sky",4],[12,"Elquds",5],[13,"Manaret Elbayan",2],[14,"Victoria",3],[15,"Baverlly Hills",4],[16,"Alpha",5],[17,"Al Bayan",2],[18,"TDS",3],[19,"Cardiff",4]];

const SEED_SESSIONS_DATA = [[1,1,0,1,"Mansoura College Group","I2S Session",1,"",""],[2,1,0,2,"Mansoura College Group","I2S Session",1,"",""],[3,1,0,3,"Mansoura College Group","I2S Session",1,"",""],[4,1,0,4,"Mansoura College Group","I2S Session",1,"",""],[5,1,0,5,"Mansoura College Group","I2S Session",1,"",""],[6,1,0,6,"Mansoura College Group","I2S Session",1,"",""],[7,1,0,7,"Mansoura College Group","I2S Session",1,"",""],[8,1,0,8,"Mansoura College Group","I2S Session",1,"",""],[9,1,0,1,"Mansoura College Group","I2S Session",17,"",""],[10,1,0,2,"Mansoura College Group","I2S Session",17,"",""],[11,1,0,3,"Mansoura College Group","I2S Session",17,"",""],[12,1,0,4,"Mansoura College Group","I2S Session",17,"",""],[13,1,0,5,"Mansoura College Group","I2S Session",17,"",""],[14,1,0,6,"Mansoura College Group","I2S Session",17,"",""],[15,1,0,7,"Mansoura College Group","I2S Session",17,"",""],[16,1,0,8,"Mansoura College Group","I2S Session",17,"",""],[17,1,1,1,"Mansoura College Group","I2S Session",1,"",""],[18,1,1,2,"Mansoura College Group","I2S Session",1,"",""],[19,1,1,3,"Mansoura College Group","I2S Session",1,"",""],[20,1,1,4,"Mansoura College Group","I2S Session",1,"",""],[21,1,1,5,"Mansoura College Group","I2S Session",1,"",""],[22,1,1,6,"Mansoura College Group","I2S Session",1,"",""],[23,1,1,7,"Mansoura College Group","I2S Session",1,"",""],[24,1,1,8,"Mansoura College Group","I2S Session",1,"",""],[25,1,1,1,"Mansoura College Group","I2S Session",17,"",""],[26,1,1,2,"Mansoura College Group","I2S Session",17,"",""],[27,1,1,3,"Mansoura College Group","I2S Session",17,"",""],[28,1,1,4,"Mansoura College Group","I2S Session",17,"",""],[29,1,1,5,"Mansoura College Group","I2S Session",17,"",""],[30,1,1,6,"Mansoura College Group","I2S Session",17,"",""],[31,1,1,7,"Mansoura College Group","I2S Session",17,"",""],[32,1,1,8,"Mansoura College Group","I2S Session",17,"",""],[33,1,2,1,"Mansoura College Group","I2S Session",1,"",""],[34,1,2,2,"Mansoura College Group","I2S Session",1,"",""],[35,1,2,3,"Mansoura College Group","I2S Session",1,"",""],[36,1,2,4,"Mansoura College Group","I2S Session",1,"",""],[37,1,2,5,"Mansoura College Group","I2S Session",1,"",""],[38,1,2,6,"Mansoura College Group","I2S Session",1,"",""],[39,1,2,7,"Mansoura College Group","I2S Session",1,"",""],[40,1,2,8,"Mansoura College Group","I2S Session",1,"",""],[41,1,2,1,"Mansoura College Group","I2S Session",17,"",""],[42,1,2,2,"Mansoura College Group","I2S Session",17,"",""],[43,1,2,3,"Mansoura College Group","I2S Session",17,"",""],[44,1,2,4,"Mansoura College Group","I2S Session",17,"",""],[45,1,2,5,"Mansoura College Group","I2S Session",17,"",""],[46,1,2,6,"Mansoura College Group","I2S Session",17,"",""],[47,1,2,7,"Mansoura College Group","I2S Session",17,"",""],[48,1,2,8,"Mansoura College Group","I2S Session",17,"",""],[49,1,3,1,"Mansoura College Group","I2S Session",1,"",""],[50,1,3,2,"Mansoura College Group","I2S Session",1,"",""],[51,1,3,3,"Mansoura College Group","I2S Session",1,"",""],[52,1,3,4,"Mansoura College Group","I2S Session",1,"",""],[53,1,3,5,"Mansoura College Group","I2S Session",1,"",""],[54,1,3,6,"Mansoura College Group","I2S Session",1,"",""],[55,1,3,7,"Mansoura College Group","I2S Session",1,"",""],[56,1,3,8,"Mansoura College Group","I2S Session",1,"",""],[57,1,3,1,"Mansoura College Group","I2S Session",17,"",""],[58,1,3,2,"Mansoura College Group","I2S Session",17,"",""],[59,1,3,3,"Mansoura College Group","I2S Session",17,"",""],[60,1,3,4,"Mansoura College Group","I2S Session",17,"",""],[61,1,3,5,"Mansoura College Group","I2S Session",17,"",""],[62,1,3,6,"Mansoura College Group","I2S Session",17,"",""],[63,1,3,7,"Mansoura College Group","I2S Session",17,"",""],[64,1,3,8,"Mansoura College Group","I2S Session",17,"",""],[65,1,4,1,"Mansoura College Group","I2S Session",1,"",""],[66,1,4,2,"Mansoura College Group","I2S Session",1,"",""],[67,1,4,3,"Mansoura College Group","I2S Session",1,"",""],[68,1,4,4,"Mansoura College Group","I2S Session",1,"",""],[69,1,4,5,"Mansoura College Group","I2S Session",1,"",""],[70,1,4,6,"Mansoura College Group","I2S Session",1,"",""],[71,1,4,7,"Mansoura College Group","I2S Session",1,"",""],[72,1,4,8,"Mansoura College Group","I2S Session",1,"",""],[73,1,4,1,"Mansoura College Group","I2S Session",17,"",""],[74,1,4,2,"Mansoura College Group","I2S Session",17,"",""],[75,1,4,3,"Mansoura College Group","I2S Session",17,"",""],[76,1,4,4,"Mansoura College Group","I2S Session",17,"",""],[77,1,4,5,"Mansoura College Group","I2S Session",17,"",""],[78,1,4,6,"Mansoura College Group","I2S Session",17,"",""],[79,1,4,7,"Mansoura College Group","I2S Session",17,"",""],[80,1,4,8,"Mansoura College Group","I2S Session",17,"",""],[81,2,0,1,"The Globe Group","I2S Session",2,"",""],[82,2,0,2,"The Globe Group","I2S Session",2,"",""],[83,2,0,3,"The Globe Group","I2S Session",2,"",""],[84,2,0,4,"The Globe Group","I2S Session",2,"",""],[85,2,0,5,"The Globe Group","I2S Session",2,"",""],[86,2,0,6,"The Globe Group","I2S Session",2,"",""],[87,2,0,7,"The Globe Group","I2S Session",2,"",""],[88,2,0,8,"The Globe Group","I2S Session",2,"",""],[89,2,0,1,"The Globe Group","I2S Session",26,"",""],[90,2,0,2,"The Globe Group","I2S Session",26,"",""],[91,2,0,3,"The Globe Group","I2S Session",26,"",""],[92,2,0,4,"The Globe Group","I2S Session",26,"",""],[93,2,0,5,"The Globe Group","I2S Session",26,"",""],[94,2,0,6,"The Globe Group","I2S Session",26,"",""],[95,2,0,7,"The Globe Group","I2S Session",26,"",""],[96,2,0,8,"The Globe Group","I2S Session",26,"",""],[97,2,1,1,"The Globe Group","I2S Session",2,"",""],[98,2,1,2,"The Globe Group","I2S Session",2,"",""],[99,2,1,3,"The Globe Group","I2S Session",2,"",""],[100,2,1,4,"The Globe Group","I2S Session",2,"",""],[101,2,1,5,"The Globe Group","I2S Session",2,"",""],[102,2,1,6,"The Globe Group","I2S Session",2,"",""],[103,2,1,7,"The Globe Group","I2S Session",2,"",""],[104,2,1,8,"The Globe Group","I2S Session",2,"",""],[105,2,1,1,"The Globe Group","I2S Session",26,"",""],[106,2,1,2,"The Globe Group","I2S Session",26,"",""],[107,2,1,3,"The Globe Group","I2S Session",26,"",""],[108,2,1,4,"The Globe Group","I2S Session",26,"",""],[109,2,1,5,"The Globe Group","I2S Session",26,"",""],[110,2,1,6,"The Globe Group","I2S Session",26,"",""],[111,2,1,7,"The Globe Group","I2S Session",26,"",""],[112,2,1,8,"The Globe Group","I2S Session",26,"",""],[113,2,2,1,"The Globe Group","I2S Session",2,"",""],[114,2,2,2,"The Globe Group","I2S Session",2,"",""],[115,2,2,3,"The Globe Group","I2S Session",2,"",""],[116,2,2,4,"The Globe Group","I2S Session",2,"",""],[117,2,2,5,"The Globe Group","I2S Session",2,"",""],[118,2,2,6,"The Globe Group","I2S Session",2,"",""],[119,2,2,7,"The Globe Group","I2S Session",2,"",""],[120,2,2,8,"The Globe Group","I2S Session",2,"",""],[121,2,2,1,"The Globe Group","I2S Session",26,"",""],[122,2,2,2,"The Globe Group","I2S Session",26,"",""],[123,2,2,3,"The Globe Group","I2S Session",26,"",""],[124,2,2,4,"The Globe Group","I2S Session",26,"",""],[125,2,2,5,"The Globe Group","I2S Session",26,"",""],[126,2,2,6,"The Globe Group","I2S Session",26,"",""],[127,2,2,7,"The Globe Group","I2S Session",26,"",""],[128,2,2,8,"The Globe Group","I2S Session",26,"",""],[129,2,3,1,"The Globe Group","I2S Session",2,"",""],[130,2,3,2,"The Globe Group","I2S Session",2,"",""],[131,2,3,3,"The Globe Group","I2S Session",2,"",""],[132,2,3,4,"The Globe Group","I2S Session",2,"",""],[133,2,3,5,"The Globe Group","I2S Session",2,"",""],[134,2,3,6,"The Globe Group","I2S Session",2,"",""],[135,2,3,7,"The Globe Group","I2S Session",2,"",""],[136,2,3,8,"The Globe Group","I2S Session",2,"",""],[137,2,3,1,"The Globe Group","I2S Session",26,"",""],[138,2,3,2,"The Globe Group","I2S Session",26,"",""],[139,2,3,3,"The Globe Group","I2S Session",26,"",""],[140,2,3,4,"The Globe Group","I2S Session",26,"",""],[141,2,3,5,"The Globe Group","I2S Session",26,"",""],[142,2,3,6,"The Globe Group","I2S Session",26,"",""],[143,2,3,7,"The Globe Group","I2S Session",26,"",""],[144,2,3,8,"The Globe Group","I2S Session",26,"",""],[145,2,4,1,"The Globe Group","I2S Session",2,"",""],[146,2,4,2,"The Globe Group","I2S Session",2,"",""],[147,2,4,3,"The Globe Group","I2S Session",2,"",""],[148,2,4,4,"The Globe Group","I2S Session",2,"",""],[149,2,4,5,"The Globe Group","I2S Session",2,"",""],[150,2,4,6,"The Globe Group","I2S Session",2,"",""],[151,2,4,7,"The Globe Group","I2S Session",2,"",""],[152,2,4,8,"The Globe Group","I2S Session",2,"",""],[153,2,4,1,"The Globe Group","I2S Session",26,"",""],[154,2,4,2,"The Globe Group","I2S Session",26,"",""],[155,2,4,3,"The Globe Group","I2S Session",26,"",""],[156,2,4,4,"The Globe Group","I2S Session",26,"",""],[157,2,4,5,"The Globe Group","I2S Session",26,"",""],[158,2,4,6,"The Globe Group","I2S Session",26,"",""],[159,2,4,7,"The Globe Group","I2S Session",26,"",""],[160,2,4,8,"The Globe Group","I2S Session",26,"",""],[161,3,6,1,"ADH Group","I2S Session",3,"",""],[162,3,6,2,"ADH Group","I2S Session",3,"",""],[163,3,6,3,"ADH Group","I2S Session",3,"",""],[164,3,6,4,"ADH Group","I2S Session",3,"",""],[165,3,6,5,"ADH Group","I2S Session",3,"",""],[166,3,6,6,"ADH Group","I2S Session",3,"",""],[167,3,6,7,"ADH Group","I2S Session",3,"",""],[168,3,6,8,"ADH Group","I2S Session",3,"",""],[169,3,6,1,"ADH Group","I2S Session",14,"",""],[170,3,6,2,"ADH Group","I2S Session",14,"",""],[171,3,6,3,"ADH Group","I2S Session",14,"",""],[172,3,6,4,"ADH Group","I2S Session",14,"",""],[173,3,6,5,"ADH Group","I2S Session",14,"",""],[174,3,6,6,"ADH Group","I2S Session",14,"",""],[175,3,6,7,"ADH Group","I2S Session",14,"",""],[176,3,6,1,"ADH Group","I2S Session",16,"",""],[177,3,6,2,"ADH Group","I2S Session",16,"",""],[178,3,6,3,"ADH Group","I2S Session",16,"",""],[179,3,6,4,"ADH Group","I2S Session",16,"",""],[180,3,6,5,"ADH Group","I2S Session",16,"",""],[181,3,6,6,"ADH Group","I2S Session",16,"",""],[182,3,6,7,"ADH Group","I2S Session",16,"",""],[183,3,6,8,"ADH Group","I2S Session",16,"",""],[184,3,6,1,"ADH Group","I2S Session",25,"",""],[185,3,6,2,"ADH Group","I2S Session",25,"",""],[186,3,6,3,"ADH Group","I2S Session",25,"",""],[187,3,6,4,"ADH Group","I2S Session",25,"",""],[188,3,6,5,"ADH Group","I2S Session",25,"",""],[189,3,6,6,"ADH Group","I2S Session",25,"",""],[190,3,6,7,"ADH Group","I2S Session",25,"",""],[191,3,6,8,"ADH Group","I2S Session",25,"",""],[192,4,1,9,"FRA Group","Partnerships Session",3,"",""],[193,4,1,10,"FRA Group","Partnerships Session",3,"",""],[194,4,2,9,"FRA Group","Partnerships Session",3,"",""],[195,4,2,10,"FRA Group","Partnerships Session",3,"",""],[196,4,2,11,"FRA Group","Partnerships Session",3,"",""],[197,4,2,12,"FRA Group","Partnerships Session",3,"",""],[198,5,0,1,"Royal Kings Group","I2S Session",6,"",""],[199,5,0,2,"Royal Kings Group","I2S Session",6,"",""],[200,5,0,3,"Royal Kings Group","I2S Session",6,"",""],[201,5,0,4,"Royal Kings Group","I2S Session",6,"",""],[202,5,0,5,"Royal Kings Group","I2S Session",6,"",""],[203,5,0,6,"Royal Kings Group","I2S Session",6,"",""],[204,5,0,7,"Royal Kings Group","I2S Session",6,"",""],[205,5,0,8,"Royal Kings Group","I2S Session",6,"",""],[206,5,0,1,"Royal Kings Group","I2S Session",19,"",""],[207,5,0,2,"Royal Kings Group","I2S Session",19,"",""],[208,5,0,3,"Royal Kings Group","I2S Session",19,"",""],[209,5,0,4,"Royal Kings Group","I2S Session",19,"",""],[210,5,0,5,"Royal Kings Group","I2S Session",19,"",""],[211,5,0,6,"Royal Kings Group","I2S Session",19,"",""],[212,5,0,7,"Royal Kings Group","I2S Session",19,"",""],[213,5,0,8,"Royal Kings Group","I2S Session",19,"",""],[214,5,0,1,"Royal Kings Group","I2S Session",29,"",""],[215,5,0,2,"Royal Kings Group","I2S Session",29,"",""],[216,5,0,3,"Royal Kings Group","I2S Session",29,"",""],[217,5,0,4,"Royal Kings Group","I2S Session",29,"",""],[218,5,0,5,"Royal Kings Group","I2S Session",29,"",""],[219,5,0,6,"Royal Kings Group","I2S Session",29,"",""],[220,5,0,7,"Royal Kings Group","I2S Session",29,"",""],[221,5,0,8,"Royal Kings Group","I2S Session",29,"",""],[222,5,1,1,"Royal Kings Group","I2S Session",6,"",""],[223,5,1,2,"Royal Kings Group","I2S Session",6,"",""],[224,5,1,3,"Royal Kings Group","I2S Session",6,"",""],[225,5,1,4,"Royal Kings Group","I2S Session",6,"",""],[226,5,1,5,"Royal Kings Group","I2S Session",6,"",""],[227,5,1,6,"Royal Kings Group","I2S Session",6,"",""],[228,5,1,7,"Royal Kings Group","I2S Session",6,"",""],[229,5,1,8,"Royal Kings Group","I2S Session",6,"",""],[230,5,1,1,"Royal Kings Group","I2S Session",19,"",""],[231,5,1,2,"Royal Kings Group","I2S Session",19,"",""],[232,5,1,3,"Royal Kings Group","I2S Session",19,"",""],[233,5,1,4,"Royal Kings Group","I2S Session",19,"",""],[234,5,1,5,"Royal Kings Group","I2S Session",19,"",""],[235,5,1,6,"Royal Kings Group","I2S Session",19,"",""],[236,5,1,7,"Royal Kings Group","I2S Session",19,"",""],[237,5,1,8,"Royal Kings Group","I2S Session",19,"",""],[238,5,1,1,"Royal Kings Group","I2S Session",29,"",""],[239,5,1,2,"Royal Kings Group","I2S Session",29,"",""],[240,5,1,3,"Royal Kings Group","I2S Session",29,"",""],[241,5,1,4,"Royal Kings Group","I2S Session",29,"",""],[242,5,1,5,"Royal Kings Group","I2S Session",29,"",""],[243,5,1,6,"Royal Kings Group","I2S Session",29,"",""],[244,5,1,7,"Royal Kings Group","I2S Session",29,"",""],[245,5,1,8,"Royal Kings Group","I2S Session",29,"",""],[246,5,2,1,"Royal Kings Group","I2S Session",6,"",""],[247,5,2,2,"Royal Kings Group","I2S Session",6,"",""],[248,5,2,3,"Royal Kings Group","I2S Session",6,"",""],[249,5,2,4,"Royal Kings Group","I2S Session",6,"",""],[250,5,2,5,"Royal Kings Group","I2S Session",6,"",""],[251,5,2,6,"Royal Kings Group","I2S Session",6,"",""],[252,5,2,7,"Royal Kings Group","I2S Session",6,"",""],[253,5,2,8,"Royal Kings Group","I2S Session",6,"",""],[254,5,2,1,"Royal Kings Group","I2S Session",29,"",""],[255,5,2,2,"Royal Kings Group","I2S Session",29,"",""],[256,5,2,3,"Royal Kings Group","I2S Session",29,"",""],[257,5,2,4,"Royal Kings Group","I2S Session",29,"",""],[258,5,2,5,"Royal Kings Group","I2S Session",29,"",""],[259,5,2,6,"Royal Kings Group","I2S Session",29,"",""],[260,5,2,7,"Royal Kings Group","I2S Session",29,"",""],[261,5,2,8,"Royal Kings Group","I2S Session",29,"",""],[262,5,3,1,"Royal Kings Group","I2S Session",6,"",""],[263,5,3,2,"Royal Kings Group","I2S Session",6,"",""],[264,5,3,3,"Royal Kings Group","I2S Session",6,"",""],[265,5,3,4,"Royal Kings Group","I2S Session",6,"",""],[266,5,3,5,"Royal Kings Group","I2S Session",6,"",""],[267,5,3,6,"Royal Kings Group","I2S Session",6,"",""],[268,5,3,7,"Royal Kings Group","I2S Session",6,"",""],[269,5,3,8,"Royal Kings Group","I2S Session",6,"",""],[270,5,3,1,"Royal Kings Group","I2S Session",23,"",""],[271,5,3,2,"Royal Kings Group","I2S Session",23,"",""],[272,5,3,3,"Royal Kings Group","I2S Session",23,"",""],[273,5,3,4,"Royal Kings Group","I2S Session",23,"",""],[274,5,3,5,"Royal Kings Group","I2S Session",23,"",""],[275,5,3,6,"Royal Kings Group","I2S Session",23,"",""],[276,5,3,7,"Royal Kings Group","I2S Session",23,"",""],[277,5,3,8,"Royal Kings Group","I2S Session",23,"",""],[278,5,3,1,"Royal Kings Group","I2S Session",29,"",""],[279,5,3,2,"Royal Kings Group","I2S Session",29,"",""],[280,5,3,3,"Royal Kings Group","I2S Session",29,"",""],[281,5,3,4,"Royal Kings Group","I2S Session",29,"",""],[282,5,3,5,"Royal Kings Group","I2S Session",29,"",""],[283,5,3,6,"Royal Kings Group","I2S Session",29,"",""],[284,5,3,7,"Royal Kings Group","I2S Session",29,"",""],[285,5,3,8,"Royal Kings Group","I2S Session",29,"",""],[286,5,4,1,"Royal Kings Group","I2S Session",6,"",""],[287,5,4,2,"Royal Kings Group","I2S Session",6,"",""],[288,5,4,3,"Royal Kings Group","I2S Session",6,"",""],[289,5,4,4,"Royal Kings Group","I2S Session",6,"",""],[290,5,4,5,"Royal Kings Group","I2S Session",6,"",""],[291,5,4,6,"Royal Kings Group","I2S Session",6,"",""],[292,5,4,7,"Royal Kings Group","I2S Session",6,"",""],[293,5,4,8,"Royal Kings Group","I2S Session",6,"",""],[294,5,4,1,"Royal Kings Group","I2S Session",23,"",""],[295,5,4,2,"Royal Kings Group","I2S Session",23,"",""],[296,5,4,3,"Royal Kings Group","I2S Session",23,"",""],[297,5,4,4,"Royal Kings Group","I2S Session",23,"",""],[298,5,4,5,"Royal Kings Group","I2S Session",23,"",""],[299,5,4,6,"Royal Kings Group","I2S Session",23,"",""],[300,5,4,7,"Royal Kings Group","I2S Session",23,"",""],[301,5,4,8,"Royal Kings Group","I2S Session",23,"",""],[302,5,4,1,"Royal Kings Group","I2S Session",29,"",""],[303,5,4,2,"Royal Kings Group","I2S Session",29,"",""],[304,5,4,3,"Royal Kings Group","I2S Session",29,"",""],[305,5,4,4,"Royal Kings Group","I2S Session",29,"",""],[306,5,4,5,"Royal Kings Group","I2S Session",29,"",""],[307,5,4,6,"Royal Kings Group","I2S Session",29,"",""],[308,5,4,7,"Royal Kings Group","I2S Session",29,"",""],[309,5,4,8,"Royal Kings Group","I2S Session",29,"",""],[310,5,5,6,"Royal Kings Group","I2S Session",3,"",""],[311,5,5,7,"Royal Kings Group","I2S Session",3,"",""],[312,5,5,8,"Royal Kings Group","I2S Session",3,"",""],[313,5,5,6,"Royal Kings Group","I2S Session",14,"",""],[314,5,5,7,"Royal Kings Group","I2S Session",14,"",""],[315,5,5,8,"Royal Kings Group","I2S Session",14,"",""],[316,5,5,6,"Royal Kings Group","I2S Session",25,"",""],[317,5,5,7,"Royal Kings Group","I2S Session",25,"",""],[318,5,5,8,"Royal Kings Group","I2S Session",25,"",""],[319,6,6,2,"All Schools Group","I2S Session",4,"",""],[320,6,6,3,"All Schools Group","I2S Session",4,"",""],[321,6,6,4,"All Schools Group","I2S Session",4,"",""],[322,6,6,5,"All Schools Group","I2S Session",4,"",""],[323,6,6,6,"All Schools Group","I2S Session",4,"",""],[324,6,6,7,"All Schools Group","I2S Session",4,"",""],[325,6,6,8,"All Schools Group","I2S Session",4,"",""],[326,6,6,9,"All Schools Group","I2S Session",4,"",""],[327,6,6,2,"All Schools Group","I2S Session",13,"",""],[328,6,6,3,"All Schools Group","I2S Session",13,"",""],[329,6,6,4,"All Schools Group","I2S Session",13,"",""],[330,6,6,5,"All Schools Group","I2S Session",13,"",""],[331,6,6,6,"All Schools Group","I2S Session",13,"",""],[332,6,6,7,"All Schools Group","I2S Session",13,"",""],[333,6,6,8,"All Schools Group","I2S Session",14,"",""],[334,6,6,9,"All Schools Group","I2S Session",14,"",""],[335,7,0,9,"57357 Group","Partnerships Session",4,"",""],[336,7,0,10,"57357 Group","Partnerships Session",4,"",""],[337,7,0,11,"57357 Group","Partnerships Session",4,"",""],[338,7,0,12,"57357 Group","Partnerships Session",4,"",""],[339,7,1,9,"57357 Group","Partnerships Session",4,"",""],[340,7,1,10,"57357 Group","Partnerships Session",4,"",""],[341,7,1,11,"57357 Group","Partnerships Session",4,"",""],[342,7,1,12,"57357 Group","Partnerships Session",4,"",""],[343,7,2,9,"57357 Group","Partnerships Session",4,"",""],[344,7,2,10,"57357 Group","Partnerships Session",4,"",""],[345,7,2,11,"57357 Group","Partnerships Session",4,"",""],[346,7,2,12,"57357 Group","Partnerships Session",4,"",""],[347,8,5,6,"Royal kings Group","I2S Session",4,"",""],[348,8,5,7,"Royal kings Group","I2S Session",4,"",""],[349,8,5,8,"Royal kings Group","I2S Session",4,"",""],[350,9,0,10,"GIZ Group","Partnerships Session",5,"",""],[351,9,0,11,"GIZ Group","Partnerships Session",5,"",""],[352,9,0,12,"GIZ Group","Partnerships Session",5,"",""],[353,9,0,10,"GIZ Group","Partnerships Session",19,"",""],[354,9,0,11,"GIZ Group","Partnerships Session",19,"",""],[355,9,0,12,"GIZ Group","Partnerships Session",19,"",""],[356,9,1,10,"GIZ Group","Partnerships Session",5,"",""],[357,9,1,11,"GIZ Group","Partnerships Session",5,"",""],[358,9,1,12,"GIZ Group","Partnerships Session",5,"",""],[359,9,6,10,"GIZ Group","Partnerships Session",5,"",""],[360,9,6,11,"GIZ Group","Partnerships Session",5,"",""],[361,9,6,12,"GIZ Group","Partnerships Session",5,"",""],[362,10,0,1,"Royalty Group","I2S Session",7,"",""],[363,10,0,2,"Royalty Group","I2S Session",7,"",""],[364,10,0,3,"Royalty Group","I2S Session",7,"",""],[365,10,0,4,"Royalty Group","I2S Session",7,"",""],[366,10,0,5,"Royalty Group","I2S Session",7,"",""],[367,10,0,6,"Royalty Group","I2S Session",7,"",""],[368,10,0,7,"Royalty Group","I2S Session",7,"",""],[369,10,0,8,"Royalty Group","I2S Session",7,"",""],[370,10,0,1,"Royalty Group","I2S Session",8,"",""],[371,10,0,2,"Royalty Group","I2S Session",8,"",""],[372,10,0,3,"Royalty Group","I2S Session",8,"",""],[373,10,0,4,"Royalty Group","I2S Session",8,"",""],[374,10,0,5,"Royalty Group","I2S Session",8,"",""],[375,10,0,6,"Royalty Group","I2S Session",8,"",""],[376,10,0,7,"Royalty Group","I2S Session",8,"",""],[377,10,0,8,"Royalty Group","I2S Session",8,"",""],[378,10,0,1,"Royalty Group","I2S Session",22,"",""],[379,10,0,2,"Royalty Group","I2S Session",22,"",""],[380,10,0,3,"Royalty Group","I2S Session",22,"",""],[381,10,0,4,"Royalty Group","I2S Session",22,"",""],[382,10,0,5,"Royalty Group","I2S Session",22,"",""],[383,10,0,6,"Royalty Group","I2S Session",22,"",""],[384,10,0,7,"Royalty Group","I2S Session",22,"",""],[385,10,0,8,"Royalty Group","I2S Session",22,"",""],[386,10,0,1,"Royalty Group","I2S Session",24,"",""],[387,10,0,2,"Royalty Group","I2S Session",24,"",""],[388,10,0,3,"Royalty Group","I2S Session",24,"",""],[389,10,0,4,"Royalty Group","I2S Session",24,"",""],[390,10,0,5,"Royalty Group","I2S Session",24,"",""],[391,10,0,6,"Royalty Group","I2S Session",24,"",""],[392,10,0,7,"Royalty Group","I2S Session",24,"",""],[393,10,0,8,"Royalty Group","I2S Session",24,"",""],[394,10,1,1,"Royalty Group","I2S Session",7,"",""],[395,10,1,2,"Royalty Group","I2S Session",7,"",""],[396,10,1,3,"Royalty Group","I2S Session",7,"",""],[397,10,1,4,"Royalty Group","I2S Session",7,"",""],[398,10,1,5,"Royalty Group","I2S Session",7,"",""],[399,10,1,6,"Royalty Group","I2S Session",7,"",""],[400,10,1,7,"Royalty Group","I2S Session",7,"",""],[401,10,1,8,"Royalty Group","I2S Session",7,"",""],[402,10,1,1,"Royalty Group","I2S Session",8,"",""],[403,10,1,2,"Royalty Group","I2S Session",8,"",""],[404,10,1,3,"Royalty Group","I2S Session",8,"",""],[405,10,1,4,"Royalty Group","I2S Session",8,"",""],[406,10,1,5,"Royalty Group","I2S Session",8,"",""],[407,10,1,6,"Royalty Group","I2S Session",8,"",""],[408,10,1,7,"Royalty Group","I2S Session",8,"",""],[409,10,1,8,"Royalty Group","I2S Session",8,"",""],[410,10,2,1,"Royalty Group","I2S Session",7,"",""],[411,10,2,2,"Royalty Group","I2S Session",7,"",""],[412,10,2,3,"Royalty Group","I2S Session",7,"",""],[413,10,2,4,"Royalty Group","I2S Session",7,"",""],[414,10,2,5,"Royalty Group","I2S Session",7,"",""],[415,10,2,6,"Royalty Group","I2S Session",7,"",""],[416,10,2,7,"Royalty Group","I2S Session",7,"",""],[417,10,2,8,"Royalty Group","I2S Session",7,"",""],[418,10,2,1,"Royalty Group","I2S Session",8,"",""],[419,10,2,2,"Royalty Group","I2S Session",8,"",""],[420,10,2,3,"Royalty Group","I2S Session",8,"",""],[421,10,2,4,"Royalty Group","I2S Session",8,"",""],[422,10,2,5,"Royalty Group","I2S Session",8,"",""],[423,10,2,6,"Royalty Group","I2S Session",8,"",""],[424,10,2,7,"Royalty Group","I2S Session",8,"",""],[425,10,2,8,"Royalty Group","I2S Session",8,"",""],[426,10,2,1,"Royalty Group","I2S Session",22,"",""],[427,10,2,2,"Royalty Group","I2S Session",22,"",""],[428,10,2,3,"Royalty Group","I2S Session",22,"",""],[429,10,2,4,"Royalty Group","I2S Session",22,"",""],[430,10,2,5,"Royalty Group","I2S Session",22,"",""],[431,10,2,6,"Royalty Group","I2S Session",22,"",""],[432,10,2,7,"Royalty Group","I2S Session",22,"",""],[433,10,2,8,"Royalty Group","I2S Session",22,"",""],[434,10,2,1,"Royalty Group","I2S Session",24,"",""],[435,10,2,2,"Royalty Group","I2S Session",24,"",""],[436,10,2,3,"Royalty Group","I2S Session",24,"",""],[437,10,2,4,"Royalty Group","I2S Session",24,"",""],[438,10,2,5,"Royalty Group","I2S Session",24,"",""],[439,10,2,6,"Royalty Group","I2S Session",24,"",""],[440,10,2,7,"Royalty Group","I2S Session",24,"",""],[441,10,2,8,"Royalty Group","I2S Session",24,"",""],[442,10,3,1,"Royalty Group","I2S Session",7,"",""],[443,10,3,2,"Royalty Group","I2S Session",7,"",""],[444,10,3,3,"Royalty Group","I2S Session",7,"",""],[445,10,3,4,"Royalty Group","I2S Session",7,"",""],[446,10,3,5,"Royalty Group","I2S Session",7,"",""],[447,10,3,6,"Royalty Group","I2S Session",7,"",""],[448,10,3,7,"Royalty Group","I2S Session",7,"",""],[449,10,3,8,"Royalty Group","I2S Session",7,"",""],[450,10,3,1,"Royalty Group","I2S Session",8,"",""],[451,10,3,2,"Royalty Group","I2S Session",8,"",""],[452,10,3,3,"Royalty Group","I2S Session",8,"",""],[453,10,3,4,"Royalty Group","I2S Session",8,"",""],[454,10,3,5,"Royalty Group","I2S Session",8,"",""],[455,10,3,6,"Royalty Group","I2S Session",8,"",""],[456,10,3,7,"Royalty Group","I2S Session",8,"",""],[457,10,3,8,"Royalty Group","I2S Session",8,"",""],[458,10,4,1,"Royalty Group","I2S Session",7,"",""],[459,10,4,2,"Royalty Group","I2S Session",7,"",""],[460,10,4,3,"Royalty Group","I2S Session",7,"",""],[461,10,4,4,"Royalty Group","I2S Session",7,"",""],[462,10,4,5,"Royalty Group","I2S Session",7,"",""],[463,10,4,6,"Royalty Group","I2S Session",7,"",""],[464,10,4,7,"Royalty Group","I2S Session",7,"",""],[465,10,4,8,"Royalty Group","I2S Session",7,"",""],[466,10,4,1,"Royalty Group","I2S Session",8,"",""],[467,10,4,2,"Royalty Group","I2S Session",8,"",""],[468,10,4,3,"Royalty Group","I2S Session",8,"",""],[469,10,4,4,"Royalty Group","I2S Session",8,"",""],[470,10,4,5,"Royalty Group","I2S Session",8,"",""],[471,10,4,6,"Royalty Group","I2S Session",8,"",""],[472,10,4,7,"Royalty Group","I2S Session",8,"",""],[473,10,4,8,"Royalty Group","I2S Session",8,"",""],[474,10,4,1,"Royalty Group","I2S Session",22,"",""],[475,10,4,2,"Royalty Group","I2S Session",22,"",""],[476,10,4,3,"Royalty Group","I2S Session",22,"",""],[477,10,4,4,"Royalty Group","I2S Session",22,"",""],[478,10,4,5,"Royalty Group","I2S Session",22,"",""],[479,10,4,6,"Royalty Group","I2S Session",22,"",""],[480,10,4,7,"Royalty Group","I2S Session",22,"",""],[481,10,4,8,"Royalty Group","I2S Session",22,"",""],[482,11,0,1,"Blue Sky Group","I2S Session",9,"",""],[483,11,0,2,"Blue Sky Group","I2S Session",9,"",""],[484,11,0,3,"Blue Sky Group","I2S Session",9,"",""],[485,11,0,4,"Blue Sky Group","I2S Session",9,"",""],[486,11,0,5,"Blue Sky Group","I2S Session",9,"",""],[487,11,0,6,"Blue Sky Group","I2S Session",9,"",""],[488,11,0,7,"Blue Sky Group","I2S Session",9,"",""],[489,11,0,8,"Blue Sky Group","I2S Session",9,"",""],[490,11,0,1,"Blue Sky Group","I2S Session",12,"",""],[491,11,0,2,"Blue Sky Group","I2S Session",12,"",""],[492,11,0,3,"Blue Sky Group","I2S Session",12,"",""],[493,11,0,4,"Blue Sky Group","I2S Session",12,"",""],[494,11,0,5,"Blue Sky Group","I2S Session",12,"",""],[495,11,0,6,"Blue Sky Group","I2S Session",12,"",""],[496,11,0,7,"Blue Sky Group","I2S Session",12,"",""],[497,11,0,8,"Blue Sky Group","I2S Session",12,"",""],[498,11,0,1,"Blue Sky Group","I2S Session",20,"",""],[499,11,0,2,"Blue Sky Group","I2S Session",20,"",""],[500,11,0,3,"Blue Sky Group","I2S Session",20,"",""],[501,11,0,4,"Blue Sky Group","I2S Session",20,"",""],[502,11,0,5,"Blue Sky Group","I2S Session",20,"",""],[503,11,0,6,"Blue Sky Group","I2S Session",20,"",""],[504,11,0,7,"Blue Sky Group","I2S Session",20,"",""],[505,11,0,8,"Blue Sky Group","I2S Session",20,"",""],[506,11,1,1,"Blue Sky Group","I2S Session",9,"",""],[507,11,1,2,"Blue Sky Group","I2S Session",9,"",""],[508,11,1,3,"Blue Sky Group","I2S Session",9,"",""],[509,11,1,4,"Blue Sky Group","I2S Session",9,"",""],[510,11,1,5,"Blue Sky Group","I2S Session",9,"",""],[511,11,1,6,"Blue Sky Group","I2S Session",9,"",""],[512,11,1,7,"Blue Sky Group","I2S Session",9,"",""],[513,11,1,8,"Blue Sky Group","I2S Session",9,"",""],[514,11,1,1,"Blue Sky Group","I2S Session",12,"",""],[515,11,1,2,"Blue Sky Group","I2S Session",12,"",""],[516,11,1,3,"Blue Sky Group","I2S Session",12,"",""],[517,11,1,4,"Blue Sky Group","I2S Session",12,"",""],[518,11,1,5,"Blue Sky Group","I2S Session",12,"",""],[519,11,1,6,"Blue Sky Group","I2S Session",12,"",""],[520,11,1,7,"Blue Sky Group","I2S Session",12,"",""],[521,11,1,8,"Blue Sky Group","I2S Session",12,"",""],[522,11,1,1,"Blue Sky Group","I2S Session",20,"",""],[523,11,1,2,"Blue Sky Group","I2S Session",20,"",""],[524,11,1,3,"Blue Sky Group","I2S Session",20,"",""],[525,11,1,4,"Blue Sky Group","I2S Session",20,"",""],[526,11,1,5,"Blue Sky Group","I2S Session",20,"",""],[527,11,1,6,"Blue Sky Group","I2S Session",20,"",""],[528,11,1,7,"Blue Sky Group","I2S Session",20,"",""],[529,11,1,8,"Blue Sky Group","I2S Session",20,"",""],[530,11,2,1,"Blue Sky Group","I2S Session",9,"",""],[531,11,2,2,"Blue Sky Group","I2S Session",9,"",""],[532,11,2,3,"Blue Sky Group","I2S Session",9,"",""],[533,11,2,4,"Blue Sky Group","I2S Session",9,"",""],[534,11,2,5,"Blue Sky Group","I2S Session",9,"",""],[535,11,2,6,"Blue Sky Group","I2S Session",9,"",""],[536,11,2,7,"Blue Sky Group","I2S Session",9,"",""],[537,11,2,8,"Blue Sky Group","I2S Session",9,"",""],[538,11,2,1,"Blue Sky Group","I2S Session",12,"",""],[539,11,2,2,"Blue Sky Group","I2S Session",12,"",""],[540,11,2,3,"Blue Sky Group","I2S Session",12,"",""],[541,11,2,4,"Blue Sky Group","I2S Session",12,"",""],[542,11,2,5,"Blue Sky Group","I2S Session",12,"",""],[543,11,2,6,"Blue Sky Group","I2S Session",12,"",""],[544,11,2,7,"Blue Sky Group","I2S Session",12,"",""],[545,11,2,8,"Blue Sky Group","I2S Session",12,"",""],[546,11,2,1,"Blue Sky Group","I2S Session",20,"",""],[547,11,2,2,"Blue Sky Group","I2S Session",20,"",""],[548,11,2,3,"Blue Sky Group","I2S Session",20,"",""],[549,11,2,4,"Blue Sky Group","I2S Session",20,"",""],[550,11,2,5,"Blue Sky Group","I2S Session",20,"",""],[551,11,2,6,"Blue Sky Group","I2S Session",20,"",""],[552,11,2,7,"Blue Sky Group","I2S Session",20,"",""],[553,11,2,8,"Blue Sky Group","I2S Session",20,"",""],[554,11,3,1,"Blue Sky Group","I2S Session",9,"",""],[555,11,3,2,"Blue Sky Group","I2S Session",9,"",""],[556,11,3,3,"Blue Sky Group","I2S Session",9,"",""],[557,11,3,4,"Blue Sky Group","I2S Session",9,"",""],[558,11,3,5,"Blue Sky Group","I2S Session",9,"",""],[559,11,3,6,"Blue Sky Group","I2S Session",9,"",""],[560,11,3,7,"Blue Sky Group","I2S Session",9,"",""],[561,11,3,8,"Blue Sky Group","I2S Session",9,"",""],[562,11,3,1,"Blue Sky Group","I2S Session",12,"",""],[563,11,3,2,"Blue Sky Group","I2S Session",12,"",""],[564,11,3,3,"Blue Sky Group","I2S Session",12,"",""],[565,11,3,4,"Blue Sky Group","I2S Session",12,"",""],[566,11,3,5,"Blue Sky Group","I2S Session",12,"",""],[567,11,3,6,"Blue Sky Group","I2S Session",12,"",""],[568,11,3,7,"Blue Sky Group","I2S Session",12,"",""],[569,11,3,8,"Blue Sky Group","I2S Session",12,"",""],[570,11,3,1,"Blue Sky Group","I2S Session",20,"",""],[571,11,3,2,"Blue Sky Group","I2S Session",20,"",""],[572,11,3,3,"Blue Sky Group","I2S Session",20,"",""],[573,11,3,4,"Blue Sky Group","I2S Session",20,"",""],[574,11,3,5,"Blue Sky Group","I2S Session",20,"",""],[575,11,3,6,"Blue Sky Group","I2S Session",20,"",""],[576,11,3,7,"Blue Sky Group","I2S Session",20,"",""],[577,11,3,8,"Blue Sky Group","I2S Session",20,"",""],[578,11,4,1,"Blue Sky Group","I2S Session",9,"",""],[579,11,4,2,"Blue Sky Group","I2S Session",9,"",""],[580,11,4,3,"Blue Sky Group","I2S Session",9,"",""],[581,11,4,4,"Blue Sky Group","I2S Session",9,"",""],[582,11,4,5,"Blue Sky Group","I2S Session",9,"",""],[583,11,4,6,"Blue Sky Group","I2S Session",9,"",""],[584,11,4,7,"Blue Sky Group","I2S Session",9,"",""],[585,11,4,8,"Blue Sky Group","I2S Session",9,"",""],[586,11,4,1,"Blue Sky Group","I2S Session",12,"",""],[587,11,4,2,"Blue Sky Group","I2S Session",12,"",""],[588,11,4,3,"Blue Sky Group","I2S Session",12,"",""],[589,11,4,4,"Blue Sky Group","I2S Session",12,"",""],[590,11,4,5,"Blue Sky Group","I2S Session",12,"",""],[591,11,4,6,"Blue Sky Group","I2S Session",12,"",""],[592,11,4,7,"Blue Sky Group","I2S Session",12,"",""],[593,11,4,8,"Blue Sky Group","I2S Session",12,"",""],[594,11,4,1,"Blue Sky Group","I2S Session",20,"",""],[595,11,4,2,"Blue Sky Group","I2S Session",20,"",""],[596,11,4,3,"Blue Sky Group","I2S Session",20,"",""],[597,11,4,4,"Blue Sky Group","I2S Session",20,"",""],[598,11,4,5,"Blue Sky Group","I2S Session",20,"",""],[599,11,4,6,"Blue Sky Group","I2S Session",20,"",""],[600,11,4,7,"Blue Sky Group","I2S Session",20,"",""],[601,11,4,8,"Blue Sky Group","I2S Session",20,"",""],[602,12,0,1,"Elquds Group","I2S Session",10,"",""],[603,12,0,2,"Elquds Group","I2S Session",10,"",""],[604,12,0,3,"Elquds Group","I2S Session",10,"",""],[605,12,0,4,"Elquds Group","I2S Session",10,"",""],[606,12,0,5,"Elquds Group","I2S Session",10,"",""],[607,12,0,6,"Elquds Group","I2S Session",10,"",""],[608,12,0,7,"Elquds Group","I2S Session",10,"",""],[609,12,0,8,"Elquds Group","I2S Session",10,"",""],[610,12,0,1,"Elquds Group","I2S Session",30,"",""],[611,12,0,2,"Elquds Group","I2S Session",30,"",""],[612,12,0,3,"Elquds Group","I2S Session",30,"",""],[613,12,0,4,"Elquds Group","I2S Session",30,"",""],[614,12,0,5,"Elquds Group","I2S Session",30,"",""],[615,12,0,6,"Elquds Group","I2S Session",30,"",""],[616,12,0,7,"Elquds Group","I2S Session",30,"",""],[617,12,0,8,"Elquds Group","I2S Session",30,"",""],[618,12,1,1,"Elquds Group","I2S Session",10,"",""],[619,12,1,2,"Elquds Group","I2S Session",10,"",""],[620,12,1,3,"Elquds Group","I2S Session",10,"",""],[621,12,1,4,"Elquds Group","I2S Session",10,"",""],[622,12,1,5,"Elquds Group","I2S Session",10,"",""],[623,12,1,6,"Elquds Group","I2S Session",10,"",""],[624,12,1,7,"Elquds Group","I2S Session",10,"",""],[625,12,1,8,"Elquds Group","I2S Session",10,"",""],[626,12,1,1,"Elquds Group","I2S Session",22,"",""],[627,12,1,2,"Elquds Group","I2S Session",22,"",""],[628,12,1,3,"Elquds Group","I2S Session",22,"",""],[629,12,1,4,"Elquds Group","I2S Session",22,"",""],[630,12,1,5,"Elquds Group","I2S Session",22,"",""],[631,12,1,6,"Elquds Group","I2S Session",22,"",""],[632,12,1,7,"Elquds Group","I2S Session",22,"",""],[633,12,1,8,"Elquds Group","I2S Session",22,"",""],[634,12,1,1,"Elquds Group","I2S Session",30,"",""],[635,12,1,2,"Elquds Group","I2S Session",30,"",""],[636,12,1,3,"Elquds Group","I2S Session",30,"",""],[637,12,1,4,"Elquds Group","I2S Session",30,"",""],[638,12,1,5,"Elquds Group","I2S Session",30,"",""],[639,12,1,6,"Elquds Group","I2S Session",30,"",""],[640,12,1,7,"Elquds Group","I2S Session",30,"",""],[641,12,1,8,"Elquds Group","I2S Session",30,"",""],[642,12,2,1,"Elquds Group","I2S Session",10,"",""],[643,12,2,2,"Elquds Group","I2S Session",10,"",""],[644,12,2,3,"Elquds Group","I2S Session",10,"",""],[645,12,2,4,"Elquds Group","I2S Session",10,"",""],[646,12,2,5,"Elquds Group","I2S Session",10,"",""],[647,12,2,6,"Elquds Group","I2S Session",10,"",""],[648,12,2,7,"Elquds Group","I2S Session",10,"",""],[649,12,2,8,"Elquds Group","I2S Session",10,"",""],[650,12,2,1,"Elquds Group","I2S Session",30,"",""],[651,12,2,2,"Elquds Group","I2S Session",30,"",""],[652,12,2,3,"Elquds Group","I2S Session",30,"",""],[653,12,2,4,"Elquds Group","I2S Session",30,"",""],[654,12,2,5,"Elquds Group","I2S Session",30,"",""],[655,12,2,6,"Elquds Group","I2S Session",30,"",""],[656,12,2,7,"Elquds Group","I2S Session",30,"",""],[657,12,2,8,"Elquds Group","I2S Session",30,"",""],[658,12,3,1,"Elquds Group","I2S Session",10,"",""],[659,12,3,2,"Elquds Group","I2S Session",10,"",""],[660,12,3,3,"Elquds Group","I2S Session",10,"",""],[661,12,3,4,"Elquds Group","I2S Session",10,"",""],[662,12,3,5,"Elquds Group","I2S Session",10,"",""],[663,12,3,6,"Elquds Group","I2S Session",10,"",""],[664,12,3,7,"Elquds Group","I2S Session",10,"",""],[665,12,3,8,"Elquds Group","I2S Session",10,"",""],[666,12,3,1,"Elquds Group","I2S Session",22,"",""],[667,12,3,2,"Elquds Group","I2S Session",22,"",""],[668,12,3,3,"Elquds Group","I2S Session",22,"",""],[669,12,3,4,"Elquds Group","I2S Session",22,"",""],[670,12,3,5,"Elquds Group","I2S Session",22,"",""],[671,12,3,6,"Elquds Group","I2S Session",22,"",""],[672,12,3,7,"Elquds Group","I2S Session",22,"",""],[673,12,3,8,"Elquds Group","I2S Session",22,"",""],[674,12,3,1,"Elquds Group","I2S Session",30,"",""],[675,12,3,2,"Elquds Group","I2S Session",30,"",""],[676,12,3,3,"Elquds Group","I2S Session",30,"",""],[677,12,3,4,"Elquds Group","I2S Session",30,"",""],[678,12,3,5,"Elquds Group","I2S Session",30,"",""],[679,12,3,6,"Elquds Group","I2S Session",30,"",""],[680,12,3,7,"Elquds Group","I2S Session",30,"",""],[681,12,3,8,"Elquds Group","I2S Session",30,"",""],[682,12,4,1,"Elquds Group","I2S Session",10,"",""],[683,12,4,2,"Elquds Group","I2S Session",10,"",""],[684,12,4,3,"Elquds Group","I2S Session",10,"",""],[685,12,4,4,"Elquds Group","I2S Session",10,"",""],[686,12,4,5,"Elquds Group","I2S Session",10,"",""],[687,12,4,6,"Elquds Group","I2S Session",10,"",""],[688,12,4,7,"Elquds Group","I2S Session",10,"",""],[689,12,4,8,"Elquds Group","I2S Session",10,"",""],[690,12,4,1,"Elquds Group","I2S Session",30,"",""],[691,12,4,2,"Elquds Group","I2S Session",30,"",""],[692,12,4,3,"Elquds Group","I2S Session",30,"",""],[693,12,4,4,"Elquds Group","I2S Session",30,"",""],[694,12,4,5,"Elquds Group","I2S Session",30,"",""],[695,12,4,6,"Elquds Group","I2S Session",30,"",""],[696,12,4,7,"Elquds Group","I2S Session",30,"",""],[697,12,4,8,"Elquds Group","I2S Session",30,"",""],[698,13,0,1,"Manaret Elbayan Group","I2S Session",11,"",""],[699,13,0,2,"Manaret Elbayan Group","I2S Session",11,"",""],[700,13,0,3,"Manaret Elbayan Group","I2S Session",11,"",""],[701,13,0,4,"Manaret Elbayan Group","I2S Session",11,"",""],[702,13,0,5,"Manaret Elbayan Group","I2S Session",11,"",""],[703,13,0,6,"Manaret Elbayan Group","I2S Session",11,"",""],[704,13,0,7,"Manaret Elbayan Group","I2S Session",11,"",""],[705,13,0,8,"Manaret Elbayan Group","I2S Session",11,"",""],[706,13,0,1,"Manaret Elbayan Group","I2S Session",15,"",""],[707,13,0,2,"Manaret Elbayan Group","I2S Session",15,"",""],[708,13,0,3,"Manaret Elbayan Group","I2S Session",15,"",""],[709,13,0,4,"Manaret Elbayan Group","I2S Session",15,"",""],[710,13,0,5,"Manaret Elbayan Group","I2S Session",15,"",""],[711,13,0,6,"Manaret Elbayan Group","I2S Session",15,"",""],[712,13,0,7,"Manaret Elbayan Group","I2S Session",15,"",""],[713,13,0,8,"Manaret Elbayan Group","I2S Session",15,"",""],[714,13,1,1,"Manaret Elbayan Group","I2S Session",11,"",""],[715,13,1,2,"Manaret Elbayan Group","I2S Session",11,"",""],[716,13,1,3,"Manaret Elbayan Group","I2S Session",11,"",""],[717,13,1,4,"Manaret Elbayan Group","I2S Session",11,"",""],[718,13,1,5,"Manaret Elbayan Group","I2S Session",11,"",""],[719,13,1,6,"Manaret Elbayan Group","I2S Session",11,"",""],[720,13,1,7,"Manaret Elbayan Group","I2S Session",11,"",""],[721,13,1,8,"Manaret Elbayan Group","I2S Session",11,"",""],[722,13,1,1,"Manaret Elbayan Group","I2S Session",15,"",""],[723,13,1,2,"Manaret Elbayan Group","I2S Session",15,"",""],[724,13,1,3,"Manaret Elbayan Group","I2S Session",15,"",""],[725,13,1,4,"Manaret Elbayan Group","I2S Session",15,"",""],[726,13,1,5,"Manaret Elbayan Group","I2S Session",15,"",""],[727,13,1,6,"Manaret Elbayan Group","I2S Session",15,"",""],[728,13,1,7,"Manaret Elbayan Group","I2S Session",15,"",""],[729,13,1,8,"Manaret Elbayan Group","I2S Session",15,"",""],[730,13,2,1,"Manaret Elbayan Group","I2S Session",11,"",""],[731,13,2,2,"Manaret Elbayan Group","I2S Session",11,"",""],[732,13,2,3,"Manaret Elbayan Group","I2S Session",11,"",""],[733,13,2,4,"Manaret Elbayan Group","I2S Session",11,"",""],[734,13,2,5,"Manaret Elbayan Group","I2S Session",11,"",""],[735,13,2,6,"Manaret Elbayan Group","I2S Session",11,"",""],[736,13,2,7,"Manaret Elbayan Group","I2S Session",11,"",""],[737,13,2,8,"Manaret Elbayan Group","I2S Session",11,"",""],[738,13,2,1,"Manaret Elbayan Group","I2S Session",15,"",""],[739,13,2,2,"Manaret Elbayan Group","I2S Session",15,"",""],[740,13,2,3,"Manaret Elbayan Group","I2S Session",15,"",""],[741,13,2,4,"Manaret Elbayan Group","I2S Session",15,"",""],[742,13,2,5,"Manaret Elbayan Group","I2S Session",15,"",""],[743,13,2,6,"Manaret Elbayan Group","I2S Session",15,"",""],[744,13,2,7,"Manaret Elbayan Group","I2S Session",15,"",""],[745,13,2,8,"Manaret Elbayan Group","I2S Session",15,"",""],[746,13,3,1,"Manaret Elbayan Group","I2S Session",11,"",""],[747,13,3,2,"Manaret Elbayan Group","I2S Session",11,"",""],[748,13,3,3,"Manaret Elbayan Group","I2S Session",11,"",""],[749,13,3,4,"Manaret Elbayan Group","I2S Session",11,"",""],[750,13,3,5,"Manaret Elbayan Group","I2S Session",11,"",""],[751,13,3,6,"Manaret Elbayan Group","I2S Session",11,"",""],[752,13,3,7,"Manaret Elbayan Group","I2S Session",11,"",""],[753,13,3,8,"Manaret Elbayan Group","I2S Session",11,"",""],[754,13,3,1,"Manaret Elbayan Group","I2S Session",15,"",""],[755,13,3,2,"Manaret Elbayan Group","I2S Session",15,"",""],[756,13,3,3,"Manaret Elbayan Group","I2S Session",15,"",""],[757,13,3,4,"Manaret Elbayan Group","I2S Session",15,"",""],[758,13,3,5,"Manaret Elbayan Group","I2S Session",15,"",""],[759,13,3,6,"Manaret Elbayan Group","I2S Session",15,"",""],[760,13,3,7,"Manaret Elbayan Group","I2S Session",15,"",""],[761,13,3,8,"Manaret Elbayan Group","I2S Session",15,"",""],[762,13,4,1,"Manaret Elbayan Group","I2S Session",11,"",""],[763,13,4,2,"Manaret Elbayan Group","I2S Session",11,"",""],[764,13,4,3,"Manaret Elbayan Group","I2S Session",11,"",""],[765,13,4,4,"Manaret Elbayan Group","I2S Session",11,"",""],[766,13,4,5,"Manaret Elbayan Group","I2S Session",11,"",""],[767,13,4,6,"Manaret Elbayan Group","I2S Session",11,"",""],[768,13,4,7,"Manaret Elbayan Group","I2S Session",11,"",""],[769,13,4,8,"Manaret Elbayan Group","I2S Session",11,"",""],[770,13,4,1,"Manaret Elbayan Group","I2S Session",15,"",""],[771,13,4,2,"Manaret Elbayan Group","I2S Session",15,"",""],[772,13,4,3,"Manaret Elbayan Group","I2S Session",15,"",""],[773,13,4,4,"Manaret Elbayan Group","I2S Session",15,"",""],[774,13,4,5,"Manaret Elbayan Group","I2S Session",15,"",""],[775,13,4,6,"Manaret Elbayan Group","I2S Session",15,"",""],[776,13,4,7,"Manaret Elbayan Group","I2S Session",15,"",""],[777,13,4,8,"Manaret Elbayan Group","I2S Session",15,"",""],[778,14,4,7,"Victoria Group","I2S Session",13,"",""],[779,14,4,8,"Victoria Group","I2S Session",13,"",""],[780,14,4,9,"Victoria Group","I2S Session",13,"",""],[781,14,4,10,"Victoria Group","I2S Session",13,"",""],[782,14,4,11,"Victoria Group","I2S Session",13,"",""],[783,14,4,12,"Victoria Group","I2S Session",13,"",""],[784,14,4,13,"Victoria Group","I2S Session",13,"",""],[785,14,4,11,"Victoria Group","I2S Session",24,"",""],[786,14,4,12,"Victoria Group","I2S Session",24,"",""],[787,14,4,13,"Victoria Group","I2S Session",24,"",""],[788,14,5,6,"Victoria Group","I2S Session",13,"",""],[789,14,5,7,"Victoria Group","I2S Session",13,"",""],[790,14,5,8,"Victoria Group","I2S Session",13,"",""],[791,14,5,9,"Victoria Group","I2S Session",13,"",""],[792,14,5,10,"Victoria Group","I2S Session",13,"",""],[793,14,5,12,"Victoria Group","I2S Session",13,"",""],[794,14,5,13,"Victoria Group","I2S Session",13,"",""],[795,14,6,8,"Victoria Group","I2S Session",13,"",""],[796,14,6,9,"Victoria Group","I2S Session",13,"",""],[797,14,6,10,"Victoria Group","I2S Session",13,"",""],[798,14,6,12,"Victoria Group","I2S Session",13,"",""],[799,14,6,13,"Victoria Group","I2S Session",13,"",""],[800,15,4,4,"Baverlly Hills Group","I2S Session",19,"",""],[801,15,4,5,"Baverlly Hills Group","I2S Session",19,"",""],[802,15,4,6,"Baverlly Hills Group","I2S Session",19,"",""],[803,15,4,7,"Baverlly Hills Group","I2S Session",19,"",""],[804,16,2,7,"Alpha Group","I2S Session",21,"",""],[805,16,2,8,"Alpha Group","I2S Session",21,"",""],[806,16,6,1,"Alpha Group","I2S Session",21,"",""],[807,16,6,2,"Alpha Group","I2S Session",21,"",""],[808,16,6,3,"Alpha Group","I2S Session",21,"",""],[809,16,6,4,"Alpha Group","I2S Session",21,"",""],[810,16,6,5,"Alpha Group","I2S Session",21,"",""],[811,16,6,6,"Alpha Group","I2S Session",21,"",""],[812,16,6,7,"Alpha Group","I2S Session",21,"",""],[813,16,6,8,"Alpha Group","I2S Session",21,"",""],[814,17,0,1,"Al Bayan Group","I2S Session",23,"",""],[815,17,0,2,"Al Bayan Group","I2S Session",23,"",""],[816,17,0,3,"Al Bayan Group","I2S Session",23,"",""],[817,17,0,4,"Al Bayan Group","I2S Session",23,"",""],[818,17,0,5,"Al Bayan Group","I2S Session",23,"",""],[819,17,0,6,"Al Bayan Group","I2S Session",23,"",""],[820,17,0,7,"Al Bayan Group","I2S Session",23,"",""],[821,17,0,8,"Al Bayan Group","I2S Session",23,"",""],[822,18,2,9,"TDS Group","Partnerships Session",23,"",""],[823,18,2,10,"TDS Group","Partnerships Session",23,"",""],[824,19,0,1,"Cardiff Group","I2S Session",27,"",""],[825,19,0,2,"Cardiff Group","I2S Session",27,"",""],[826,19,0,3,"Cardiff Group","I2S Session",27,"",""],[827,19,0,4,"Cardiff Group","I2S Session",27,"",""],[828,19,0,5,"Cardiff Group","I2S Session",27,"",""],[829,19,0,6,"Cardiff Group","I2S Session",27,"",""],[830,19,0,7,"Cardiff Group","I2S Session",27,"",""],[831,19,0,8,"Cardiff Group","I2S Session",27,"",""],[832,19,0,1,"Cardiff Group","I2S Session",28,"",""],[833,19,0,2,"Cardiff Group","I2S Session",28,"",""],[834,19,0,3,"Cardiff Group","I2S Session",28,"",""],[835,19,0,4,"Cardiff Group","I2S Session",28,"",""],[836,19,0,5,"Cardiff Group","I2S Session",28,"",""],[837,19,0,6,"Cardiff Group","I2S Session",28,"",""],[838,19,0,7,"Cardiff Group","I2S Session",28,"",""],[839,19,0,8,"Cardiff Group","I2S Session",28,"",""],[840,19,1,1,"Cardiff Group","I2S Session",27,"",""],[841,19,1,2,"Cardiff Group","I2S Session",27,"",""],[842,19,1,3,"Cardiff Group","I2S Session",27,"",""],[843,19,1,4,"Cardiff Group","I2S Session",27,"",""],[844,19,1,5,"Cardiff Group","I2S Session",27,"",""],[845,19,1,6,"Cardiff Group","I2S Session",27,"",""],[846,19,1,7,"Cardiff Group","I2S Session",27,"",""],[847,19,1,8,"Cardiff Group","I2S Session",27,"",""],[848,19,1,1,"Cardiff Group","I2S Session",28,"",""],[849,19,1,2,"Cardiff Group","I2S Session",28,"",""],[850,19,1,3,"Cardiff Group","I2S Session",28,"",""],[851,19,1,4,"Cardiff Group","I2S Session",28,"",""],[852,19,1,5,"Cardiff Group","I2S Session",28,"",""],[853,19,1,6,"Cardiff Group","I2S Session",28,"",""],[854,19,1,7,"Cardiff Group","I2S Session",28,"",""],[855,19,1,8,"Cardiff Group","I2S Session",28,"",""],[856,19,2,1,"Cardiff Group","I2S Session",27,"",""],[857,19,2,2,"Cardiff Group","I2S Session",27,"",""],[858,19,2,3,"Cardiff Group","I2S Session",27,"",""],[859,19,2,4,"Cardiff Group","I2S Session",27,"",""],[860,19,2,5,"Cardiff Group","I2S Session",27,"",""],[861,19,2,6,"Cardiff Group","I2S Session",27,"",""],[862,19,2,7,"Cardiff Group","I2S Session",27,"",""],[863,19,2,8,"Cardiff Group","I2S Session",27,"",""],[864,19,2,1,"Cardiff Group","I2S Session",28,"",""],[865,19,2,2,"Cardiff Group","I2S Session",28,"",""],[866,19,2,3,"Cardiff Group","I2S Session",28,"",""],[867,19,2,4,"Cardiff Group","I2S Session",28,"",""],[868,19,2,5,"Cardiff Group","I2S Session",28,"",""],[869,19,2,6,"Cardiff Group","I2S Session",28,"",""],[870,19,2,7,"Cardiff Group","I2S Session",28,"",""],[871,19,2,8,"Cardiff Group","I2S Session",28,"",""],[872,19,3,1,"Cardiff Group","I2S Session",27,"",""],[873,19,3,2,"Cardiff Group","I2S Session",27,"",""],[874,19,3,3,"Cardiff Group","I2S Session",27,"",""],[875,19,3,4,"Cardiff Group","I2S Session",27,"",""],[876,19,3,5,"Cardiff Group","I2S Session",27,"",""],[877,19,3,6,"Cardiff Group","I2S Session",27,"",""],[878,19,3,7,"Cardiff Group","I2S Session",27,"",""],[879,19,3,8,"Cardiff Group","I2S Session",27,"",""],[880,19,3,1,"Cardiff Group","I2S Session",28,"",""],[881,19,3,2,"Cardiff Group","I2S Session",28,"",""],[882,19,3,3,"Cardiff Group","I2S Session",28,"",""],[883,19,3,4,"Cardiff Group","I2S Session",28,"",""],[884,19,3,5,"Cardiff Group","I2S Session",28,"",""],[885,19,3,6,"Cardiff Group","I2S Session",28,"",""],[886,19,3,7,"Cardiff Group","I2S Session",28,"",""],[887,19,3,8,"Cardiff Group","I2S Session",28,"",""],[888,19,4,1,"Cardiff Group","I2S Session",27,"",""],[889,19,4,2,"Cardiff Group","I2S Session",27,"",""],[890,19,4,3,"Cardiff Group","I2S Session",27,"",""],[891,19,4,4,"Cardiff Group","I2S Session",27,"",""],[892,19,4,5,"Cardiff Group","I2S Session",27,"",""],[893,19,4,6,"Cardiff Group","I2S Session",27,"",""],[894,19,4,7,"Cardiff Group","I2S Session",27,"",""],[895,19,4,8,"Cardiff Group","I2S Session",27,"",""],[896,19,4,1,"Cardiff Group","I2S Session",28,"",""],[897,19,4,2,"Cardiff Group","I2S Session",28,"",""],[898,19,4,3,"Cardiff Group","I2S Session",28,"",""],[899,19,4,4,"Cardiff Group","I2S Session",28,"",""],[900,19,4,5,"Cardiff Group","I2S Session",28,"",""],[901,19,4,6,"Cardiff Group","I2S Session",28,"",""],[902,19,4,7,"Cardiff Group","I2S Session",28,"",""],[903,19,4,8,"Cardiff Group","I2S Session",28,"",""]];

function setRowsBatch(sh, rows, startRow) {
  if (!rows || rows.length === 0) return;
  try {
    const range = sh.getRange(startRow, 1, rows.length, rows[0].length);
    if (range && typeof range.setValues === "function") {
      range.setValues(rows);
      return;
    }
  } catch (e) {}
  rows.forEach(r => sh.appendRow(r));
}

function seedAllSchools(ss, force) {
  const schSheet = getOrCreateSheet(ss, "schools", TABS.schools);
  const rows = readTable(ss, "schools");
  if (force || rows.length <= 1) {
    if (schSheet.getLastRow() > 1) {
      schSheet.getRange(2, 1, schSheet.getLastRow() - 1, schSheet.getLastColumn()).clearContent();
    }
    setRowsBatch(schSheet, SEED_SCHOOLS_DATA, 2);
  }
}

function seedAllTemplateSessions(ss, force) {
  const tplSheet = getOrCreateSheet(ss, "template_sessions", TABS.template_sessions);
  const rows = readTable(ss, "template_sessions");
  if (force || rows.length <= 1) {
    if (tplSheet.getLastRow() > 1) {
      tplSheet.getRange(2, 1, tplSheet.getLastRow() - 1, tplSheet.getLastColumn()).clearContent();
    }
    const chunkSize = 400;
    for (let i = 0; i < SEED_SESSIONS_DATA.length; i += chunkSize) {
      const chunk = SEED_SESSIONS_DATA.slice(i, i + chunkSize);
      setRowsBatch(tplSheet, chunk, 2 + i);
    }
  }
}

function seedFullDatabase(ss, force) {
  const rfSheet = ss.getSheetByName("report_fields");
  if (force || rfSheet.getLastRow() <= 1) {
    if (rfSheet.getLastRow() > 1) {
      rfSheet.getRange(2, 1, rfSheet.getLastRow() - 1, rfSheet.getLastColumn()).clearContent();
    }
    const defFields = [
      [1, "Sessions delivered", "number", "", 1],
      [2, "Students present", "number", "", 2],
      [3, "Topics covered", "long", "", 3],
      [4, "All tutors on time?", "yesno", "", 4],
      [5, "Problems or issues", "long", "", 5],
      [6, "Overall day rating", "choice", "Excellent,Good,Fair,Poor", 6],
      [7, "Follow-up needed", "long", "", 7]
    ];
    defFields.forEach(r => rfSheet.appendRow(r));
  }

  const memSheet = ss.getSheetByName("members");
  if (memSheet.getLastRow() <= 1) {
    const ownerEmail = (typeof Session !== "undefined" && Session.getActiveUser ? Session.getActiveUser().getEmail() : "") || "ziadmohamedsalah63@gmail.com";
    memSheet.appendRow([1, ownerEmail.toLowerCase().trim(), "Ziad Mohamed Salah", "admin", 1, "", "", new Date().toISOString(), "zizoms_2511"]);
  }

  seedAllTutors(ss, force);
  seedAllSchools(ss, force);
  seedAllTemplateSessions(ss, force);
}

const SEED_TUTORS_DATA = [
  [1, "Mawada Arafat Radwan", 0, "T-7753", "10978565", "mawada731arafat@gmail.com", "Dakahlia", "English", "Tuesday, Wednesday", "Full Time", "10/1/2025", "Mansoura"],
  [2, "Maymounah Abdulazeem", 0, "T-11668", "108212855", "maymounahabdulazeem@gmail.com", "Giza", "Arabic", "Saturday, Friday", "Full Time", "9/1/2025", "Faisal"],
  [3, "Ghadeer Mamdouh", 0, "T-11625", "1099597153", "ghadeermamdouh49@gmail.com", "Sohag", "Arabic", "Wednesday, Thursday", "Full Time", "9/20/2025", "Sohag"],
  [4, "Alaa Moustafa Hassen Mohamed", 0, "T-12339", "1022886806", "alaamoustafa511@gmail.com", "Gharbia", "Arabic", "Wednesday, Thursday", "Full Time", "10/20/2025", "Tanta"],
  [5, "Menna-Tullah Mohsen Ali", 0, "T-11873", "1092028171", "mennaaboelewa@gmail.com", "Behira", "Arabic", "Thursday, Friday", "Full Time", "10/12/2025", "Kom hamada"],
  [6, "Fatma Hussein Ali", 0, "T-11666", "1206898485", "fattmahusseinn@gmail.com", "Qalubiya", "Arabic", "Saturday, Friday", "Full Time", "9/17/2025", "Benha"],
  [7, "Rana Fathy AbdElmeneim", 0, "T-11596", "1202400415", "ranafathey2003@gmail.com", "Alexandria", "Arabic", "Thursday, Friday", "Full Time", "8/3/2025", "Smouha"],
  [8, "Mohamed Ahmed Abdel Fattah Abdel Hamid", 0, "T-11616", "1110142579", "mohamedahmedx831@gmail.com", "Alexandria", "Arabic", "Saturday, Friday", "Full Time", "8/27/2025", "el seyouf"],
  [9, "Somaya Saeed Abdullah", 0, "T-11380", "1283633422", "somayasaeid75@gmail.com", "Alexandria", "Arabic", "Wednesday, Thursday", "Full Time", "8/20/2025", "Alexandria"],
  [10, "Manar Ashraf Rashed", 0, "T-9237", "1204098508", "manar.ashraf000@gmail.com", "Alexandria", "English", "Saturday, Friday", "Full Time", "6/1/2025", "Miami, Alexandria"],
  [11, "Naira Osama Lotfy Ibrahim", 0, "T-11729", "1154132034", "nairaosamaa6@gmail.com", "Qalubiya", "Arabic", "Sunday, Thursday", "Full Time", "9/28/2025", "Al-Qanater Al Khayriya"],
  [12, "Nourhan Abdelghany Mohamed", 0, "T-11610", "1017370541", "mnourhan4526@gmail.com", "Alexandria", "Arabic", "Saturday, Friday", "Full Time", "8/27/2025", "أبوقير"],
  [13, "Salma Basem Mahmoud", 0, "T-11589", "1119766119", "salma1basem@gmail.com", "Cairo", "Arabic", "Wednesday, Thursday", "Full Time", "9/17/2025", "Helwan,Cairo"],
  [14, "Asmaa hamdallah Soliman", 0, "T-12503", "1061815945", "asmaelhawy93@gmail.com", "Assuit", "Arabic", "Wednesday, Thursday", "Full Time", "11/3/2025", "Sohag"],
  [15, "Hagar Ahmed Mahmoud", 0, "T-11609", "1094039861", "hagarrayan123@gmail.com", "Cairo", "Arabic", "Thursday, Friday", "Full Time", "8/27/2025", "Cairo, ElsherokCity"],
  [16, "Wesam Muhamed Hamdalla", 0, "T-12514", "1080138381", "whamdalla7@gmail.com", "Assuit", "Arabic", "Wednesday, Thursday", "Full Time", "11/3/2025", "city street - asyut"],
  [17, "Laila Ebrahim", 0, "T-11676", "1063858975", "lailaebrahimtawfik@gmail.com", "Dakahlia", "English", "Thursday, Friday", "Full Time", "9/16/2025", "Sidi Beshr"],
  [18, "Radwa Alaa Samy", 0, "T-11594", "1026567754", "alaaradwa987@gmail.com", "Giza", "Arabic", "Saturday, Friday", "Full Time", "9/17/2025", "6 October City"],
  [19, "Mohamed Elsayed Tohamy", 0, "T-11577", "1061258725", "Mohammeedelsayeed08@gmail.com", "Cairo", "English", "Saturday, Friday", "Full Time", "9/10/2025", "المطريه"],
  [20, "Seif eldin Ahmed diaa", 0, "T-12500", "1154424358", "seifeldin.zakaria@ejust.edu.eg", "Alexandria", "Arabic", "Saturday, Friday", "Full Time", "10/21/2025", "Alexandria"],
  [21, "Aalaa Alaa Ashour", 0, "T-10313", "1101318891", "alaaalaaashour1507@gmail.com", "Qalubiya", "English", "Saturday, Friday", "Full Time", "10/1/2025", "Shubra El-Kheima"],
  [22, "Ahmed Mohamed Khalil", 0, "T-11587", "0 127 899 9858", "ahmedmohamedkhalil201018@gmail.com", "Alexandria", "Arabic", "Saturday, Friday", "Full Time", "9/17/2025", "Moharem bek"],
  [23, "Shehab Mohamed Abdo", 0, "T-12536", "1111697089", "shehababdo89@gmail.com", "Cairo", "English", "Thursday, Friday", "Full Time", "11/1/2025", "Badr-Elshorouk"],
  [24, "Mahmoud Ibrahim", 0, "T-11721", "1141570077", "midomohamed1543@gmail.com", "Alexandria", "Arabic", "Thursday, Friday", "Full Time", "10/27/2025", "سموحة , سيدي جابر , الاسكندرية"],
  [25, "Yassin Gamal Mohammed El-Hassan", 0, "T-12504", "1129693575", "eng.yassin.sultan@gmail.com", "Sohag", "Arabic", "Wednesday, Thursday", "Full Time", "11/2/2025", "Sohag"],
  [26, "Ahmed Safy", 0, "T-26732", "1017565609", "ahmedsafy2906@gmail.com", "Giza", "English", "Saturday, Friday", "Full Time", "10/18/2026", "الوراق"],
  [27, "Esraa Gomaa Ibrahim Ebead", 0, "T-19422", "1014032179", "esrgom972001@gmail.com", "Cairo", "English", "Saturday, Friday", "Full Time", "10/18/2026", "Badr"],
  [28, "Aalaa Ahmad", 0, "T-26729", "1039347948", "alaasalama35111@gmail.com", "Monofya", "English", "Saturday, Friday", "Full Time", "9/20/2026", "Birket Al Sab'"],
  [29, "Yasmeen Yasser Mohamed", 0, "T-11725", "01097734891", "yasmeenyasser611@gmail.com", "Cairo", "Arabic", "Tuesday, Wednesday", "Full Time", "9/28/2025", "Ain shams"],
  [30, "Kyrollos Essam Talaat Ghali", 0, "T-2070", "1229105812", "kyrollose@gmail.com", "Alexandria", "English", "Saturday, Friday", "Full Time", "10/18/2026", "Ganaklis"]
];

function seedAllTutors(ss, force) {
  const tutSheet = getOrCreateSheet(ss, "tutors", TABS.tutors);
  const rows = readTable(ss, "tutors");
  const hasOldDummy = rows.some(r => r.name === "Omar Hassan" || r.name === "Nada Ali" || r.name === "Hana Mostafa");
  if (force || rows.length <= 1 || hasOldDummy) {
    if (tutSheet.getLastRow() > 1) {
      tutSheet.getRange(2, 1, tutSheet.getLastRow() - 1, tutSheet.getLastColumn()).clearContent();
    }
    SEED_TUTORS_DATA.forEach(r => {
      tutSheet.appendRow(r);
    });
  }
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("Mentor Hub")
      .addItem("⚡ Initialize & Setup Complete Database", "menuSetupFullDatabase")
      .addItem("🚀 Sync All 30 Tutors", "menuSeedAllTutors")
      .addItem("🏫 Sync All 19 Schools & Schedules", "menuSeedAllSchoolsAndSchedules")
      .addToUi();
  } catch (e) {}
}

function menuSetupFullDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupDatabase();
  seedFullDatabase(ss, true);
  try {
    SpreadsheetApp.getUi().alert("✅ Successfully updated all database tables (30 Tutors, 19 Schools, 903 Template Sessions, Members & Report Fields) in this spreadsheet!");
  } catch (e) {}
}

function menuSeedAllTutors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  seedAllTutors(ss, true);
  try {
    SpreadsheetApp.getUi().alert("✅ Successfully updated 'tutors' sheet with all 30 full-timer tutors!");
  } catch (e) {}
}

function menuSeedAllSchoolsAndSchedules() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  seedAllSchools(ss, true);
  seedAllTemplateSessions(ss, true);
  try {
    SpreadsheetApp.getUi().alert("✅ Successfully updated all 19 Schools and 903 Template Sessions!");
  } catch (e) {}
}

function readTable(ss, name) {
  const sh = getOrCreateSheet(ss, name, TABS[name]);
  const vals = sh.getDataRange().getDisplayValues();
  if (vals.length <= 1) return [];
  const headers = vals[0];
  return vals.slice(1).map((row, idx) => {
    const obj = { _row: idx + 2 };
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });
}

function nextId(rows) {
  return rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
}

function resolveAuthUser(ss, body) {
  const token = String(body.idToken || "").trim();
  if (!token) return null;
  if (token.startsWith("tok:")) {
    const parts = token.split(":");
    const id = Number(parts[1]);
    const email = (parts[2] || "").toLowerCase().trim();
    return { id, email, tokenAuth: true };
  }
  if (token.startsWith("dev:")) {
    const [, email, name, role] = token.split(":");
    return { email: (email || "admin@ischool.com").toLowerCase(), name: name || "Admin", sub: "dev-" + email, role: role || "admin" };
  }
  return verifyGoogleToken(token);
}

function verifyGoogleToken(idToken) {
  if (!idToken) return null;
  const res = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken), {
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return null;
  const payload = JSON.parse(res.getContentText());
  if (!payload || !payload.email || payload.email_verified === "false") return null;
  return {
    email: String(payload.email).toLowerCase().trim(),
    name: payload.name || payload.email,
    sub: payload.sub || ""
  };
}

function hasSchoolAccess(ss, caller, schoolId, onDate) {
  if (caller.role === "admin") return true;
  const schools = readTable(ss, "schools");
  const sch = schools.find(s => Number(s.id) === Number(schoolId));
  if (sch && Number(sch.owner_id) === Number(caller.id)) return true;

  const reqs = readTable(ss, "access_requests");
  return reqs.some(r => {
    if (r.status !== "approved" || Number(r.requester_id) !== Number(caller.id)) return false;
    if (onDate < r.from_date || onDate > r.until_date) return false;
    let ids = [];
    try {
      ids = JSON.parse(r.schools_json || "[]");
    } catch (e) {}
    return ids.map(Number).includes(Number(schoolId));
  });
}

function masterRequestStatus(r) {
  if (r.admin_decision === "approved") return "approved";
  let ap = {};
  try {
    ap = JSON.parse(r.approvals_json || "{}");
  } catch (e) {}
  const vals = Object.values(ap);
  if (r.admin_decision === "declined" || vals.includes("declined")) return "declined";
  if (vals.every(v => v === "approved")) return "approved";
  return "pending";
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return jsonResponse({ ok: true, service: "iSchool Mentor Hub Google Sheets DB", today: cairoToday() });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = body.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "ping") {
      return jsonResponse({ ok: true, now: new Date().toISOString() });
    }

    if (action === "login_password") {
      const email = String(body.email || "").toLowerCase().trim();
      const pass = String(body.password || "");
      const memSheet = getOrCreateSheet(ss, "members", TABS.members);
      let members = readTable(ss, "members");

      const MASTER_EMAIL = "ziadmohamedsalah63@gmail.com";
      const MASTER_PASS = "zizoms_2511";

      const isMasterAdmin = (
        (email === MASTER_EMAIL || email === "zaidmohamedsalah63@gmail.com" || email === "admin" || email === "ziad" || email === "zaid") &&
        (pass === MASTER_PASS)
      );

      if (isMasterAdmin) {
        let masterRow = members.find(m => String(m.email).toLowerCase().trim() === MASTER_EMAIL);
        if (!masterRow) {
          const now = new Date().toISOString();
          const newId = nextId(members);
          memSheet.appendRow([newId, MASTER_EMAIL, "Ziad Mohamed Salah", "admin", 1, "", now, now, MASTER_PASS]);
          members = readTable(ss, "members");
          masterRow = members.find(m => String(m.email).toLowerCase().trim() === MASTER_EMAIL);
        } else {
          if (masterRow.role !== "admin" || Number(masterRow.active) !== 1) {
            memSheet.getRange(masterRow._row, 4).setValue("admin");
            memSheet.getRange(masterRow._row, 5).setValue(1);
          }
        }
        const token = "tok:" + masterRow.id + ":" + MASTER_EMAIL + ":" + Date.now();
        const user = {
          id: Number(masterRow.id),
          email: MASTER_EMAIL,
          name: masterRow.name || "Ziad Mohamed Salah",
          role: "admin",
          active: true
        };
        return jsonResponse({ ok: true, data: { token, user } });
      }

      const matches = members.filter(m => String(m.email).toLowerCase().trim() === email);
      if (matches.length > 1) {
        return jsonResponse({ ok: false, error: "This email is duplicated in the members sheet. Ask the admin to remove the duplicate row." });
      }
      const row = matches[0];
      if (!row || Number(row.active) !== 1) {
        return jsonResponse({ ok: false, error: "Invalid credentials or account is not active.", code: "NOT_AUTHORIZED" });
      }
      const storedPass = String(row.password || "").trim();
      if (!storedPass) {
        return jsonResponse({
          ok: true,
          data: {
            needs_setup: true,
            id: Number(row.id),
            name: row.name,
            email: row.email
          }
        });
      }
      if (storedPass !== pass) {
        return jsonResponse({ ok: false, error: "Invalid email or password.", code: "INVALID_CREDENTIALS" });
      }
      const token = "tok:" + row.id + ":" + row.email + ":" + Date.now();
      const user = {
        id: Number(row.id),
        email: row.email,
        name: row.name,
        role: row.role,
        active: true
      };
      return jsonResponse({ ok: true, data: { token, user } });
    }

    if (action === "set_member_password") {
      const email = String(body.email || "").toLowerCase().trim();
      const newPassword = String(body.password || "").trim();
      if (!email || !newPassword || newPassword.length < 6) {
        return jsonResponse({ ok: false, error: "Password must be at least 6 characters." });
      }
      const memSheet = getOrCreateSheet(ss, "members", TABS.members);
      let members = readTable(ss, "members");
      const row = members.find(m => String(m.email).toLowerCase().trim() === email && Number(m.active) === 1);
      if (!row) {
        return jsonResponse({ ok: false, error: "Account not found or inactive." });
      }
      // SECURITY: first-time setup is allowed ONLY while no password exists yet.
      // Once set, the password can only be cleared by an admin ("Reset password").
      if (String(row.password || "").trim()) {
        return jsonResponse({
          ok: false,
          code: "PASSWORD_ALREADY_SET",
          error: "Password is already set for this account. Ask the admin to reset it if you forgot it."
        });
      }
      memSheet.getRange(row._row, 9).setValue(newPassword);
      row.password = newPassword;

      const token = "tok:" + row.id + ":" + row.email + ":" + Date.now();
      const user = {
        id: Number(row.id),
        email: row.email,
        name: row.name,
        role: row.role,
        active: true
      };
      return jsonResponse({ ok: true, data: { token, user } });
    }

    const authUser = resolveAuthUser(ss, body);
    if (!authUser) {
      return jsonResponse({ ok: false, error: "Invalid or expired sign-in token.", code: "UNAUTHENTICATED" });
    }

    const memSheet = getOrCreateSheet(ss, "members", TABS.members);
    let members = readTable(ss, "members");

    if (members.length === 0) {
      const now = new Date().toISOString();
      memSheet.appendRow([1, authUser.email, authUser.name || "Admin", "admin", 1, authUser.sub || "", now, now, ""]);
      members = readTable(ss, "members");
    }

    let callerRow = null;
    if (authUser.tokenAuth && authUser.id) {
      callerRow = members.find(m => Number(m.id) === Number(authUser.id) && Number(m.active) === 1);
    }
    if (!callerRow) {
      callerRow = members.find(m => String(m.email).toLowerCase().trim() === authUser.email && Number(m.active) === 1);
    }

    if (!callerRow) {
      return jsonResponse({
        ok: false,
        code: "NOT_AUTHORIZED",
        email: authUser.email,
        error: "Your account (" + authUser.email + ") is not on the active members allowlist."
      });
    }

    if (authUser.sub && (!callerRow.google_sub || action === "claim_membership")) {
      const now = new Date().toISOString();
      memSheet.getRange(callerRow._row, 6).setValue(authUser.sub);
      memSheet.getRange(callerRow._row, 7).setValue(now);
      callerRow.google_sub = authUser.sub;
      callerRow.last_login_at = now;
    }

    const caller = {
      id: Number(callerRow.id),
      email: callerRow.email,
      name: callerRow.name,
      role: callerRow.role,
      active: Number(callerRow.active) === 1,
      auth_user_id: callerRow.google_sub || null
    };

    if (action === "claim_membership") {
      return jsonResponse({ ok: true, data: caller });
    }

    if (action === "sync_sheet_tutors") {
      seedAllTutors(ss, true);
      return jsonResponse({ ok: true, message: "All 30 tutors populated into sheet successfully" });
    }

    if (action === "load_bootstrap") {
      let rawTutors = readTable(ss, "tutors");
      if (rawTutors.length <= 1 || rawTutors.some(t => t.name === "Omar Hassan" || t.name === "Nada Ali" || t.name === "Hana Mostafa")) {
        seedAllTutors(ss, true);
        rawTutors = readTable(ss, "tutors");
      }
      const allMembers = readTable(ss, "members").map(m => ({
        id: Number(m.id),
        email: m.email,
        name: m.name,
        role: m.role,
        active: Number(m.active) === 1,
        auth_user_id: m.google_sub || null
      }));
      const tutors = rawTutors.map(t => ({
        id: Number(t.id),
        name: t.name,
        code: t.code || `T-${t.id}`,
        phone: t.phone || "",
        email: t.email || "",
        governorate: t.governorate || "",
        language: t.language || "Arabic",
        vacation_days: t.vacation_days || "",
        employment_type: t.employment_type || "Full Time",
        start_date: t.start_date || "",
        area: t.area || "",
        archived: Number(t.archived) === 1
      }));
      const schools = readTable(ss, "schools").map(s => ({
        id: Number(s.id),
        name: s.name,
        owner_id: Number(s.owner_id)
      }));
      const template_sessions = readTable(ss, "template_sessions").map(ts => ({
        id: Number(ts.id),
        school_id: Number(ts.school_id),
        weekday: Number(ts.weekday),
        slot: Number(ts.slot),
        class_name: ts.class_name,
        topic: ts.topic,
        tutor_id: ts.tutor_id === "" || ts.tutor_id === "0" ? null : Number(ts.tutor_id),
        effective_from: ts.effective_from || "",
        effective_until: ts.effective_until || ""
      }));
      const report_fields = readTable(ss, "report_fields")
        .map(rf => ({
          id: Number(rf.id),
          label: rf.label,
          field_type: rf.field_type,
          options: rf.options || "",
          sort_order: Number(rf.sort_order) || 0
        }))
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

      const access_requests = readTable(ss, "access_requests")
        .map(r => {
          let sch = [];
          try {
            sch = JSON.parse(r.schools_json || "[]").map(Number);
          } catch (err) {}
          return {
            id: Number(r.id),
            requester_id: Number(r.requester_id),
            owner_id: r.owner_id === "" || r.owner_id === "0" ? null : Number(r.owner_id),
            from_date: r.from_date,
            until_date: r.until_date,
            status: r.status,
            school_ids: sch
          };
        })
        .filter(r => caller.role === "admin" || r.requester_id === caller.id || r.owner_id === caller.id);

      const master_report_requests = readTable(ss, "master_report_requests")
        .map(mr => {
          let ap = {};
          try {
            ap = JSON.parse(mr.approvals_json || "{}");
          } catch (err) {}
          return {
            id: Number(mr.id),
            requester_id: Number(mr.requester_id),
            from_date: mr.from_date,
            to_date: mr.to_date,
            admin_decision: mr.admin_decision || null,
            approvals: ap
          };
        })
        .filter(mr => caller.role === "admin" || mr.requester_id === caller.id || mr.approvals[caller.id] !== undefined);

      const notifications = readTable(ss, "notifications")
        .filter(n => Number(n.recipient_id) === caller.id || (caller.role === "admin" && Number(n.recipient_id) === 0))
        .map(n => ({
          id: Number(n.id),
          recipient_id: Number(n.recipient_id),
          message: n.message,
          is_read: Number(n.is_read) === 1,
          created_at: n.created_at
        }));

      return jsonResponse({
        ok: true,
        data: {
          me: caller,
          members: allMembers,
          tutors,
          schools,
          template_sessions,
          report_fields,
          access_requests,
          master_report_requests,
          notifications
        }
      });
    }

    if (action === "mark_notifications_read") {
      const sh = getOrCreateSheet(ss, "notifications", TABS.notifications);
      const rows = readTable(ss, "notifications");
      rows.forEach(n => {
        if (Number(n.recipient_id) === caller.id || (caller.role === "admin" && Number(n.recipient_id) === 0)) {
          sh.getRange(n._row, 4).setValue(1);
        }
      });
      return jsonResponse({ ok: true });
    }

    if (action === "load_day") {
      const date = String(body.date || cairoToday());
      const overrides = readTable(ss, "session_overrides")
        .filter(o => o.on_date === date)
        .map(o => ({
          session_id: Number(o.session_id),
          on_date: o.on_date,
          tutor_overridden: Number(o.tutor_overridden) === 1,
          tutor_id: o.tutor_id === "" || o.tutor_id === "0" ? null : Number(o.tutor_id),
          cancelled: Number(o.cancelled) === 1
        }));

      const reports = readTable(ss, "school_reports")
        .filter(sr => sr.report_date === date && hasSchoolAccess(ss, caller, Number(sr.school_id), date))
        .map(sr => {
          let ans = {};
          try {
            ans = JSON.parse(sr.answers_json || "{}");
          } catch (err) {}
          return {
            school_id: Number(sr.school_id),
            report_date: sr.report_date,
            author_id: Number(sr.author_id),
            answers: ans
          };
        });

      const summaries = readTable(ss, "daily_summaries")
        .filter(ds => ds.report_date === date && (caller.role === "admin" || Number(ds.member_id) === caller.id))
        .map(ds => ({
          member_id: Number(ds.member_id),
          report_date: ds.report_date,
          note: ds.note || "",
          submitted_at: ds.submitted_at || null
        }));

      return jsonResponse({ ok: true, data: { date, overrides, reports, summaries } });
    }

    if (action === "add_member") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const email = String(body.email || "").toLowerCase().trim();
      const name = String(body.name || "").trim();
      const role = body.role === "admin" ? "admin" : "mentor";
      if (!email || !name) return jsonResponse({ ok: false, error: "Enter name and Google email." });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse({ ok: false, error: "Enter a valid email address." });
      }
      const normName = s => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
      if (members.some(m => String(m.email).toLowerCase().trim() === email)) {
        return jsonResponse({ ok: false, code: "DUPLICATE_EMAIL", error: "That email is already registered." });
      }
      if (members.some(m => normName(m.name) === normName(name))) {
        return jsonResponse({ ok: false, code: "DUPLICATE_NAME", error: "A member with this name already exists." });
      }
      const id = nextId(members);
      // New member starts with empty password -> prompted to create it on first login (one time only)
      memSheet.appendRow([id, email, name, role, 1, "", "", new Date().toISOString(), ""]);
      sendAppNotification(ss, id, "Welcome to iSchool Mentor Hub! Your account has been activated.", "Welcome to iSchool Mentor Hub");
      return jsonResponse({ ok: true, data: { id, email, name, role, active: true, auth_user_id: null } });
    }

    if (action === "reset_member_password") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const target = members.find(m => Number(m.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Member not found" });
      memSheet.getRange(target._row, 9).setValue("");
      return jsonResponse({ ok: true });
    }

    if (action === "update_member") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const target = members.find(m => Number(m.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Member not found" });

      const newRole = body.role !== undefined ? body.role : target.role;
      const newActive = body.active !== undefined ? (body.active ? 1 : 0) : Number(target.active);

      if (target.role === "admin" && Number(target.active) === 1 && (newRole !== "admin" || newActive === 0)) {
        const otherAdmins = members.filter(m => m.role === "admin" && Number(m.active) === 1 && Number(m.id) !== Number(target.id));
        if (otherAdmins.length === 0) {
          return jsonResponse({ ok: false, error: "Cannot remove or disable the last active admin" });
        }
      }
      memSheet.getRange(target._row, 4).setValue(newRole);
      memSheet.getRange(target._row, 5).setValue(newActive);
      return jsonResponse({ ok: true });
    }

    if (action === "add_tutor") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "tutors", TABS.tutors);
      const rows = readTable(ss, "tutors");
      const id = nextId(rows);
      const name = String(body.name || "").trim();
      const code = String(body.code || `T-${id}`).trim();
      const phone = String(body.phone || "").trim();
      const email = String(body.email || "").trim();
      const gov = String(body.governorate || "").trim();
      const lang = String(body.language || "Arabic").trim();
      const vac = String(body.vacation_days || "Friday, Saturday").trim();
      const emp = String(body.employment_type || "Full Time").trim();
      const sdate = String(body.start_date || "").trim();
      const area = String(body.area || "").trim();
      sh.appendRow([id, name, 0, code, phone, email, gov, lang, vac, emp, sdate, area]);
      return jsonResponse({ ok: true, data: { id, name, code, archived: false } });
    }

    if (action === "update_tutor") {
      const sh = getOrCreateSheet(ss, "tutors", TABS.tutors);
      const rows = readTable(ss, "tutors");
      const target = rows.find(t => Number(t.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Tutor not found" });
      if (body.name !== undefined) sh.getRange(target._row, 2).setValue(String(body.name).trim());
      if (body.code !== undefined) sh.getRange(target._row, 4).setValue(String(body.code).trim());
      if (body.phone !== undefined) sh.getRange(target._row, 5).setValue(String(body.phone).trim());
      if (body.email !== undefined) sh.getRange(target._row, 6).setValue(String(body.email).trim());
      if (body.governorate !== undefined) sh.getRange(target._row, 7).setValue(String(body.governorate).trim());
      if (body.language !== undefined) sh.getRange(target._row, 8).setValue(String(body.language).trim());
      if (body.vacation_days !== undefined) sh.getRange(target._row, 9).setValue(String(body.vacation_days).trim());
      return jsonResponse({ ok: true, data: { id: Number(target.id) } });
    }

    if (action === "toggle_tutor") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "tutors", TABS.tutors);
      const rows = readTable(ss, "tutors");
      const target = rows.find(t => Number(t.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Tutor not found" });
      const nextAr = Number(target.archived) === 1 ? 0 : 1;
      sh.getRange(target._row, 3).setValue(nextAr);
      return jsonResponse({ ok: true, data: { id: Number(target.id), archived: nextAr === 1 } });
    }

    if (action === "add_school") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "schools", TABS.schools);
      const rows = readTable(ss, "schools");
      const id = nextId(rows);
      const name = String(body.name || "").trim();
      const owner_id = Number(body.owner_id);
      sh.appendRow([id, name, owner_id]);
      return jsonResponse({ ok: true, data: { id, name, owner_id } });
    }

    if (action === "update_school_owner") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "schools", TABS.schools);
      const rows = readTable(ss, "schools");
      const target = rows.find(s => Number(s.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "School not found" });
      sh.getRange(target._row, 3).setValue(Number(body.owner_id));
      return jsonResponse({ ok: true });
    }

    if (action === "add_template_session") {
      const school_id = Number(body.school_id);
      if (!hasSchoolAccess(ss, caller, school_id, cairoToday())) {
        return jsonResponse({ ok: false, error: "No access to this school" });
      }
      const sh = getOrCreateSheet(ss, "template_sessions", TABS.template_sessions);
      const rows = readTable(ss, "template_sessions");
      const id = nextId(rows);
      const weekday = Number(body.weekday) || 0;
      const slot = Number(body.slot) || 0;
      const class_name = String(body.class_name ?? "Grade 4");
      const topic = String(body.topic ?? "New topic");
      const tutor_id = body.tutor_id ? Number(body.tutor_id) : "";
      const effective_from = String(body.effective_from ?? cairoToday());
      const effective_until = String(body.effective_until ?? "");
      sh.appendRow([id, school_id, weekday, slot, class_name, topic, tutor_id, effective_from, effective_until]);
      return jsonResponse({
        ok: true,
        data: {
          id,
          school_id,
          weekday,
          slot,
          class_name,
          topic,
          tutor_id: tutor_id === "" ? null : tutor_id,
          effective_from,
          effective_until
        }
      });
    }

    if (action === "update_template_session") {
      const sh = getOrCreateSheet(ss, "template_sessions", TABS.template_sessions);
      const rows = readTable(ss, "template_sessions");
      const target = rows.find(t => Number(t.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Session not found" });
      if (!hasSchoolAccess(ss, caller, Number(target.school_id), cairoToday())) {
        return jsonResponse({ ok: false, error: "No access to this school" });
      }
      if (body.slot !== undefined) sh.getRange(target._row, 4).setValue(Number(body.slot));
      if (body.class_name !== undefined) sh.getRange(target._row, 5).setValue(String(body.class_name));
      if (body.topic !== undefined) sh.getRange(target._row, 6).setValue(String(body.topic));
      if (body.tutor_id !== undefined) sh.getRange(target._row, 7).setValue(body.tutor_id ? Number(body.tutor_id) : "");
      if (body.effective_from !== undefined) sh.getRange(target._row, 8).setValue(String(body.effective_from));
      if (body.effective_until !== undefined) sh.getRange(target._row, 9).setValue(String(body.effective_until));
      return jsonResponse({ ok: true });
    }

    if (action === "delete_template_session") {
      const sh = getOrCreateSheet(ss, "template_sessions", TABS.template_sessions);
      const rows = readTable(ss, "template_sessions");
      const target = rows.find(t => Number(t.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: true });
      if (!hasSchoolAccess(ss, caller, Number(target.school_id), cairoToday())) {
        return jsonResponse({ ok: false, error: "No access to this school" });
      }
      sh.deleteRow(target._row);
      return jsonResponse({ ok: true });
    }

    if (action === "copy_template_day") {
      const school_id = Number(body.school_id);
      const weekday = Number(body.weekday);
      if (!hasSchoolAccess(ss, caller, school_id, cairoToday())) {
        return jsonResponse({ ok: false, error: "No access to this school" });
      }
      const sh = getOrCreateSheet(ss, "template_sessions", TABS.template_sessions);
      let rows = readTable(ss, "template_sessions");
      const src = rows.filter(r => Number(r.school_id) === school_id && Number(r.weekday) === weekday);
      const toDelete = rows
        .filter(r => Number(r.school_id) === school_id && Number(r.weekday) !== weekday)
        .sort((a, b) => b._row - a._row);
      toDelete.forEach(r => sh.deleteRow(r._row));

      rows = readTable(ss, "template_sessions");
      let next = nextId(rows);
      for (let d = 0; d < 7; d++) {
        if (d === weekday) continue;
        src.forEach(s => {
          sh.appendRow([
            next++,
            school_id,
            d,
            Number(s.slot),
            s.class_name,
            s.topic,
            s.tutor_id || "",
            s.effective_from || "",
            s.effective_until || ""
          ]);
        });
      }
      const updated = readTable(ss, "template_sessions")
        .filter(ts => Number(ts.school_id) === school_id)
        .map(ts => ({
          id: Number(ts.id),
          school_id: Number(ts.school_id),
          weekday: Number(ts.weekday),
          slot: Number(ts.slot),
          class_name: ts.class_name,
          topic: ts.topic,
          tutor_id: ts.tutor_id === "" || ts.tutor_id === "0" ? null : Number(ts.tutor_id),
          effective_from: ts.effective_from || "",
          effective_until: ts.effective_until || ""
        }));
      return jsonResponse({ ok: true, data: updated });
    }

    if (action === "upsert_override") {
      const session_id = Number(body.session_id);
      const on_date = String(body.on_date);
      const tSessions = readTable(ss, "template_sessions");
      const sess = tSessions.find(t => Number(t.id) === session_id);
      if (!sess || !hasSchoolAccess(ss, caller, Number(sess.school_id), on_date)) {
        return jsonResponse({ ok: false, error: "No access to this school on this date" });
      }
      const sh = getOrCreateSheet(ss, "session_overrides", TABS.session_overrides);
      const rows = readTable(ss, "session_overrides");
      const existing = rows.find(o => Number(o.session_id) === session_id && o.on_date === on_date);

      if (existing) {
        if (body.tutor_overridden !== undefined) sh.getRange(existing._row, 3).setValue(body.tutor_overridden ? 1 : 0);
        if (body.tutor_id !== undefined) sh.getRange(existing._row, 4).setValue(body.tutor_id ? Number(body.tutor_id) : "");
        if (body.cancelled !== undefined) sh.getRange(existing._row, 5).setValue(body.cancelled ? 1 : 0);
      } else {
        sh.appendRow([
          session_id,
          on_date,
          body.tutor_overridden ? 1 : 0,
          body.tutor_id ? Number(body.tutor_id) : "",
          body.cancelled ? 1 : 0
        ]);
      }
      return jsonResponse({ ok: true });
    }

    if (action === "create_access_request") {
      const school_ids = (body.school_ids || []).map(Number).filter(Boolean);
      const from_date = String(body.from_date || "");
      const until_date = String(body.until_date || "");
      if (!school_ids.length) return jsonResponse({ ok: false, error: "Choose at least one school" });
      if (!from_date || !until_date || until_date < from_date) return jsonResponse({ ok: false, error: "Invalid dates" });

      const sh = getOrCreateSheet(ss, "access_requests", TABS.access_requests);
      const rows = readTable(ss, "access_requests");
      const id = nextId(rows);
      let requester_id, owner_id, status;
      if (caller.role === "admin") {
        requester_id = Number(body.requester_id);
        owner_id = "";
        status = "approved";
        sendAppNotification(
          ss,
          requester_id,
          "Admin assigned you temporary school coverage from " + from_date + " to " + until_date + ".",
          "Temporary School Coverage Assigned"
        );
      } else {
        requester_id = caller.id;
        owner_id = Number(body.owner_id);
        status = "pending";
        sendAppNotification(
          ss,
          owner_id,
          caller.name + " requested temporary access to your schools (" + from_date + " to " + until_date + ").",
          "New Temporary Access Request"
        );
        sendAppNotification(
          ss,
          0,
          caller.name + " requested temporary school access (" + from_date + " to " + until_date + ").",
          "New Temporary Access Request"
        );
      }
      sh.appendRow([id, requester_id, owner_id, from_date, until_date, status, JSON.stringify(school_ids), new Date().toISOString()]);
      return jsonResponse({
        ok: true,
        data: { id, requester_id, owner_id: owner_id === "" ? null : owner_id, from_date, until_date, status, school_ids }
      });
    }

    if (action === "set_access_request_status") {
      const sh = getOrCreateSheet(ss, "access_requests", TABS.access_requests);
      const rows = readTable(ss, "access_requests");
      const target = rows.find(r => Number(r.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Request not found" });
      if (caller.role !== "admin" && Number(target.owner_id) !== caller.id) {
        return jsonResponse({ ok: false, error: "Not allowed" });
      }
      sh.getRange(target._row, 6).setValue(String(body.status));
      sendAppNotification(
        ss,
        Number(target.requester_id),
        "Your temporary access request (" + target.from_date + " to " + target.until_date + ") was " + body.status + " by " + caller.name + ".",
        "Access Request " + body.status
      );
      return jsonResponse({ ok: true });
    }

    if (action === "set_report_answer") {
      const school_id = Number(body.school_id);
      const report_date = String(body.report_date);
      const field_id = String(body.field_id);
      const value = String(body.value ?? "");
      if (!hasSchoolAccess(ss, caller, school_id, report_date)) {
        return jsonResponse({ ok: false, error: "No access to this school" });
      }
      const sh = getOrCreateSheet(ss, "school_reports", TABS.school_reports);
      const rows = readTable(ss, "school_reports");
      const existing = rows.find(r => Number(r.school_id) === school_id && r.report_date === report_date);
      if (existing) {
        let ans = {};
        try {
          ans = JSON.parse(existing.answers_json || "{}");
        } catch (err) {}
        ans[field_id] = value;
        sh.getRange(existing._row, 4).setValue(JSON.stringify(ans));
        sh.getRange(existing._row, 5).setValue(new Date().toISOString());
      } else {
        const schools = readTable(ss, "schools");
        const sch = schools.find(s => Number(s.id) === school_id);
        const author_id = caller.role === "admin" && sch ? Number(sch.owner_id) : caller.id;
        const ans = { [field_id]: value };
        sh.appendRow([school_id, report_date, author_id, JSON.stringify(ans), new Date().toISOString()]);
      }
      return jsonResponse({ ok: true });
    }

    if (action === "upsert_daily_summary") {
      const member_id = Number(body.member_id || caller.id);
      if (caller.role !== "admin" && member_id !== caller.id) {
        return jsonResponse({ ok: false, error: "Not allowed" });
      }
      const report_date = String(body.report_date);
      const sh = getOrCreateSheet(ss, "daily_summaries", TABS.daily_summaries);
      const rows = readTable(ss, "daily_summaries");
      const existing = rows.find(d => Number(d.member_id) === member_id && d.report_date === report_date);
      if (existing) {
        if (body.note !== undefined) sh.getRange(existing._row, 3).setValue(String(body.note));
        if (body.submit) sh.getRange(existing._row, 4).setValue(new Date().toISOString());
      } else {
        sh.appendRow([member_id, report_date, String(body.note ?? ""), body.submit ? new Date().toISOString() : ""]);
      }
      if (body.submit) {
        sendAppNotification(
          ss,
          0,
          caller.name + " submitted their daily report for " + report_date + ".",
          "Daily Report Submitted — " + caller.name
        );
      }
      return jsonResponse({ ok: true });
    }

    if (action === "add_report_field") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "report_fields", TABS.report_fields);
      const rows = readTable(ss, "report_fields");
      const id = nextId(rows);
      const sort_order = rows.reduce((m, r) => Math.max(m, Number(r.sort_order) || 0), 0) + 1;
      sh.appendRow([id, "New question", "text", "", sort_order]);
      return jsonResponse({ ok: true, data: { id, label: "New question", field_type: "text", options: "", sort_order } });
    }

    if (action === "update_report_field") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "report_fields", TABS.report_fields);
      const rows = readTable(ss, "report_fields");
      const target = rows.find(f => Number(f.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Field not found" });
      if (body.label !== undefined) sh.getRange(target._row, 2).setValue(String(body.label));
      if (body.field_type !== undefined) sh.getRange(target._row, 3).setValue(String(body.field_type));
      if (body.options !== undefined) sh.getRange(target._row, 4).setValue(String(body.options));
      return jsonResponse({ ok: true });
    }

    if (action === "delete_report_field") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "report_fields", TABS.report_fields);
      const rows = readTable(ss, "report_fields");
      const target = rows.find(f => Number(f.id) === Number(body.id));
      if (target) sh.deleteRow(target._row);
      return jsonResponse({ ok: true });
    }

    if (action === "move_report_field") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const sh = getOrCreateSheet(ss, "report_fields", TABS.report_fields);
      const rows = readTable(ss, "report_fields").sort((a, b) => Number(a.sort_order) - Number(b.sort_order) || Number(a.id) - Number(b.id));
      const idx = rows.findIndex(f => Number(f.id) === Number(body.id));
      const otherIdx = Number(body.dir) < 0 ? idx - 1 : idx + 1;
      if (idx >= 0 && otherIdx >= 0 && otherIdx < rows.length) {
        const a = rows[idx],
          b = rows[otherIdx];
        sh.getRange(a._row, 5).setValue(otherIdx + 1);
        sh.getRange(b._row, 5).setValue(idx + 1);
      }
      return jsonResponse({ ok: true });
    }

    if (action === "create_master_request") {
      const from_date = String(body.from_date);
      const to_date = String(body.to_date);
      if (!from_date || !to_date || to_date < from_date) return jsonResponse({ ok: false, error: "Invalid dates" });
      const sh = getOrCreateSheet(ss, "master_report_requests", TABS.master_report_requests);
      const rows = readTable(ss, "master_report_requests");
      const id = nextId(rows);
      const ap = {};
      members
        .filter(m => m.role === "mentor" && Number(m.active) === 1 && Number(m.id) !== caller.id)
        .forEach(m => {
          ap[Number(m.id)] = "pending";
          sendAppNotification(
            ss,
            Number(m.id),
            caller.name + " requested Master Report approval (" + from_date + " to " + to_date + ").",
            "Master Report Request"
          );
        });
      sendAppNotification(ss, 0, caller.name + " requested Master Report access (" + from_date + " to " + to_date + ").", "Master Report Request");
      sh.appendRow([id, caller.id, from_date, to_date, "", JSON.stringify(ap), new Date().toISOString()]);
      return jsonResponse({ ok: true, data: { id, requester_id: caller.id, from_date, to_date, admin_decision: null, approvals: ap } });
    }

    if (action === "decide_master_request") {
      const sh = getOrCreateSheet(ss, "master_report_requests", TABS.master_report_requests);
      const rows = readTable(ss, "master_report_requests");
      const target = rows.find(r => Number(r.id) === Number(body.id));
      if (!target) return jsonResponse({ ok: false, error: "Request not found" });

      if (body.as_admin) {
        if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
        sh.getRange(target._row, 5).setValue(String(body.status));
      } else {
        let ap = {};
        try {
          ap = JSON.parse(target.approvals_json || "{}");
        } catch (err) {}
        if (ap[caller.id] !== "pending") return jsonResponse({ ok: false, error: "Not allowed" });
        ap[caller.id] = String(body.status);
        sh.getRange(target._row, 6).setValue(JSON.stringify(ap));
      }
      sendAppNotification(
        ss,
        Number(target.requester_id),
        caller.name + " " + body.status + " your Master Report request (" + target.from_date + " to " + target.to_date + ").",
        "Master Report Update"
      );
      return jsonResponse({ ok: true });
    }

    if (action === "get_master_report") {
      const from_date = String(body.from_date);
      const to_date = String(body.to_date);
      if (caller.role !== "admin") {
        const mreqs = readTable(ss, "master_report_requests");
        const allowed = mreqs.some(
          q =>
            Number(q.requester_id) === caller.id &&
            q.from_date <= from_date &&
            q.to_date >= to_date &&
            masterRequestStatus(q) === "approved"
        );
        if (!allowed) return jsonResponse({ ok: false, error: "The master report is not approved for this range" });
      }
      const schoolsMap = {};
      readTable(ss, "schools").forEach(s => (schoolsMap[Number(s.id)] = s.name));
      const membersMap = {};
      members.forEach(m => (membersMap[Number(m.id)] = m.name));

      const out = [];
      readTable(ss, "school_reports")
        .filter(sr => sr.report_date >= from_date && sr.report_date <= to_date)
        .forEach(sr => {
          let ans = {};
          try {
            ans = JSON.parse(sr.answers_json || "{}");
          } catch (err) {}
          out.push({
            report_date: sr.report_date,
            mentor_id: Number(sr.author_id),
            mentor_name: membersMap[Number(sr.author_id)] || "?",
            school_id: Number(sr.school_id),
            school_name: schoolsMap[Number(sr.school_id)] || "?",
            answers: ans,
            note: null
          });
        });

      readTable(ss, "daily_summaries")
        .filter(ds => ds.report_date >= from_date && ds.report_date <= to_date && String(ds.note || "").trim() !== "")
        .forEach(ds => {
          out.push({
            report_date: ds.report_date,
            mentor_id: Number(ds.member_id),
            mentor_name: membersMap[Number(ds.member_id)] || "?",
            school_id: null,
            school_name: "Daily summary",
            answers: null,
            note: ds.note
          });
        });

      out.sort((a, b) => a.report_date.localeCompare(b.report_date) || a.mentor_name.localeCompare(b.mentor_name));
      return jsonResponse({ ok: true, data: out });
    }

    if (action === "full_backup") {
      if (caller.role !== "admin") return jsonResponse({ ok: false, error: "Admin only" });
      const backup = { exported_at: new Date().toISOString() };
      Object.keys(TABS).forEach(t => (backup[t] = readTable(ss, t)));
      return jsonResponse({ ok: true, data: backup });
    }

    return jsonResponse({ ok: false, error: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}
