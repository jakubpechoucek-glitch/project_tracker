-- Weekly summary written by each PM for their week.
-- Admins can read all summaries; PMs can only write/read their own.

CREATE TABLE IF NOT EXISTS weekly_summaries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  pm_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start  TEXT NOT NULL,          -- YYYY-MM-DD (Monday)
  highlights  TEXT NOT NULL DEFAULT '',
  blockers    TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(pm_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_summaries_pm    ON weekly_summaries(pm_id);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_week  ON weekly_summaries(week_start);
