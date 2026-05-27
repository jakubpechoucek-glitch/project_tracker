// Returns ISO date string YYYY-MM-DD for a given Date object
function toDateStr(date) {
  return date.toISOString().slice(0, 10);
}

// Returns the Monday of the ISO week containing the given date string
function weekStartOf(dateStr) {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return toDateStr(d);
}

// Returns the Sunday of the ISO week containing the given date string
function weekEndOf(dateStr) {
  const start = weekStartOf(dateStr);
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + 6);
  return toDateStr(d);
}

// Adds n days to a date string
function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return toDateStr(d);
}

// Returns today as YYYY-MM-DD
function today() {
  return toDateStr(new Date());
}

// Returns YYYY-MM for a date string
function toYearMonth(dateStr) {
  return dateStr.slice(0, 7);
}

module.exports = { toDateStr, weekStartOf, weekEndOf, addDays, today, toYearMonth };
