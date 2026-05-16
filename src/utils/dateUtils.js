// Shared date / time utilities used across screens
// Pass language = 'ar' for Arabic output, defaults to English.

// Arabic string lookup — kept inline so these pure functions need no context import
const AR = {
  today:       'اليوم',
  yesterday:   'أمس',
  tomorrow:    'غداً',
  startingNow: 'الآن',
  minsAgo:  n => `منذ ${n} د`,
  hoursAgo: n => `منذ ${n} س`,
  daysAgo:  n => n === 1 ? 'أمس' : `منذ ${n} أيام`,
  inMins:   n => `خلال ${n}د`,
  inHours:  (h, m) => m > 0 ? `خلال ${h}س ${m}د` : `خلال ${h}س`,
  inDays:   (d, h) => h > 0 ? `خلال ${d}ي ${h}س` : `خلال ${d}ي`,
};

// Locale string: Latin numerals with Arabic text to avoid ٠١٢٣ confusion
const locale = lang => lang === 'ar' ? 'ar-u-nu-latn' : 'en-US';

// Format seconds → MM:SS or HH:MM:SS (shift timer, trip timer)
export function formatTime(s) {
  const total = Math.max(0, Math.floor(Number(s) || 0));
  const h   = Math.floor(total / 3600);
  const m   = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

export function relativeTime(iso, language = 'en') {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return '';
  const diff  = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (language === 'ar') {
    if (mins  < 60)  return AR.minsAgo(mins);
    if (hours < 24)  return AR.hoursAgo(hours);
    return AR.daysAgo(days);
  }
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

// Returns ISO Monday of the current week and today's 0-based index (0=Mon…6=Sun)
export function getWeekBounds() {
  const now    = new Date();
  const isoDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - isoDay);
  monday.setHours(0, 0, 0, 0);
  return { monday: monday.toISOString(), todayIndex: isoDay };
}

export function sumFare(rows, fareCol) {
  return rows.reduce((s, r) => s + (Number(r[fareCol]) || 0), 0);
}

// "in 45min" / "in 2h 15min" / "in 3d 8h" / "Starting now"
export function timeUntil(iso, language = 'en') {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return '';
  const diffMs     = ts - Date.now();
  if (diffMs <= 0) return language === 'ar' ? AR.startingNow : 'Starting now';
  const totalMin   = Math.ceil(diffMs / 60000);
  const totalHours = Math.floor(totalMin / 60);
  const mins       = totalMin % 60;
  if (language === 'ar') {
    if (totalMin   < 60) return AR.inMins(totalMin);
    if (totalHours < 24) return AR.inHours(totalHours, mins);
    const days  = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return AR.inDays(days, hours);
  }
  if (totalMin   < 60) return `in ${totalMin}min`;
  if (totalHours < 24) return mins > 0 ? `in ${totalHours}h ${mins}min` : `in ${totalHours}h`;
  const days  = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours > 0 ? `in ${days}d ${hours}h` : `in ${days}d`;
}

// "Today · 9:43 PM" / "Yesterday · 2:15 PM" / "May 14 · 11:30 AM"
export function formatTripDateTime(iso, language = 'en') {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return '';
  const d    = new Date(iso);
  const now  = new Date();
  const loc  = locale(language);
  const time = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12: true });
  if (d.toDateString() === now.toDateString())
    return `${language === 'ar' ? AR.today : 'Today'} · ${time}`;
  if (d.toDateString() === new Date(now.getTime() - 86400000).toDateString())
    return `${language === 'ar' ? AR.yesterday : 'Yesterday'} · ${time}`;
  const date = d.toLocaleDateString(loc, { month: 'short', day: 'numeric' });
  return `${date} · ${time}`;
}

// "Today · 2:30 PM" / "Tomorrow · 9:00 AM" / "Sat 23 · 9:00 AM"
export function formatScheduledTime(iso, language = 'en') {
  if (!iso) return '';
  const d     = new Date(iso);
  const now   = new Date();
  const loc   = locale(language);
  const time  = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12: true });
  const isToday    = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  if (isToday)    return `${language === 'ar' ? AR.today    : 'Today'}    · ${time}`;
  if (isTomorrow) return `${language === 'ar' ? AR.tomorrow : 'Tomorrow'} · ${time}`;
  const day = d.toLocaleDateString(loc, { weekday: 'short', day: 'numeric' });
  return `${day} · ${time}`;
}
