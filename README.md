# Project Tracker — Home Credit Philippines

Full-stack time tracking web application for project managers. Built with Node.js/Express, SQLite (via better-sqlite3), and React.

---

## Quick Start

```bash
# 1. Clone and enter the repo
git clone https://github.com/jakubpechoucek-glitch/project_tracker.git
cd project_tracker

# 2. Install all dependencies (root + client)
npm run setup

# 3. Start development servers (backend :3000, frontend :5173)
npm run dev
```

Open http://localhost:5173

---

## Environment Variables

Copy `.env.example` to `.env` before running:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `./data/tracker.db` | SQLite file path |
| `JWT_SECRET` | *(required)* | Change before deploying |
| `BCRYPT_ROUNDS` | `10` | bcrypt cost factor |
| `PORT` | `3000` | Backend port |
| `NODE_ENV` | `development` | `production` serves built React |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start backend (nodemon) + frontend (Vite) concurrently |
| `npm run build` | Build React → `server/public/` |
| `npm start` | Production: Express serves everything on port 3000 |
| `npm run migrate` | Run pending DB migrations |
| `npm run seed` | Reset and seed sample data |
| `npm test` | Run all tests |

---

## Login Credentials

### After `npm run seed`:

| Role | Email | Password |
|---|---|---|
| Admin | `jakub.pechoucek@homecredit.ph` | `Admin1234` |
| PM | `juan.delacruz@hc.ph` | `Temp1234!` |
| PM | `ana.reyes@hc.ph` | `Temp1234!` |
| PM | `carlos.mendoza@hc.ph` | `Temp1234!` |
| PM | `rosa.lim@hc.ph` | `Temp1234!` |

> All PM accounts have `is_first_login = true` — they will be redirected to set a new password on first sign-in.

---

## Architecture

```
project_tracker/
├── client/          React SPA (Vite + Tailwind)
├── server/
│   ├── routes/      HTTP method + path + middleware
│   ├── controllers/ Request/response handling
│   ├── services/    Business logic + validation
│   ├── repositories/SQL queries (all DB access here)
│   ├── middleware/  auth, role, validate
│   └── utils/       response helpers, audit logger, date utils
├── db/
│   ├── db.js        SQLite adapter (swap here for PostgreSQL)
│   ├── migrate.js   Migration runner
│   ├── migrations/  SQL migration files (run in filename order)
│   └── seed.js      Sample data with edge cases
└── tests/           Jest + Supertest
```

### Migrating to PostgreSQL

1. Replace `db/db.js` with a `pg` adapter that exposes the same `.prepare(sql).run(...)` / `.prepare(sql).get(...)` / `.prepare(sql).all(...)` interface (or convert to parameterized `pg.query` calls in each repository).
2. Update `DATABASE_URL` to a PostgreSQL connection string.
3. SQL in migrations uses standard ANSI SQL — the only SQLite-specific functions used are `datetime('now')` and `strftime()`; replace with `NOW()` and `TO_CHAR()` in PostgreSQL.

---

## Key Design Decisions

### Weekly timesheet state
There is no separate "timesheet" entity. A week's state is derived from its entries:
- **Draft** — all entries are draft
- **Pending** — at least one entry is pending
- **Approved** — all submitted entries are approved
- **Has rejections** — at least one entry is rejected

Submitting a week transitions all draft entries in that Mon–Sun window to `pending`.

### Failed-login protection
- After **5** consecutive failed login attempts, the account is locked for **15 minutes** (tracked in `users.locked_until` column — persists across server restarts).
- Resets on successful login.

### Admin reopening entries
When an admin reopens an `approved` entry, it returns to `draft`. The PM must re-submit. All state changes are logged in the audit trail.

### Budget burn rate
`burn_rate_per_day = total hours in trailing 30 days / 30`

`forecast_date = today + ceil(remaining_hours / burn_rate_per_day)`

If burn rate is 0, forecast shows `null` / "N/A".

### Approval rate
`approval_rate = approved_hours / (pending_hours + approved_hours + rejected_hours) × 100`

Excludes draft entries. Expressed as a percentage (e.g., `87.5`).

### Billable hours
Hours logged against projects where `billable = true`.

### Hours validation
- Min: 0.5h per entry
- Max: 12h per entry
- Must be in 0.5 increments
- Daily total > 8h: **warning** (orange)
- Daily total > 12h: **warning** (red)
- Daily total > 24h: **hard block** (server rejects)

---

## API Reference

All routes prefixed with `/api`. All responses: `{ success: true, data: ... }` or `{ success: false, error: "..." }`.

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login, returns JWT |
| POST | `/auth/logout` | Any | Clears session (client-side) |
| GET | `/auth/me` | Any | Current user info |
| POST | `/auth/change-password` | Any | Change own password |
| GET | `/users` | Admin | List PMs |
| POST | `/users` | Admin | Create PM |
| PUT | `/users/:id` | Admin | Edit PM |
| POST | `/users/:id/deactivate` | Admin | Deactivate PM |
| GET | `/projects` | PM+ | List projects |
| POST | `/projects` | Admin | Create project |
| POST | `/projects/:id/archive` | Admin | Archive project |
| GET | `/assignments` | Admin | All assignments |
| GET | `/assignments/my-projects` | PM | My active projects |
| POST | `/assignments` | Admin | Assign PM |
| POST | `/assignments/:id/end` | Admin | End assignment |
| GET | `/entries/week` | PM+ | Weekly timesheet |
| POST | `/entries` | PM+ | Log time entry |
| PUT | `/entries/:id` | PM+ | Edit entry |
| DELETE | `/entries/:id` | PM+ | Delete entry |
| POST | `/entries/submit` | PM | Submit week |
| POST | `/entries/:id/approve` | Admin | Approve entry |
| POST | `/entries/:id/reject` | Admin | Reject entry |
| POST | `/entries/:id/reopen` | Admin | Reopen approved entry |
| POST | `/entries/approve-week` | Admin | Bulk approve week |
| POST | `/entries/reject-week` | Admin | Bulk reject week |
| GET | `/reports/monthly` | Admin | Monthly summary |
| GET | `/reports/budget` | Admin | Budget report |
| GET | `/reports/workload` | Admin | PM workload |
| GET | `/reports/timeline` | Admin | Assignment timeline |
| GET | `/reports/approval` | Admin | Approval rates |
| GET | `/audit` | Admin | Audit log |
| GET | `/suggestions` | PM+ | Feature suggestions |
| POST | `/suggestions` | PM+ | Submit suggestion |
| PUT | `/suggestions/:id/status` | Admin | Update suggestion status |

Add `?export=csv` to any report route to download as CSV.
