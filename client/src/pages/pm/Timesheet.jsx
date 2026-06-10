import { useEffect, useState, useCallback } from 'react';
import { format, addDays, startOfISOWeek } from 'date-fns';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import api from '../../services/api';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Parse a user-typed time string into decimal hours.
 * Accepts:
 *   plain integer  → minutes  (60 → 1h, 10 → 10min, 480 → 8h)
 *   decimal        → hours    (1.5 → 1h30m, 0.5 → 30min)
 *   "60m"/"90min"  → minutes  (90m → 1h30m)
 *   "1h"/"2h"      → hours    (1h → 1h)
 *   "1h30" / "1h30m" / "1:30" → 1.5h
 * Returns hours (number) or null if unparseable.
 */
function parseTimeInput(raw) {
  if (!raw || !String(raw).trim()) return null;
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, '');

  // "1h30m" or "1h30" or "1:30"
  const hmMatch = s.match(/^(\d+)(?:h|:)(\d{1,2})m?$/);
  if (hmMatch) {
    const h = parseInt(hmMatch[1], 10);
    const m = parseInt(hmMatch[2], 10);
    if (m >= 60) return null;
    return h + m / 60;
  }
  // "90m" or "90min"
  const minMatch = s.match(/^(\d+)m(?:in)?$/);
  if (minMatch) return parseInt(minMatch[1], 10) / 60;
  // "1.5h" or "1h"
  const hMatch = s.match(/^(\d+\.?\d*)h$/);
  if (hMatch) return parseFloat(hMatch[1]);
  // bare decimal → hours (e.g. 1.5, 0.5, 8.25)
  if (/^\d+\.\d+$/.test(s)) return parseFloat(s);
  // bare integer → hours (e.g. 8 = 8h, 1 = 1h)
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return null;
}

