require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { runMigrations } = require('../db/migrate');
const { getDb } = require('../db/db');

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// Run migrations on startup
runMigrations();

// Ensure admin account always exists (re-seeds after ephemeral disk reset on Render free tier)
(function ensureAdmin() {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('jakub.pechoucek@homecredit.ph');
  if (!existing) {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
    const hash = bcrypt.hashSync('Admin1234', rounds);
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_active, is_first_login)
      VALUES ('Jakub Pechoucek', 'jakub.pechoucek@homecredit.ph', ?, 'admin', 1, 0)
    `).run(hash);
    console.log('  ✓ Admin account created (fresh DB detected)');
  }
})();

app.use(cors({ origin: isDev ? 'http://localhost:5173' : false, credentials: true }));
app.use(express.json());

// API routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/projects', require('./routes/projects.routes'));
app.use('/api/assignments', require('./routes/assignments.routes'));
app.use('/api/entries', require('./routes/entries.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/audit', require('./routes/audit.routes'));
app.use('/api/suggestions', require('./routes/suggestions.routes'));
app.use('/api/activities', require('./routes/activities.routes'));
// app.use('/api/chat', require('./routes/chat.routes')); // chat bot — not yet deployed
app.use('/api/weekly-summaries', require('./routes/weekly-summaries.routes'));

// Serve React in production
if (!isDev) {
  const staticPath = path.join(__dirname, 'public');
  app.use(express.static(staticPath));
  app.get('*', (req, res) => res.sendFile(path.join(staticPath, 'index.html')));
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

if (require.main === module) {
  const { registerWeeklyReportJob } = require('./jobs/weeklyReport');
  registerWeeklyReportJob();
  app.listen(PORT, () => {
    console.log(`\n🚀 Project Tracker running on http://localhost:${PORT}`);
    if (isDev) console.log('   Frontend: http://localhost:5173');
  });
}

module.exports = app;
