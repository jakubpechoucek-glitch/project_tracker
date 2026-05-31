CREATE TABLE IF NOT EXISTS activities (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  is_active  INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Seed with the existing hardcoded categories so nothing breaks
INSERT OR IGNORE INTO activities (name, sort_order) VALUES
  ('Planning',         1),
  ('Meetings',         2),
  ('Reporting',        3),
  ('Problem Solving',  4),
  ('Documentation',    5),
  ('Other',            6);
