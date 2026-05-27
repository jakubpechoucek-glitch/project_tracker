-- SQLite does not support DROP NOT NULL directly; recreate the table with budget_hours nullable.
-- Foreign keys must be OFF while we drop and rename the table.
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS projects_new;
CREATE TABLE projects_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  budget_hours REAL DEFAULT NULL,
  billable INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO projects_new SELECT * FROM projects;
DROP TABLE projects;
ALTER TABLE projects_new RENAME TO projects;
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

PRAGMA foreign_keys = ON;
