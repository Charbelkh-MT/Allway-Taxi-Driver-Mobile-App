/**
 * Allway Taxi — Trip Dispatch Test Runner
 *
 * Usage:
 *   node scripts/test-trips.js status        → show all trips in DB
 *   node scripts/test-trips.js single        → dispatch 1 trip (popup test)
 *   node scripts/test-trips.js multi         → 3 trips, 2s apart (accumulation test)
 *   node scripts/test-trips.js high          → high-fare trip ($35)
 *   node scripts/test-trips.js rapid         → 4 trips instantly (stress test)
 *   node scripts/test-trips.js clear         → delete only pending/unaccepted trips (safe)
 *   node scripts/test-trips.js clearall      → delete ALL trips (destructive)
 *   node scripts/test-trips.js all           → run all dispatch tests with pauses
 */

const { createClient } = require('@supabase/supabase-js');

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://hfybipzfzmxucuiaxbeu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmeWJpcHpmem14dWN1aWF4YmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTE1OTMsImV4cCI6MjA5MTU4NzU5M30.EBOrBEk-_d02799FL3JjcNkRCi-sED0T_ZnTrksdicY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Sample trips ─────────────────────────────────────────────────────────────
const SAMPLE_TRIPS = [
  {
    customer_name:   'Ahmad Khoury',
    customer_phone:  '+961 71 234 567',
    pickup_address:  'Hamra, Beirut',
    pickup_lat:      33.8938,
    pickup_lng:      35.4897,
    dropoff_address: 'ABC Mall, Dbayeh',
    dropoff_lat:     33.9281,
    dropoff_lng:     35.5847,
    fare_usd:        22.00,
    distance_km:     14.0,
    status:          'pending',
  },
  {
    customer_name:   'Maria Saab',
    customer_phone:  '+961 71 555 888',
    pickup_address:  'Verdun, Beirut',
    pickup_lat:      33.8869,
    pickup_lng:      35.5131,
    dropoff_address: 'Dbayeh Highway, Metn',
    dropoff_lat:     33.9281,
    dropoff_lng:     35.5847,
    fare_usd:        18.00,
    distance_km:     11.5,
    status:          'pending',
  },
  {
    customer_name:   'Sara Rizk',
    customer_phone:  '+961 70 987 654',
    pickup_address:  'Achrafieh, Beirut',
    pickup_lat:      33.8886,
    pickup_lng:      35.5155,
    dropoff_address: 'AUB Medical Center',
    dropoff_lat:     33.9003,
    dropoff_lng:     35.4784,
    fare_usd:        12.00,
    distance_km:     4.2,
    status:          'pending',
  },
  {
    customer_name:   'Tony Hajj',
    customer_phone:  '+961 76 111 222',
    pickup_address:  'Jounieh, Highway',
    pickup_lat:      33.9808,
    pickup_lng:      35.6178,
    dropoff_address: 'Downtown Beirut',
    dropoff_lat:     33.8938,
    dropoff_lng:     35.5018,
    fare_usd:        35.00,
    distance_km:     22.0,
    status:          'pending',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const green  = s => `\x1b[32m${s}\x1b[0m`;
const yellow = s => `\x1b[33m${s}\x1b[0m`;
const red    = s => `\x1b[31m${s}\x1b[0m`;
const bold   = s => `\x1b[1m${s}\x1b[0m`;
const dim    = s => `\x1b[90m${s}\x1b[0m`;

function log(msg)  { console.log(`${green('✓')}  ${msg}`); }
function warn(msg) { console.log(`${yellow('⚠')}  ${msg}`); }
function err(msg)  { console.log(`${red('✗')}  ${msg}`); }
function hr()      { console.log(dim('─'.repeat(60))); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function insertTrip(trip) {
  const { data, error } = await supabase.from('trips').insert(trip).select('id').single();
  if (error) { err(`Insert failed: ${error.message}`); return null; }
  log(`Dispatched → ${dim(data.id.slice(0, 8) + '…')}  ${trip.pickup_address} → ${trip.dropoff_address}  ${green('$' + trip.fare_usd)}`);
  return data.id;
}

async function updateTrip(id, fields) {
  const { error } = await supabase.from('trips').update(fields).eq('id', id);
  if (error) { err(`Update failed: ${error.message}`); }
}

// Safe clear: only removes trips that haven't been accepted yet
async function clearPending() {
  const { error } = await supabase.from('trips').delete().eq('status', 'pending');
  if (error) { err(`Clear pending failed: ${error.message}`); return; }
  log('Pending trips cleared (completed trips kept).');
}

// Destructive clear: removes ALL trips
async function clearAll() {
  const { error } = await supabase.from('trips').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) { err(`Clear all failed: ${error.message}`); return; }
  warn('All trips deleted (including completed).');
}

async function showStatus() {
  const { data, error } = await supabase
    .from('trips')
    .select('id, customer_name, pickup_address, fare_usd, status, payment_method, driver_id, requested_at, completed_at')
    .order('requested_at', { ascending: false })
    .limit(20);
  if (error) { err(error.message); return; }
  if (!data.length) { warn('No trips in database.'); return; }

  console.log('');
  console.log(
    `  ${'STATUS'.padEnd(12)} ${'CUSTOMER'.padEnd(16)} ${'FARE'.padEnd(8)} ` +
    `${'PAYMENT'.padEnd(10)} ${'PICKUP'.padEnd(20)} DRIVER`
  );
  hr();
  data.forEach(t => {
    const statusColor = {
      pending:   yellow, accepted: yellow, picked_up: green,
      completed: green,  no_show:  red,    cancelled: red,
    }[t.status] ?? (s => s);

    console.log(
      `  ${statusColor(t.status.padEnd(12))} ` +
      `${(t.customer_name ?? '—').padEnd(16)} ` +
      `${'$' + (t.fare_usd ?? 0)}`.padEnd(8) + ' ' +
      `${(t.payment_method ?? '—').padEnd(10)} ` +
      `${(t.pickup_address ?? '').slice(0, 18).padEnd(20)} ` +
      `${t.driver_id ? t.driver_id.slice(0, 8) + '…' : dim('(unassigned)')}`
    );
  });
  console.log('');
}

// ─── Test cases ───────────────────────────────────────────────────────────────

async function testSingle() {
  console.log('\n' + bold('Test 1 — Single Trip Dispatch'));
  hr();
  console.log(dim('  Expected: popup appears on driver phone within 2 seconds.'));
  await clearPending();
  await sleep(400);
  await insertTrip(SAMPLE_TRIPS[0]);
}

async function testMulti() {
  console.log('\n' + bold('Test 2 — Multiple Trips (3 trips, 2s apart)'));
  hr();
  console.log(dim('  Expected: popup per trip, "Trips Available" button grows to 3.'));
  await clearPending();
  await sleep(400);
  for (let i = 0; i < 3; i++) {
    await insertTrip(SAMPLE_TRIPS[i]);
    if (i < 2) await sleep(2000);
  }
}

async function testHighFare() {
  console.log('\n' + bold('Test 3 — High-Fare Trip ($35 / 22 km)'));
  hr();
  console.log(dim('  Expected: $35 displayed prominently in popup.'));
  await clearPending();
  await sleep(400);
  await insertTrip(SAMPLE_TRIPS[3]);
}

async function testRapidFire() {
  console.log('\n' + bold('Test 4 — Rapid-Fire (4 trips instantly)'));
  hr();
  console.log(dim('  Expected: 1 popup + "4 Trips Available" button.'));
  await clearPending();
  await sleep(400);
  for (const trip of SAMPLE_TRIPS) {
    await insertTrip(trip);
  }
}

async function testExpiry() {
  console.log('\n' + bold('Test 5 — Timer Expiry (countdown runs out)'));
  hr();
  console.log(dim('  Expected: popup auto-closes after 84s, trip stays pending,'));
  console.log(dim('  "1 Trip Available" button appears.'));
  await clearPending();
  await sleep(400);
  await insertTrip(SAMPLE_TRIPS[1]);
  log('Wait 84 seconds and watch the popup close — button should remain.');
}

async function testDecline() {
  console.log('\n' + bold('Test 6 — Driver Declines'));
  hr();
  console.log(dim('  Expected: popup closes, trip stays pending, button appears.'));
  await clearPending();
  await sleep(400);
  await insertTrip(SAMPLE_TRIPS[2]);
  log('Tap Decline on the popup — "1 Trip Available" button should stay visible.');
}

async function runAll() {
  console.log('\n' + bold('\x1b[36m  Allway Taxi — Full Dispatch Test Suite\x1b[0m'));
  hr();

  await testSingle();
  log('→ Accept or let expire, then continuing in 6s…');
  await sleep(6000);

  await testMulti();
  log('→ Trips accumulating. Continuing in 8s…');
  await sleep(8000);

  await testHighFare();
  log('→ Check $35 fare in popup. Continuing in 5s…');
  await sleep(5000);

  await testRapidFire();
  log('→ Check button shows 4. Continuing in 5s…');
  await sleep(5000);

  await clearPending();
  console.log('\n' + green('All tests complete. Pending trips cleared.'));
}

// ─── Entry point ──────────────────────────────────────────────────────────────
const cmd = process.argv[2] ?? 'help';

(async () => {
  switch (cmd) {
    case 'status':   await showStatus();    break;
    case 'single':   await testSingle();    break;
    case 'multi':    await testMulti();     break;
    case 'high':     await testHighFare();  break;
    case 'rapid':    await testRapidFire(); break;
    case 'expiry':   await testExpiry();    break;
    case 'decline':  await testDecline();   break;
    case 'clear':    await clearPending();  break;
    case 'clearall': await clearAll();      break;
    case 'all':      await runAll();        break;
    default:
      console.log('\n' + bold('Allway Taxi Test Runner') + '\n');
      console.log('  node scripts/test-trips.js <command>\n');
      console.log('  ' + green('status') + '   — show all trips in DB');
      console.log('  ' + green('single') + '   — dispatch 1 trip (popup test)');
      console.log('  ' + green('multi') + '    — 3 trips, 2s apart');
      console.log('  ' + green('high') + '     — high-fare trip ($35)');
      console.log('  ' + green('rapid') + '    — 4 trips instantly');
      console.log('  ' + green('expiry') + '   — test countdown expiry');
      console.log('  ' + green('decline') + '  — test driver decline');
      console.log('  ' + green('clear') + '    — delete pending trips only');
      console.log('  ' + green('clearall') + ' — delete ALL trips (destructive)');
      console.log('  ' + green('all') + '      — run full test suite\n');
  }
  process.exit(0);
})();
