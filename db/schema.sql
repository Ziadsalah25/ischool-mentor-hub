-- =====================================================================
-- iSchool Mentor Hub - Cloudflare D1 Database Schema (SQLite)
-- =====================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS members (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE CHECK (email = lower(email)),
  name          TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'mentor' CHECK (role IN ('admin','mentor')),
  active        INTEGER NOT NULL DEFAULT 1,
  google_sub    TEXT    UNIQUE,
  last_login_at TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tutors (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL,
  archived  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS schools (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL,
  owner_id  INTEGER NOT NULL REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS template_sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id   INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  weekday     INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  slot        INTEGER NOT NULL CHECK (slot BETWEEN 0 AND 3),
  class_name  TEXT    NOT NULL DEFAULT '',
  topic       TEXT    NOT NULL DEFAULT '',
  tutor_id    INTEGER REFERENCES tutors(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS template_sessions_school_weekday_idx ON template_sessions (school_id, weekday);

CREATE TABLE IF NOT EXISTS session_overrides (
  session_id        INTEGER NOT NULL REFERENCES template_sessions(id) ON DELETE CASCADE,
  on_date           TEXT    NOT NULL,
  tutor_overridden  INTEGER NOT NULL DEFAULT 0,
  tutor_id          INTEGER REFERENCES tutors(id) ON DELETE SET NULL,
  cancelled         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, on_date)
);
CREATE INDEX IF NOT EXISTS session_overrides_date_idx ON session_overrides (on_date);

CREATE TABLE IF NOT EXISTS access_requests (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id  INTEGER NOT NULL REFERENCES members(id),
  owner_id      INTEGER REFERENCES members(id),
  from_date     TEXT    NOT NULL,
  until_date    TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined','revoked')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (until_date >= from_date)
);

CREATE TABLE IF NOT EXISTS access_request_schools (
  request_id  INTEGER NOT NULL REFERENCES access_requests(id) ON DELETE CASCADE,
  school_id   INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, school_id)
);

CREATE TABLE IF NOT EXISTS report_fields (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  label       TEXT    NOT NULL,
  field_type  TEXT    NOT NULL CHECK (field_type IN ('text','long','number','yesno','choice')),
  options     TEXT    NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS school_reports (
  school_id    INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  report_date  TEXT    NOT NULL,
  author_id    INTEGER NOT NULL REFERENCES members(id),
  answers      TEXT    NOT NULL DEFAULT '{}',
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (school_id, report_date)
);

CREATE TABLE IF NOT EXISTS daily_summaries (
  member_id     INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  report_date   TEXT    NOT NULL,
  note          TEXT    NOT NULL DEFAULT '',
  submitted_at  TEXT,
  PRIMARY KEY (member_id, report_date)
);

CREATE TABLE IF NOT EXISTS master_report_requests (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id    INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  from_date       TEXT    NOT NULL,
  to_date         TEXT    NOT NULL,
  admin_decision  TEXT    CHECK (admin_decision IN ('approved','declined')),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (to_date >= from_date)
);

CREATE TABLE IF NOT EXISTS master_report_approvals (
  request_id   INTEGER NOT NULL REFERENCES master_report_requests(id) ON DELETE CASCADE,
  approver_id  INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status       TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  PRIMARY KEY (request_id, approver_id)
);

-- Seed default report fields
INSERT OR IGNORE INTO report_fields (id, label, field_type, options, sort_order) VALUES
  (1, 'Sessions delivered',   'number', '',                         1),
  (2, 'Students present',     'number', '',                         2),
  (3, 'Topics covered',       'long',   '',                         3),
  (4, 'All tutors on time?',  'yesno',  '',                         4),
  (5, 'Problems or issues',   'long',   '',                         5),
  (6, 'Overall day rating',   'choice', 'Excellent,Good,Fair,Poor', 6),
  (7, 'Follow-up needed',     'long',   '',                         7);

