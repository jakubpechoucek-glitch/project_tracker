const cron = require('node-cron');
const { getDb } = require('../../db/db');
const { sendMail } = require('../utils/emailer');

// Returns Mon and Sun of the previous week as YYYY-MM-DD strings
function lastWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon …
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + diffToMonday);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);

  const fmt = d => d.toISOString().slice(0, 10);
  return { from: fmt(lastMonday), to: fmt(lastSunday) };
}

function buildReport(from, to) {
  const db = getDb();

  const totals = db.prepare(`
    SELECT
      COUNT(DISTINCT e.pm_id) as active_pms,
      COUNT(*) as total_entries,
      ROUND(SUM(e.hours), 1) as total_hours
    FROM time_entries e
    WHERE e.date >= ? AND e.date <= ?
  `).get(from, to);

  const byProject = db.prepare(`
    SELECT p.name as project, ROUND(SUM(e.hours), 1) as hours, COUNT(DISTINCT e.pm_id) as pms
    FROM time_entries e
    JOIN projects p ON p.id = e.project_id
    WHERE e.date >= ? AND e.date <= ?
    GROUP BY p.id
    ORDER BY hours DESC
  `).all(from, to);

  const byPm = db.prepare(`
    SELECT u.name as pm, ROUND(SUM(e.hours), 1) as hours, COUNT(*) as entries
    FROM time_entries e
    JOIN users u ON u.id = e.pm_id
    WHERE e.date >= ? AND e.date <= ?
    GROUP BY e.pm_id
    ORDER BY hours DESC
  `).all(from, to);

  return { totals, byProject, byPm };
}

function buildHtml(from, to, { totals, byProject, byPm }) {
  const row = (cells) => `<tr>${cells.map(c => `<td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${c}</td>`).join('')}</tr>`;
  const th = (cells) => `<tr>${cells.map(c => `<th style="padding:6px 12px;text-align:left;background:#fafafa;color:#555;font-size:12px;text-transform:uppercase;letter-spacing:.5px">${c}</th>`).join('')}</tr>`;

  const projectRows = byProject.length
    ? byProject.map(r => row([r.project, `${r.hours}h`, r.pms])).join('')
    : row(['No entries logged', '', '']);

  const pmRows = byPm.length
    ? byPm.map(r => row([r.pm, `${r.hours}h`, r.entries])).join('')
    : row(['No entries logged', '', '']);

  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;color:#111">
      <div style="background:#E30613;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;color:white;font-size:20px">Weekly Time Report</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px">${from} → ${to}</p>
      </div>
      <div style="background:white;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">

        <div style="display:flex;gap:16px;margin-bottom:24px">
          ${[
            ['Total hours', `${totals.total_hours ?? 0}h`],
            ['Entries logged', totals.total_entries ?? 0],
            ['Active PMs', totals.active_pms ?? 0],
          ].map(([label, val]) => `
            <div style="flex:1;background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:14px 18px">
              <div style="font-size:22px;font-weight:700;color:#E30613">${val}</div>
              <div style="font-size:12px;color:#888;margin-top:2px">${label}</div>
            </div>`).join('')}
        </div>

        <h3 style="margin:0 0 8px;font-size:14px;font-weight:600">Hours by project</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
          ${th(['Project', 'Hours', 'PMs'])}${projectRows}
        </table>

        <h3 style="margin:0 0 8px;font-size:14px;font-weight:600">Hours by PM</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          ${th(['PM', 'Hours', 'Entries'])}${pmRows}
        </table>

        <p style="margin:24px 0 0;font-size:12px;color:#aaa">
          Full reports → <a href="${process.env.APP_URL || '#'}/admin/reports" style="color:#E30613">Admin Reports</a>
        </p>
      </div>
    </div>`;
}

function registerWeeklyReportJob() {
  const adminEmail = process.env.ADMIN_EMAIL || 'jakub.pechoucek@homecredit.ph';

  // Every Monday at 08:00 Philippine Time (UTC+8 = 00:00 UTC)
  cron.schedule('0 0 * * 1', async () => {
    try {
      const { from, to } = lastWeekRange();
      console.log(`[weeklyReport] Generating report for ${from} → ${to}`);
      const data = buildReport(from, to);
      const html = buildHtml(from, to, data);
      await sendMail({
        to: adminEmail,
        subject: `Project Tracker — Weekly Report (${from} to ${to})`,
        html,
      });
    } catch (err) {
      console.error('[weeklyReport] Failed:', err.message);
    }
  }, { timezone: 'Asia/Manila' });

  console.log('  ✓ Weekly report job scheduled (Mondays 08:00 PHT)');
}

module.exports = { registerWeeklyReportJob };