/** Format decimal hours as human-readable: "10m", "30m", "1h", "1h 30m" */
function formatHours(hours) {
  if (!hours || hours <= 0) return '';
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getWeekDates(anchor) {
  const start = startOfISOWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function cellColor(dayTotal, cellHours) {
  if (dayTotal > 12) return 'cell-danger';
  if (dayTotal > 8) return 'cell-warn';
  return '';
}

export default function Timesheet() {
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const weekDates = getWeekDates(weekAnchor);
  const weekStart = format(weekDates[0], 'yyyy-MM-dd');
  const weekEnd = format(weekDates[6], 'yyyy-MM-dd');

  const [projects, setProjects] = useState([]);
  // activities state kept for future use (dynamic activities feature)
  // const [activities, setActivities] = useState([]);
  const [entries, setEntries] = useState([]);
  const [grid, setGrid] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [editingCell, setEditingCell] = useState(null);   // "projId-dateStr"
  const [editingValue, setEditingValue] = useState('');

  // Weekly summary
  const [summary, setSummary] = useState({ highlights: '', blockers: '' });
  const [summaryDirty, setSummaryDirty] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);

  const fetchWeek = useCallback(async () => {
    setLoading(true);
    try {
      const [projectsRes, weekRes, sumRes] = await Promise.all([
        api.get('/assignments/my-projects'),
        api.get(`/entries/week?week=${weekStart}`),
        api.get(`/weekly-summaries?weekStart=${weekStart}`),
      ]);
      const projs = projectsRes.data.data;
      const ents = weekRes.data.data.entries || [];
      setProjects(projs);
      setEntries(ents);
      const s = sumRes.data.data;
      setSummary({ highlights: s?.highlights || '', blockers: s?.blockers || '' });
      setSummaryDirty(false);

      // Build grid: { projectId: { dateStr: entry } }
      const g = {};
      for (const p of projs) { g[p.project_id] = {}; }
      for (const e of ents) {
        if (!g[e.project_id]) g[e.project_id] = {};
        g[e.project_id][e.date] = { hours: e.hours, status: e.status, id: e.id, category: e.category };
      }
      setGrid(g);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { fetchWeek(); }, [fetchWeek]);

  function getDayTotal(dateStr) {
    return projects.reduce((sum, p) => sum + (parseFloat(grid[p.project_id]?.[dateStr]?.hours) || 0), 0);
  }

  function getProjectTotal(projectId) {
    return weekDates.reduce((sum, d) => sum + (parseFloat(grid[projectId]?.[format(d, 'yyyy-MM-dd')]?.hours) || 0), 0);
  }

  function handleCellFocus(projectId, dateStr) {
    const key = `${projectId}-${dateStr}`;
    setEditingCell(key);
    const hours = grid[projectId]?.[dateStr]?.hours;
    // Show minutes as plain number when focusing (e.g. "60" for 1h) — easy to retype
    // Show decimal hours in edit field (e.g. 1.5, 8, 0.5)
    setEditingValue(hours ? String(parseFloat(hours.toFixed(2))) : '');
  }

  function handleCellChange(projectId, dateStr, rawValue) {
    setEditingValue(rawValue);
    const hours = parseTimeInput(rawValue);
    if (hours !== null) {
      setGrid(g => ({ ...g, [projectId]: { ...g[projectId], [dateStr]: { ...(g[projectId]?.[dateStr] || {}), hours, status: g[projectId]?.[dateStr]?.status || 'draft' } } }));
    }
  }

  function handleCellBlur(projectId, dateStr) {
    const hours = parseTimeInput(editingValue);
    if (editingValue !== '' && hours === null) {
      toast.error('Use hours (1.5), suffix (1h30m / 1:30), or minutes (30m). Max 24h per entry.');
      // Clear invalid input
      setGrid(g => {
        const cell = g[projectId]?.[dateStr];
        if (cell && !cell.id) {
          const next = { ...g[projectId] };
          delete next[dateStr];
          return { ...g, [projectId]: next };
        }
        return g;
      });
    }
    if (editingValue === '') {
      // Clear the cell
      setGrid(g => {
        const cell = g[projectId]?.[dateStr];
        if (cell && !cell.id) {
          const next = { ...g[projectId] };
          delete next[dateStr];
          return { ...g, [projectId]: next };
        }
        return { ...g, [projectId]: { ...g[projectId], [dateStr]: { ...g[projectId]?.[dateStr], hours: '' } } };
      });
    }
    setEditingCell(null);
    setEditingValue('');
  }

  async function handleSave() {
    setSaving(true);
    const warns = [];
    try {
      for (const p of projects) {
        for (const d of weekDates) {
          const dateStr = format(d, 'yyyy-MM-dd');
          const cell = grid[p.project_id]?.[dateStr];
          if (!cell?.hours || cell.status === 'approved' || cell.status === 'pending') continue;
          const hours = parseFloat(cell.hours);
          if (!hours || isNaN(hours)) continue;

          const category = cell?.category || null;
          try {
            if (cell.id) {
              await api.put(`/entries/${cell.id}`, { hours, category });
            } else {
              const res = await api.post('/entries', { projectId: p.project_id, date: dateStr, hours, category });
              if (res.data.data.warnings?.length) warns.push(...res.data.data.warnings);
            }
          } catch (err) {
            const msg = err.response?.data?.error || `Failed to save ${p.project_name} on ${dateStr}`;
            toast.error(msg);
          }
        }
      }
      setWarnings(warns);
      await fetchWeek();
      toast.success('Timesheet saved');
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyLastWeek() {
    const lastWeekAnchor = addDays(weekAnchor, -7);
    const lastStart = format(startOfISOWeek(lastWeekAnchor), 'yyyy-MM-dd');
    try {
      const res = await api.get(`/entries/week?week=${lastStart}`);
      const lastEntries = res.data.data.entries || [];
      const newGrid = { ...grid };
      for (const e of lastEntries) {
        const newDate = format(addDays(new Date(e.date + 'T00:00:00'), 7), 'yyyy-MM-dd');
        if (!newGrid[e.project_id]) continue;
        if (!newGrid[e.project_id][newDate]?.id) {
          newGrid[e.project_id][newDate] = { hours: e.hours, status: 'draft', category: e.category };
        }
      }
      setGrid(newGrid);
      toast.success('Last week\'s hours copied');
    } catch { toast.error('Could not load last week'); }
  }

  async function handleSubmit() {
    try {
      await api.post('/entries/submit', { week: weekStart });
      setSubmitOpen(false);
      await fetchWeek();
      toast.success('Week submitted for approval');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submit failed');
    }
  }

  async function saveSummary() {
    setSavingSummary(true);
    try {
      await api.put(`/weekly-summaries?weekStart=${weekStart}`, summary);
      toast.success('Summary saved');
      setSummaryDirty(false);
    } catch { toast.error('Failed to save summary'); }
    finally { setSavingSummary(false); }
  }

  const hasDraftEntries = entries.some(e => e.status === 'draft');
  const allSubmitted = entries.length > 0 && entries.every(e => e.status !== 'draft');

  return (
    <AppLayout title="Weekly Timesheet">
      <div className="space-y-4">
        {/* Week nav */}
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekAnchor(d => addDays(d, -7))}>← Prev</button>
          <span className="text-sm font-semibold text-gray-700">
            {format(weekDates[0], 'MMM d')} – {format(weekDates[6], 'MMM d, yyyy')}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekAnchor(d => addDays(d, 7))}>Next →</button>
          <div className="ml-auto flex gap-2 flex-wrap">
            <button className="btn btn-ghost btn-sm" onClick={handleCopyLastWeek}>Copy last week</button>
            <button className="btn btn-secondary btn-sm" onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button className="btn-primary btn-sm btn" onClick={() => setSubmitOpen(true)} disabled={!hasDraftEntries || loading}>
              Submit week
            </button>
          </div>
        </div>

        {/* Warnings */}
        {warnings.map((w, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            ⚠ {w}
          </div>
        ))}

        {/* Grid */}
        <div className="card overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading timesheet…</div>
          ) : projects.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No active project assignments. Contact your admin.</div>
          ) : (
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-40">Project</th>
                  {weekDates.map((d, i) => {
                    const ds = format(d, 'yyyy-MM-dd');
                    const dt = getDayTotal(ds);
                    return (
                      <th key={i} className={clsx('px-2 py-2 text-center min-w-[70px]', dt > 12 ? 'bg-red-50' : dt > 8 ? 'bg-amber-50' : '')}>
                        <div className="text-xs font-semibold text-gray-500">{DAYS[i]}</div>
                        <div className="text-xs text-gray-400">{format(d, 'MMM d')}</div>
                        {dt > 0 && <div className={clsx('text-xs font-bold', dt > 12 ? 'text-red-600' : dt > 8 ? 'text-amber-600' : 'text-gray-600')}>{formatHours(dt)}</div>}
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.project_id} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-800 text-sm">{p.project_name}</td>
                    {weekDates.map((d, i) => {
                      const ds = format(d, 'yyyy-MM-dd');
                      const cell = grid[p.project_id]?.[ds];
                      const dt = getDayTotal(ds);
                      const isLocked = cell?.status === 'approved' || cell?.status === 'pending';
                      return (
                        <td key={i} className={clsx('px-1 py-1 text-center hours-cell border',
                          cell?.status === 'approved' ? 'cell-approved' :
                          cell?.status === 'pending' ? 'cell-pending' :
                          cell?.status === 'rejected' ? 'cell-rejected' :
                          dt > 12 ? 'cell-danger' : dt > 8 ? 'cell-warn' : 'border-gray-100'
                        )}>
                          {isLocked ? (
                            <div className="flex flex-col items-center gap-0.5 py-1">
                              <span className="font-medium text-gray-700">{formatHours(cell.hours)}</span>
                              {cell.category && <span className="text-xs text-gray-400 truncate max-w-[80px]">{cell.category}</span>}
                              <StatusBadge status={cell.status} className="scale-75" />
                            </div>
                          ) : (
                            <input
                              type="text"
                              className="text-center text-sm font-medium w-full bg-transparent border-0 outline-none py-1.5"
                              value={editingCell === `${p.project_id}-${ds}` ? editingValue : formatHours(cell?.hours)}
                              onFocus={() => handleCellFocus(p.project_id, ds)}
                              onChange={e => handleCellChange(p.project_id, ds, e.target.value)}
                              onBlur={() => handleCellBlur(p.project_id, ds)}
                              placeholder="—"
                              aria-label={`Time for ${p.project_name} on ${format(d, 'MMM d')}`}
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center font-semibold text-gray-700">
                      {formatHours(getProjectTotal(p.project_id)) || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                  <td className="px-4 py-2 text-xs text-gray-500">Daily Total</td>
                  {weekDates.map((d, i) => {
                    const ds = format(d, 'yyyy-MM-dd');
                    const dt = getDayTotal(ds);
                    return (
                      <td key={i} className={clsx('px-2 py-2 text-center text-xs font-bold',
                        dt > 12 ? 'text-red-600' : dt > 8 ? 'text-amber-600' : 'text-gray-600'
                      )}>
                        {dt > 0 ? formatHours(dt) : '—'}
                        {dt > 12 && ' 🔴'}
                        {dt > 8 && dt <= 12 && ' ⚠'}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-center text-xs font-bold text-gray-700">
                    {formatHours(weekDates.reduce((s, d) => s + getDayTotal(format(d, 'yyyy-MM-dd')), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Input hint */}
        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          <span className="font-medium text-gray-500">Entering time (in hours):</span>{' '}
          type <span className="font-mono">8</span> = 8h, <span className="font-mono">1.5</span> = 1h 30m, <span className="font-mono">0.5</span> = 30m —
          or use <span className="font-mono">1h30m</span>, <span className="font-mono">1:30</span>, <span className="font-mono">30m</span> for more formats.
          Maximum 24h per entry.
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-100 border border-amber-300 rounded" /> {'>'} 8h warning</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-300 rounded" /> {'>'} 12h alert</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-50 border border-green-200 rounded" /> Approved</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-50 border border-blue-200 rounded" /> Pending</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-50 border border-red-200 rounded" /> Rejected</span>
        </div>

        {/* Weekly summary */}
        <div className="card card-body space-y-4">
          <div className="flex items-center justify-between">
            <h2>Weekly summary</h2>
            {summaryDirty && (
              <button onClick={saveSummary} disabled={savingSummary} className="btn-primary btn-sm">
                {savingSummary ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>
          <div>
            <label className="label text-xs">✅ Highlights — what went well</label>
            <textarea
              className="input resize-none w-full" rows={3}
              placeholder="e.g. Finished onboarding docs, kicked off Project Beta meetings…"
              value={summary.highlights}
              onChange={e => { setSummary(s => ({ ...s, highlights: e.target.value })); setSummaryDirty(true); }}
            />
          </div>
          <div>
            <label className="label text-xs">🚧 Blockers — what's in the way</label>
            <textarea
              className="input resize-none w-full" rows={3}
              placeholder="e.g. Waiting on client sign-off, missing data access for reporting…"
              value={summary.blockers}
              onChange={e => { setSummary(s => ({ ...s, blockers: e.target.value })); setSummaryDirty(true); }}
            />
          </div>
          {summaryDirty && <p className="text-xs text-gray-400">Unsaved changes</p>}
        </div>
      </div>

      <ConfirmDialog
        open={submitOpen}
        title="Submit week for approval?"
        message=""
        confirmLabel="Submit week"
        confirmClass="btn-primary"
        onConfirm={handleSubmit}
        onCancel={() => setSubmitOpen(false)}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <span className="text-amber-500 text-lg leading-none mt-0.5">⚠</span>
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Make sure you've saved your draft first!</p>
              <p>Any time entries not yet saved via <strong>"Save draft"</strong> will <strong>NOT</strong> be included in this submission.</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            All saved draft entries for this week will be sent for admin approval. You won't be able to edit them until an admin reopens the week.
          </p>
        </div>
      </ConfirmDialog>
    </AppLayout>
  );
}
