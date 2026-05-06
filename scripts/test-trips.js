/**
 * Allway Taxi — Trip Dispatch Test Runner
 *
 * Usage:
 *   node scripts/test-trips.js status          → show all trips in DB
 *   node scripts/test-trips.js single          → 1 trip popup test
 *   node scripts/test-trips.js multi           → 3 trips 2s apart
 *   node scripts/test-trips.js high            → high-fare trip ($35)
 *   node scripts/test-trips.js rapid           → 4 trips instantly
 *   node scripts/test-trips.js expiry          → countdown expiry test
 *   node scripts/test-trips.js decline         → driver decline test
 *   node scripts/test-trips.js clear           → delete pending trips only
 *   node scripts/test-trips.js clearall        → delete ALL trips
 *
 *   ── Edge / tricky cases ──────────────────────────────────
 *   node scripts/test-trips.js race            → two trips, first-accept-wins check
 *   node scripts/test-trips.js nullfare        → trip with missing fare (edge)
 *   node scripts/test-trips.js longaddress     → very long address text (layout test)
 *   node scripts/test-trips.js debtallowed     → trip with allow_debt=true
 *   node scripts/test-trips.js debtblocked     → trip with allow_debt=false
 *   node scripts/test-trips.js offlinedispatch → dispatch while driver offline
 *   node scripts/test-trips.js acceptcheck     → verify DB status after accept
 *   node scripts/test-trips.js cleardisappear  → dispatch then clear → button vanishes
 *   node scripts/test-trips.js all             → full dispatch suite
 *   node scripts/test-trips.js edge            → all edge cases
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL      = 'https://hfybipzfzmxucuiaxbeu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmeWJpcHpmem14dWN1aWF4YmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTE1OTMsImV4cCI6MjA5MTU4NzU5M30.EBOrBEk-_d02799FL3JjcNkRCi-sED0T_ZnTrksdicY';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Colours ─────────────────────────────────────────────────────────────────
const g  = s => `\x1b[32m${s}\x1b[0m`;
const y  = s => `\x1b[33m${s}\x1b[0m`;
const r  = s => `\x1b[31m${s}\x1b[0m`;
const b  = s => `\x1b[1m${s}\x1b[0m`;
const d  = s => `\x1b[90m${s}\x1b[0m`;
const hr = () => console.log(d('─'.repeat(60)));
const sleep = ms => new Promise(res => setTimeout(res, ms));

function log(msg)  { console.log(`${g('✓')}  ${msg}`); }
function warn(msg) { console.log(`${y('⚠')}  ${msg}`); }
function err(msg)  { console.log(`${r('✗')}  ${msg}`); }
function info(msg) { console.log(`${d('·')}  ${msg}`); }

// ─── Sample trips ─────────────────────────────────────────────────────────────
const TRIPS = {
  standard: {
    customer_name: 'Ahmad Khoury', customer_phone: '+961 71 234 567',
    pickup_address: 'Hamra, Beirut', dropoff_address: 'ABC Mall, Dbayeh',
    fare_usd: 22.00, distance_km: 14.0, status: 'pending',
  },
  verdun: {
    customer_name: 'Maria Saab', customer_phone: '+961 71 555 888',
    pickup_address: 'Verdun, Beirut', dropoff_address: 'Dbayeh Highway, Metn',
    fare_usd: 18.00, distance_km: 11.5, status: 'pending',
  },
  aub: {
    customer_name: 'Sara Rizk', customer_phone: '+961 70 987 654',
    pickup_address: 'Achrafieh, Beirut', dropoff_address: 'AUB Medical Center',
    fare_usd: 12.00, distance_km: 4.2, status: 'pending',
  },
  highFare: {
    customer_name: 'Tony Hajj', customer_phone: '+961 76 111 222',
    pickup_address: 'Jounieh, Highway', dropoff_address: 'Downtown Beirut',
    fare_usd: 35.00, distance_km: 22.0, status: 'pending',
  },
  nullFare: {
    customer_name: 'No Fare Passenger', customer_phone: '+961 70 000 001',
    pickup_address: 'Mar Mikhael, Beirut', dropoff_address: 'Gemmayze',
    fare_usd: null, distance_km: 1.2, status: 'pending',
  },
  longAddress: {
    customer_name: 'Longname Verylongfamilyname',
    customer_phone: '+961 70 000 002',
    pickup_address: 'Nahr El Mot Highway, Industrial Zone, Building 47, Ground Floor',
    dropoff_address: 'Charles Helou Avenue, Near the Port, Warehouse District, Beirut',
    fare_usd: 28.00, distance_km: 9.5, status: 'pending',
  },
  withDebt: {
    customer_name: 'Rami Debt', customer_phone: '+961 70 000 003',
    pickup_address: 'Sin El Fil', dropoff_address: 'Jdeideh',
    fare_usd: 15.00, distance_km: 5.0, status: 'pending', allow_debt: true,
  },
  noDebt: {
    customer_name: 'Karen NoDebt', customer_phone: '+961 70 000 004',
    pickup_address: 'Zalka', dropoff_address: 'Antelias',
    fare_usd: 10.00, distance_km: 3.0, status: 'pending', allow_debt: false,
  },
};

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function insert(trip) {
  const { data, error } = await sb.from('trips').insert(trip).select('id').single();
  if (error) { err(`Insert failed: ${error.message}`); return null; }
  log(`Dispatched → ${d(data.id.slice(0,8)+'…')}  ${trip.pickup_address} → ${trip.dropoff_address}  ${g('$'+(trip.fare_usd ?? '?'))}`);
  return data.id;
}

async function getTrip(id) {
  const { data } = await sb.from('trips').select('*').eq('id', id).single();
  return data;
}

async function clearPending() {
  const { error } = await sb.from('trips').delete().eq('status', 'pending');
  if (error) err(`Clear pending failed: ${error.message}`);
  else log('Pending trips cleared.');
}

async function clearAll() {
  const { error } = await sb.from('trips').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) err(`Clear all failed: ${error.message}`);
  else warn('All trips deleted.');
}

async function showStatus() {
  const { data } = await sb.from('trips')
    .select('id,customer_name,pickup_address,dropoff_address,fare_usd,status,payment_method,driver_id,requested_at')
    .order('requested_at', { ascending: false }).limit(20);
  if (!data?.length) { warn('No trips.'); return; }
  console.log(`\n  ${'STATUS'.padEnd(12)} ${'CUSTOMER'.padEnd(18)} ${'FARE'.padEnd(8)} ${'PAYMENT'.padEnd(10)} ${'PICKUP'.padEnd(22)} DRIVER`);
  hr();
  const colours = { pending: y, accepted: y, picked_up: g, completed: g, no_show: r, cancelled: r };
  data.forEach(t => {
    const col = colours[t.status] ?? (s=>s);
    console.log(
      `  ${col((t.status||'').padEnd(12))} ` +
      `${(t.customer_name||'—').padEnd(18)} ` +
      `${'$'+(t.fare_usd??'?')}`.padEnd(8) + ' ' +
      `${(t.payment_method||'—').padEnd(10)} ` +
      `${(t.pickup_address||'').slice(0,20).padEnd(22)} ` +
      `${t.driver_id ? t.driver_id.slice(0,8)+'…' : d('(unassigned)')}`
    );
  });
  console.log('');
}

// ─── Standard tests ───────────────────────────────────────────────────────────
async function testSingle() {
  console.log('\n' + b('Test 1 — Single Trip Dispatch'));
  hr(); info('Expected: popup appears on driver phone within 2 seconds.');
  await clearPending(); await sleep(400);
  await insert(TRIPS.standard);
}

async function testMulti() {
  console.log('\n' + b('Test 2 — Multiple Trips (3 trips, 2s apart)'));
  hr(); info('Expected: popup per trip, "Trips Available" button grows to 3.');
  await clearPending(); await sleep(400);
  for (let i = 0; i < 3; i++) {
    await insert([TRIPS.standard, TRIPS.verdun, TRIPS.aub][i]);
    if (i < 2) await sleep(2000);
  }
}

async function testHighFare() {
  console.log('\n' + b('Test 3 — High-Fare Trip ($35 / 22km)'));
  hr(); info('Expected: $35 displayed prominently in popup.');
  await clearPending(); await sleep(400);
  await insert(TRIPS.highFare);
}

async function testRapidFire() {
  console.log('\n' + b('Test 4 — Rapid-Fire (4 trips instantly)'));
  hr(); info('Expected: 1 popup + "4 Trips Available" button.');
  await clearPending(); await sleep(400);
  for (const t of [TRIPS.standard, TRIPS.verdun, TRIPS.aub, TRIPS.highFare]) await insert(t);
}

async function testExpiry() {
  console.log('\n' + b('Test 5 — Timer Expiry (84s countdown)'));
  hr(); info('Expected: popup closes after 84s, trip stays pending, button remains.');
  await clearPending(); await sleep(400);
  await insert(TRIPS.verdun);
  log('Watch the popup auto-close after 84 seconds. Trip stays pending.');
}

async function testDecline() {
  console.log('\n' + b('Test 6 — Driver Decline'));
  hr(); info('Expected: popup closes, trip stays pending, "1 Trip Available" button shows.');
  await clearPending(); await sleep(400);
  await insert(TRIPS.aub);
  log('Tap Decline in the app. Button should still show "1 Trip Available".');
}

// ─── Edge / tricky cases ──────────────────────────────────────────────────────

async function testRaceCondition() {
  console.log('\n' + b('Edge 1 — Race Condition (first-accept-wins)'));
  hr();
  info('Two trips inserted simultaneously.');
  info('Expected: driver sees popup for first, carousel for both.');
  info('After accepting one, the other stays pending in button.');
  await clearPending(); await sleep(400);
  await Promise.all([insert(TRIPS.standard), insert(TRIPS.highFare)]);
  log('Accept one trip → it should disappear. The other stays in the button.');
}

async function testNullFare() {
  console.log('\n' + b('Edge 2 — Trip with NULL Fare'));
  hr();
  info('Expected: popup shows "$?" or "$0" gracefully — no crash.');
  await clearPending(); await sleep(400);
  await insert(TRIPS.nullFare);
}

async function testLongAddress() {
  console.log('\n' + b('Edge 3 — Very Long Address Text'));
  hr();
  info('Expected: addresses truncate cleanly — no overflow or broken layout.');
  await clearPending(); await sleep(400);
  await insert(TRIPS.longAddress);
}

async function testDebtAllowed() {
  console.log('\n' + b('Edge 4 — Debt Payment Allowed'));
  hr();
  info('Expected: when driver taps "End Trip", Payment modal shows 3 options');
  info('including 📋 Account (Debt).');
  await clearPending(); await sleep(400);
  await insert(TRIPS.withDebt);
  log('Accept the trip, complete it → verify Debt option appears in payment modal.');
}

async function testDebtBlocked() {
  console.log('\n' + b('Edge 5 — Debt Payment Blocked'));
  hr();
  info('Expected: Payment modal shows only 💵 Cash and 💳 Card — no Debt option.');
  await clearPending(); await sleep(400);
  await insert(TRIPS.noDebt);
  log('Accept the trip, complete it → verify Debt option is hidden.');
}

async function testOfflineDispatch() {
  console.log('\n' + b('Edge 6 — Dispatch While Driver is Offline'));
  hr();
  info('Make sure driver is OFFLINE (shift not started) before running this.');
  info('Expected: trip inserted as pending but NO popup fires on the phone.');
  info('When driver later goes online, it should appear in the available list.');
  await clearPending(); await sleep(400);
  await insert(TRIPS.standard);
  log('Trip is now pending in DB. Go online → should see "1 Trip Available" button.');
}

async function testAcceptCheck() {
  console.log('\n' + b('Edge 7 — Verify DB Status After Accept'));
  hr();
  info('Driver must be online. After accepting the trip, re-run:');
  info('  node scripts/test-trips.js status');
  info('Expected: status changes from "pending" to "accepted", driver_id is set.');
  await clearPending(); await sleep(400);
  const id = await insert(TRIPS.verdun);
  if (!id) return;
  log(`Trip ID: ${id}`);
  log('Accept it in the app, then run "status" command to verify DB.');
}

async function testClearDisappear() {
  console.log('\n' + b('Edge 8 — Clear Trips → Button Vanishes (Realtime DELETE)'));
  hr();
  info('Expected: after clear, "Trips Available" button disappears instantly.');
  await clearPending(); await sleep(400);
  for (const t of [TRIPS.standard, TRIPS.verdun, TRIPS.aub]) await insert(t);
  log('3 trips dispatched — button should show "3 Trips Available".');
  log('Waiting 5 seconds before clearing...');
  await sleep(5000);
  await clearPending();
  log('Cleared. Button should have vanished from the home screen instantly.');
}

async function runAll() {
  console.log('\n' + b('\x1b[36m  Allway Taxi — Full Dispatch Test Suite\x1b[0m'));
  hr();
  await testSingle();    log('→ Accept or let expire. Continuing in 6s…'); await sleep(6000);
  await testMulti();     log('→ Check button grows. Continuing in 8s…'); await sleep(8000);
  await testHighFare();  log('→ Check $35 fare. Continuing in 5s…'); await sleep(5000);
  await testRapidFire(); log('→ Check button shows 4. Continuing in 5s…'); await sleep(5000);
  await clearPending();
  console.log('\n' + g('Dispatch suite complete. Pending trips cleared.'));
}

async function runEdge() {
  console.log('\n' + b('\x1b[36m  Allway Taxi — Edge Case Test Suite\x1b[0m'));
  hr();
  await testNullFare();      log('→ Check no crash. Continuing in 5s…'); await sleep(5000); await clearPending();
  await testLongAddress();   log('→ Check layout. Continuing in 5s…'); await sleep(5000); await clearPending();
  await testDebtAllowed();   log('→ Accept + complete → verify debt option. Continuing in 8s…'); await sleep(8000); await clearPending();
  await testDebtBlocked();   log('→ Accept + complete → verify debt hidden. Continuing in 8s…'); await sleep(8000); await clearPending();
  await testClearDisappear();
  await sleep(2000);
  await testRaceCondition(); log('→ Accept one, other stays. Continuing in 8s…'); await sleep(8000); await clearPending();
  console.log('\n' + g('Edge case suite complete.'));
}

// ─── Entry point ──────────────────────────────────────────────────────────────
const cmd = process.argv[2] ?? 'help';

(async () => {
  switch (cmd) {
    case 'status':         await showStatus();          break;
    case 'single':         await testSingle();          break;
    case 'multi':          await testMulti();           break;
    case 'high':           await testHighFare();        break;
    case 'rapid':          await testRapidFire();       break;
    case 'expiry':         await testExpiry();          break;
    case 'decline':        await testDecline();         break;
    case 'race':           await testRaceCondition();   break;
    case 'nullfare':       await testNullFare();        break;
    case 'longaddress':    await testLongAddress();     break;
    case 'debtallowed':    await testDebtAllowed();     break;
    case 'debtblocked':    await testDebtBlocked();     break;
    case 'offlinedispatch':await testOfflineDispatch(); break;
    case 'acceptcheck':    await testAcceptCheck();     break;
    case 'cleardisappear': await testClearDisappear();  break;
    case 'clear':          await clearPending();        break;
    case 'clearall':       await clearAll();            break;
    case 'all':            await runAll();              break;
    case 'edge':           await runEdge();             break;
    default:
      console.log('\n' + b('Allway Taxi Test Runner') + '\n');
      console.log('  ' + b('Standard') + ':  single · multi · high · rapid · expiry · decline');
      console.log('  ' + b('Edge')     + ':  race · nullfare · longaddress · debtallowed · debtblocked');
      console.log('             offlinedispatch · acceptcheck · cleardisappear');
      console.log('  ' + b('Suites')   + ':  all · edge');
      console.log('  ' + b('Util')     + ':  status · clear · clearall\n');
  }
  process.exit(0);
})();
