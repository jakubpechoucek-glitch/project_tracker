-- Backdate any assignment whose assigned_from falls mid-week to the Monday of that week.
-- This fixes assignments created after Monday that blocked PMs from logging earlier days.
UPDATE project_assignments
SET assigned_from = date(assigned_from, 'weekday 1', '-7 days')
WHERE strftime('%w', assigned_from) != '1';  -- '1' = Monday in SQLite strftime
