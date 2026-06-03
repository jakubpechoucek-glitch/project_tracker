-- Remove the hardcoded CHECK constraint on time_entries.category so any
-- activity name (including user-defined ones) can be stored. Also make
-- category nullable so entries can be saved without selecting one.
--
-- SQLite does not support DROP CONSTRAINT, so we recreate the table.

PRAGMA foreign_keys = OFF;

CREATE TABLE time_entries_v2 (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  pm_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  date        TEXT NOT NULL,
  hours       REAL NOT NULL,
  category    TEXT,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected')),
  approved_by INTEGER REFERENCES users(id),
  approved_at TEXT,
  rejection_reason TEXT,
  submitted_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO time_entries_v2
  SELECT id, pm_id, project_id, date, hours, category, description,
         status, approved_by, approved_at, rejection_reason, submitted_at,
         created_at, updated_at
  FROM time_entries;

DROP TABLE time_entries;
ALTER TABLE time_entries_v2 RENAME TO time_entries;

CREATE INDEX IF NOT EXISTS idx_entries_pm      ON time_entries(pm_id);
CREATE INDEX IF NOT EXISTS idx_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_entries_date    ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_status  ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_entries_pm_date ON time_entries(pm_id, date);

PRAGMA foreign_keys = ON;
