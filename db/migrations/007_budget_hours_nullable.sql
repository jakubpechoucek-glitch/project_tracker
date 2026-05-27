-- SQLite does not support DROP NOT NULL directly; recreate the table with budget_hours nullable
CREATE TABLE IF NOT EXISTS projects_new (
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
