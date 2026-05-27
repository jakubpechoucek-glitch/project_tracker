CREATE TABLE IF NOT EXISTS time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pm_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  date TEXT NOT NULL,
  hours REAL NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('Planning', 'Meetings', 'Reporting', 'Problem Solving', 'Documentation', 'Other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending', 'approved', 'rejected')),
  approved_by INTEGER REFERENCES users(id),
  approved_at TEXT,
  rejection_reason TEXT,
  submitted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_entries_pm ON time_entries(pm_id);
CREATE INDEX IF NOT EXISTS idx_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_entries_pm_date ON time_entries(pm_id, date);
