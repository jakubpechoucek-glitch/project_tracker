CREATE TABLE IF NOT EXISTS project_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pm_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  assigned_from TEXT NOT NULL,
  assigned_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assignments_pm ON project_assignments(pm_id);
CREATE INDEX IF NOT EXISTS idx_assignments_project ON project_assignments(project_id);
