// Shared date / time utilities used across screens

// Format seconds → MM:SS or HH:MM:SS (used for shift timer and trip timer)
export function formatTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

export function relativeTime(iso) {
  if (!iso) return '';
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

// Returns ISO Monday of the current week as a string, plus today's 0-based index (0=Mon…6=Sun)
export function getWeekBounds() {
  const now    = new Date();
  const isoDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - isoDay);
  monday.setHours(0, 0, 0, 0);
  return { monday: monday.toISOString(), todayIndex: isoDay };
}

// Sums the fare column over an array of raw Supabase trip rows
export function sumFare(rows, fareCol) {
  return rows.reduce((s, r) => s + (Number(r[fareCol]) || 0), 0);
}
