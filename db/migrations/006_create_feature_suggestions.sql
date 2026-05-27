CREATE TABLE IF NOT EXISTS feature_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('UX', 'Reporting', 'Workflow', 'Other')),
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'under_review', 'planned', 'done', 'dismissed')),
  admin_comment TEXT,
  updated_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_suggestions_user ON feature_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON feature_suggestions(status);
