// ── Allway Driver App — All Screens ──────────────────────────────────────────

// ── 1. SPLASH ─────────────────────────────────────────────────────────────────
function SplashScreen() {
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    const t = setTimeout(() => setProgress(60), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0D0D14', position: 'relative', overflow: 'hidden',
    }}>
      {/* BG halos */}
      <div style={{
        position: 'absolute', top: '-15%', left: '-20%',
        width: '80%', height: '55%',
        background: 'radial-gradient(circle, rgba(245,184,0,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-15%',
        width: '70%', height: '50%',
        background: 'radial-gradient(circle, rgba(93,202,165,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ position: 'relative', width: 108, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
        <div style={{
          position: 'absolute', inset: -20, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,184,0,0.25) 0%, transparent 70%)',
          animation: 'neonGlow 3s ease-in-out infinite',
        }} />
        <img src="assets/allway-logo.png" alt="Allway" style={{
          width: 90, height: 82, position: 'relative',
          filter: 'drop-shadow(0 6px 28px rgba(245,184,0,0.6))',
        }} />
      </div>

      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 1, marginBottom: 6 }}>
        ALLWAY <span style={{ color: '#F5B800' }}>TAXI</span>
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', fontWeight: 600, marginBottom: 48 }}>
        Driver Portal
      </div>

      {/* Progress bar */}
      <div style={{ width: 200, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'linear-gradient(90deg, #E6A800, #F5B800)',
          borderRadius: 999,
          transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 0 12px rgba(245,184,0,0.5)',
        }} />
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#5DCAA5', letterSpacing: 2, textTransform: 'uppercase' }}>
        Secure Protocol Active
      </div>
    </div>
  );
}

// ── 2. LOGIN ──────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [phone, setPhone] = React.useState('');
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!phone || !pin) { setError('Enter your phone number and PIN.'); return; }
    setError(''); setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 1000);
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative', background: '#0D0D14' }}>
      <div style={{ position: 'absolute', top: '-10%', left: '-20%', width: '75%', height: '50%', background: 'radial-gradient(circle, rgba(245,184,0,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-5%', right: '-10%', width: '65%', height: '45%', background: 'radial-gradient(circle, rgba(93,202,165,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 24px 40px' }}>
        {/* Logo block */}
        <div style={{ position: 'relative', width: 108, height: 100, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeUp .5s ease both' }}>
          <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,184,0,0.22) 0%, transparent 70%)', animation: 'neonGlow 3s ease-in-out infinite' }} />
          <img src="assets/allway-logo.png" alt="Allway" style={{ width: 90, height: 82, position: 'relative', filter: 'drop-shadow(0 6px 22px rgba(245,184,0,0.55))' }} />
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1, textAlign: 'center', animation: 'fadeUp .5s ease both .06s' }}>
          ALLWAY <span style={{ color: '#F5B800' }}>TAXI</span>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', marginTop: 5, marginBottom: 0, fontWeight: 600, animation: 'fadeUp .5s ease both .1s' }}>
          Driver Portal
        </div>

        {/* Glass card */}
        <div style={{
          background: 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 24, padding: '28px', width: '100%', marginTop: 36,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          animation: 'fadeUp .5s ease both .14s',
        }}>
          <form onSubmit={handleSubmit}>
            {/* Phone field */}
            <div style={{ marginBottom: 14 }}>
              <SectionLabel>Phone Number</SectionLabel>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeLinecap="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.0 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" />
                  </svg>
                </div>
                <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="70 111 222" style={{ width: '100%', padding: '14px 14px 14px 42px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, color: '#fff', fontSize: 15, fontFamily: 'Inter,sans-serif', fontWeight: 600, outline: 'none', transition: 'border .2s, box-shadow .2s' }} />
              </div>
            </div>

            {/* PIN field */}
            <div style={{ marginBottom: 8 }}>
              <SectionLabel>PIN Code</SectionLabel>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <input value={pin} onChange={e => setPin(e.target.value)} type="password" placeholder="••••" maxLength={6} style={{ width: '100%', padding: '14px 14px 14px 42px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, color: '#fff', fontSize: 16, fontFamily: 'Inter,sans-serif', fontWeight: 700, outline: 'none', transition: 'border .2s, box-shadow .2s', letterSpacing: 4 }} />
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 12, padding: '11px 14px', background: 'rgba(240,149,149,.08)', border: '1px solid rgba(240,149,149,.2)', borderRadius: 12, fontSize: 12, color: '#F09595', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              marginTop: 20, width: '100%', padding: '16px',
              background: 'linear-gradient(135deg,#F5B800,#E6A800)',
              color: '#000', border: 'none', borderRadius: 16,
              fontSize: 15, fontWeight: 900, cursor: 'pointer',
              fontFamily: 'Inter,sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 8px 24px rgba(245,184,0,0.28)',
              animation: 'ctaBreath 3s ease-in-out infinite',
            }}>
              {loading
                ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Signing in…</>
                : 'Sign In →'
              }
            </button>
          </form>
        </div>

        <div style={{ marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,.18)', textAlign: 'center', lineHeight: 1.6, fontWeight: 600 }}>
          iPhone? Tap <strong style={{ color: 'rgba(255,255,255,.35)' }}>Share → Add to Home Screen</strong>
        </div>
      </div>
    </div>
  );
}

// ── HOME SCREENS ──────────────────────────────────────────────────────────────

function GreetingHeader({ name }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  return (
    <div style={{ padding: '14px 20px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 }}>{greeting}</div>
        <div style={{ fontSize: 26, fontWeight: 900 }}>{name.split(' ')[0]}</div>
      </div>
    </div>
  );
}

// ── 3. HOME — OFFLINE ─────────────────────────────────────────────────────────
function HomeOffline({ driver, onGoOnline }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 28 }}>
      <GreetingHeader name={driver} />
      <ShiftCard online={false} onToggle={onGoOnline} shiftTime="00:00:00" disabled={false} />
      <MiniEarnings earned={0} trips={0} empty={true} />
      <QuickActions />
    </div>
  );
}

// ── 4. HOME — SCANNING ────────────────────────────────────────────────────────
function HomeScanning({ driver, shiftTime, onGoOffline }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 28 }}>
      <GreetingHeader name={driver} />
      <ShiftCard online={true} onToggle={onGoOffline} shiftTime={shiftTime} disabled={false} />

      {/* Radar card */}
      <div style={{ padding: '18px 18px 0' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(93,202,165,0.08), rgba(93,202,165,0.02))',
          border: '1px solid rgba(93,202,165,0.18)',
          borderRadius: 20, padding: '26px 20px 22px', textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 16px' }}>
            {[0, 14, 28].map((inset, i) => (
              <div key={i} style={{ position: 'absolute', inset, borderRadius: '50%', border: `1px solid rgba(93,202,165,${0.28 - i * 0.07})` }} />
            ))}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: '100%', height: '100%', borderRadius: '50%',
              background: 'conic-gradient(from 0deg, transparent 65%, rgba(93,202,165,0.45) 100%)',
              animation: 'radarSweep 2.8s linear infinite',
            }} />
            {/* Blips */}
            <div style={{ position: 'absolute', top: '22%', left: '62%', width: 5, height: 5, borderRadius: '50%', background: '#5DCAA5', boxShadow: '0 0 8px #5DCAA5', animation: 'pulse 2s infinite .3s' }} />
            <div style={{ position: 'absolute', top: '62%', left: '25%', width: 4, height: 4, borderRadius: '50%', background: '#5DCAA5', boxShadow: '0 0 6px #5DCAA5', animation: 'pulse 2s infinite .9s' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 8, height: 8, borderRadius: '50%', background: '#5DCAA5', boxShadow: '0 0 16px #5DCAA5' }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,.65)', letterSpacing: 0.3 }}>Scanning for trips…</div>
          <div style={{ fontSize: 11, color: 'rgba(93,202,165,0.5)', marginTop: 5, fontWeight: 600 }}>Live matching in your area</div>
        </div>
      </div>

      <MiniEarnings earned={312} trips={14} />
    </div>
  );
}

// ── 5. HOME — TRIPS AVAILABLE ─────────────────────────────────────────────────
function HomeTripsAvailable({ shiftTime, onAccept, onGoOffline }) {
  const trips = [
    { id: 1, pickup: 'Hamra, Beirut', dropoff: 'ABC Mall, Dbayeh', fare: '$22', dist: '14 km', customer: 'Ahmad K.' },
    { id: 2, pickup: 'Verdun, Beirut', dropoff: 'AUB Medical Center', fare: '$12', dist: '4.2 km', customer: 'Sara R.' },
  ];
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 28 }}>
      <GreetingHeader name="Ahmad Khoury" />
      <ShiftCard online={true} onToggle={onGoOffline} shiftTime={shiftTime} disabled={false} />

      <div style={{ padding: '18px 18px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#F5B800', letterSpacing: 0.8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5B800', boxShadow: '0 0 8px rgba(245,184,0,0.6)', animation: 'pulse 1s infinite' }} />
          AVAILABLE REQUESTS ({trips.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {trips.map(trip => (
            <div key={trip.id} style={{
              background: 'linear-gradient(135deg, rgba(245,184,0,0.07), rgba(245,184,0,0.02))',
              border: '1px solid rgba(245,184,0,0.22)',
              borderTop: '2px solid rgba(245,184,0,0.4)',
              borderRadius: 18, padding: '16px 16px 14px',
              boxShadow: '0 4px 24px rgba(245,184,0,0.08)',
              animation: 'slideUp .3s ease-out',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.28)', letterSpacing: 0.8, marginBottom: 4 }}>PICKUP</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trip.pickup}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.28)', marginTop: 10, letterSpacing: 0.8 }}>DROP-OFF</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 3 }}>{trip.dropoff}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#F5B800' }}>{trip.fare}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 3, fontWeight: 700 }}>{trip.dist}</div>
                </div>
              </div>
              <button className="action-btn" onClick={() => onAccept(trip)} style={{
                width: '100%', padding: '14px',
                background: 'linear-gradient(135deg,#F5B800,#E6A800)',
                border: 'none', borderRadius: 14,
                color: '#000', fontSize: 14, fontWeight: 900,
                cursor: 'pointer', fontFamily: 'Inter,sans-serif',
                boxShadow: '0 6px 20px rgba(245,184,0,0.25)',
              }}>✓ Accept Trip</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 6. HOME — ACTIVE TRIP ─────────────────────────────────────────────────────
function HomeActiveTrip({ trip, shiftTime, onComplete, onGoOffline }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 28 }}>
      <GreetingHeader name="Ahmad Khoury" />
      <ShiftCard online={true} onToggle={onGoOffline} shiftTime={shiftTime} disabled={true} />

      <div style={{ padding: '20px 18px 0' }}>
        <div style={{
          background: 'linear-gradient(145deg, rgba(93,202,165,.1), rgba(93,202,165,.03))',
          border: '1px solid rgba(93,202,165,.25)',
          borderRadius: 20, padding: '20px',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#5DCAA5', animation: 'pulse 1.5s infinite', boxShadow: '0 0 8px #5DCAA5' }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: '#5DCAA5', letterSpacing: 1.2 }}>ACTIVE TRIP IN PROGRESS</span>
          </div>

          {/* Customer */}
          <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 10 }}>{trip.customer}</div>

          {/* Phone pill */}
          <a href={`tel:${trip.phone}`} style={{
            fontSize: 13, color: '#F5B800', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 18,
            background: 'rgba(245,184,0,.09)', border: '1px solid rgba(245,184,0,.22)',
            borderRadius: 8, padding: '6px 12px', fontWeight: 700,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.0 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" />
            </svg>
            {trip.phone}
          </a>

          {/* Route */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#5DCAA5', marginTop: 4, flexShrink: 0, boxShadow: '0 0 8px rgba(93,202,165,0.5)' }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.25)', letterSpacing: 1, marginBottom: 3 }}>PICKUP</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{trip.pickup}</div>
              </div>
            </div>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,.1)', margin: '4px 0 4px 5px' }} />
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F09595', marginTop: 4, flexShrink: 0, boxShadow: '0 0 8px rgba(240,149,149,0.5)' }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.25)', letterSpacing: 1, marginBottom: 3 }}>DROP-OFF</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{trip.dropoff}</div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="action-btn" style={{
              flex: 1, padding: '13px 0',
              background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 14, color: 'rgba(255,255,255,.6)', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Inter,sans-serif',
            }}>🗺 Open Maps</button>
            <button className="action-btn" onClick={onComplete} style={{
              flex: 1.6, padding: '13px 0',
              background: 'linear-gradient(135deg,#5DCAA5,#3DAE8A)',
              border: 'none', borderRadius: 14, color: '#fff', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'Inter,sans-serif',
              boxShadow: '0 6px 20px rgba(93,202,165,0.25)',
            }}>✓ Complete Trip</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 7. TRIP REQUEST SHEET ─────────────────────────────────────────────────────
function TripRequestSheet({ trip, countdown, maxCountdown, onAccept, onDecline }) {
  const pct = (countdown / maxCountdown) * 100;
  const barColor = pct > 40 ? '#F5B800' : pct > 15 ? '#EF9F27' : '#F09595';
  const timerColor = pct > 40 ? '#F5B800' : pct > 15 ? '#EF9F27' : '#F09595';

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(0,0,0,.88)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'flex-end', zIndex: 100,
    }}>
      <div style={{
        width: '100%',
        background: '#16161F',
        borderRadius: '28px 28px 0 0',
        overflow: 'hidden',
        animation: 'sheetUp .35s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 -24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Countdown bar */}
        <div style={{ height: 4, background: 'rgba(255,255,255,.07)' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: barColor,
            transition: 'width 0.9s linear, background 0.3s',
            boxShadow: `0 0 8px ${barColor}80`,
          }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="assets/allway-logo.png" alt="" style={{ width: 22, height: 20, filter: 'drop-shadow(0 2px 6px rgba(245,184,0,0.5))' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F5B800', boxShadow: '0 0 10px #F5B800', animation: 'pulse 1s infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: '#F5B800', letterSpacing: 1.5, textTransform: 'uppercase' }}>New Trip Request</span>
            </div>
          </div>
          <div style={{
            background: 'rgba(245,184,0,0.12)',
            border: '1px solid rgba(245,184,0,0.3)',
            borderRadius: 20, padding: '4px 12px',
            fontSize: 14, fontWeight: 900, color: timerColor,
            minWidth: 52, textAlign: 'center',
            fontFamily: 'monospace',
          }}>{countdown}s</div>
        </div>

        {/* Route */}
        <div style={{ padding: '4px 24px 0' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#5DCAA5', marginTop: 4, flexShrink: 0, boxShadow: '0 0 8px rgba(93,202,165,0.4)' }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.3)', letterSpacing: 1, marginBottom: 3 }}>PICKUP</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{trip.pickup}</div>
            </div>
          </div>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,.1)', margin: '4px 0 4px 5px' }} />
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F09595', marginTop: 4, flexShrink: 0, boxShadow: '0 0 8px rgba(240,149,149,0.4)' }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.3)', letterSpacing: 1, marginBottom: 3 }}>DROP-OFF</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{trip.dropoff}</div>
            </div>
          </div>

          {/* Meta row */}
          <div style={{ display: 'flex', marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.07)' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.3)', letterSpacing: 0.8 }}>DISTANCE</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{trip.dist}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.3)', letterSpacing: 0.8 }}>FARE</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#F5B800', marginTop: 4 }}>{trip.fare}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.3)', letterSpacing: 0.8 }}>CUSTOMER</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#F0F0F0', marginTop: 4 }}>{trip.customer}</div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, padding: '18px 24px 30px' }}>
          <button className="action-btn" onClick={onDecline} style={{
            padding: '14px 20px',
            background: 'rgba(240,149,149,.08)', border: '1px solid rgba(240,149,149,.18)',
            borderRadius: 14, color: '#F09595', fontSize: 13, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'Inter,sans-serif',
          }}>Decline</button>
          <button className="action-btn" onClick={onAccept} style={{
            flex: 1, padding: '14px',
            background: 'linear-gradient(135deg,#F5B800,#E6A800)',
            border: 'none', borderRadius: 14, color: '#000', fontSize: 14, fontWeight: 900,
            cursor: 'pointer', fontFamily: 'Inter,sans-serif',
            boxShadow: '0 6px 20px rgba(245,184,0,0.28)',
          }}>✓ Accept</button>
        </div>
      </div>
    </div>
  );
}

// ── 8. TRIPS TAB ──────────────────────────────────────────────────────────────
function TripsScreen() {
  const [filter, setFilter] = React.useState('all');
  const trips = [
    { name: 'Ahmad Khoury', pickup: 'Hamra, Beirut', dropoff: 'ABC Mall, Dbayeh', fare: '$22', status: 'completed', time: '2h ago' },
    { name: 'Sara Rizk', pickup: 'Verdun, Beirut', dropoff: 'AUB Medical Center', fare: '$12', status: 'dispatching', time: '5h ago' },
    { name: 'Karim Nassar', pickup: 'Dora, Beirut', dropoff: 'Jal el Dib', fare: '$18', status: 'cancelled', time: 'Yesterday' },
    { name: 'Maya Haddad', pickup: 'Achrafieh', dropoff: 'Jounieh', fare: '$35', status: 'completed', time: 'Yesterday' },
    { name: 'Lara Gemayel', pickup: 'Raouche', dropoff: 'Antelias', fare: '$28', status: 'completed', time: '2 days ago' },
  ];
  const filtered = filter === 'all' ? trips : trips.filter(t => t.status === filter);
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'completed', label: 'Completed' },
    { id: 'dispatching', label: 'Dispatching' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px 28px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Trip History</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: 3, fontWeight: 600 }}>All your assigned trips</div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
        {[
          { val: '42', label: 'TOTAL', color: '#F0F0F0' },
          { val: '3', label: 'AWAITING', color: '#F5B800' },
          { val: '$860', label: 'EARNED', color: '#5DCAA5' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '14px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', marginTop: 3, fontWeight: 800, letterSpacing: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: 999,
            border: `1px solid ${filter === f.id ? '#F5B800' : 'rgba(255,255,255,.1)'}`,
            background: filter === f.id ? 'rgba(245,184,0,.12)' : 'transparent',
            color: filter === f.id ? '#F5B800' : 'rgba(255,255,255,.4)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif',
            transition: 'all .15s',
          }}>{f.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((t, i) => <TripRow key={i} {...t} />)}
      </div>
    </div>
  );
}

// ── 9. ACCOUNT TAB ────────────────────────────────────────────────────────────
function AccountScreen({ driver }) {
  const [pinOpen, setPinOpen] = React.useState(false);
  const name = driver || 'Ahmad Khoury';
  const initial = name[0];

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px 36px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>My Account</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: 3, fontWeight: 600 }}>Profile, stats &amp; settings</div>
      </div>

      {/* Profile hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245,184,0,.1), rgba(245,184,0,.03))',
        border: '1px solid rgba(245,184,0,.2)',
        borderRadius: 22, padding: '22px 18px 20px',
        marginBottom: 20, position: 'relative', overflow: 'hidden',
      }}>
        {/* Watermark */}
        <div style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.06, pointerEvents: 'none' }}>
          <img src="assets/allway-logo.png" alt="" style={{ width: 110 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, flexShrink: 0,
            background: 'linear-gradient(135deg,#F5B800,#E6A800)',
            color: '#000', fontSize: 26, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 24px rgba(245,184,0,.35)',
          }}>{initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 900, marginBottom: 3 }}>{name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', fontWeight: 600, marginBottom: 10 }}>Toyota Corolla · B 24681</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#5DCAA5', background: 'rgba(93,202,165,.12)', border: '1px solid rgba(93,202,165,.25)', borderRadius: 7, padding: '3px 9px' }}>⭐ 4.9</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#F5B800', background: 'rgba(245,184,0,.1)', border: '1px solid rgba(245,184,0,.2)', borderRadius: 7, padding: '3px 9px' }}>312 trips</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.5)', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, padding: '3px 9px' }}>94% accept</span>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings */}
      <SectionLabel>Earnings Breakdown</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[{ l: 'Today', v: '$86', t: '4 trips' }, { l: '7 Days', v: '$312', t: '14 trips' }, { l: '30 Days', v: '$1,240', t: '52 trips' }].map(p => (
          <div key={p.l} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '14px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#F5B800' }}>{p.v}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', marginTop: 3, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>{p.l}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', marginTop: 4, fontWeight: 600 }}>{p.t}</div>
          </div>
        ))}
      </div>

      {/* Vehicle details */}
      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: '18px', marginBottom: 12 }}>
        <SectionLabel>Vehicle Details</SectionLabel>
        {[['Car Model', 'Toyota Corolla'], ['Plate Number', 'B 24681'], ['Total Trips', '312'], ['Star Rating', '4.9 / 5.0']].map(([k, v], i) => (
          <div key={k} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: i > 0 ? '11px 0 0' : '0',
            borderTop: i > 0 ? '1px solid rgba(255,255,255,.05)' : 'none',
            marginTop: i > 0 ? 11 : 0,
          }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>{k}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Change PIN row */}
      <div
        className="action-btn"
        onClick={() => setPinOpen(!pinOpen)}
        style={{
          background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)',
          borderRadius: 14, padding: '16px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15 }}>🔑</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Change PIN</span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: pinOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Logout */}
      <button className="action-btn" style={{
        width: '100%', padding: '15px',
        background: 'rgba(240,149,149,.08)', border: '1px solid rgba(240,149,149,.15)',
        borderRadius: 14, color: '#F09595', fontSize: 13, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'Inter,sans-serif',
      }}>Logout &amp; End Session</button>
    </div>
  );
}

Object.assign(window, {
  SplashScreen, LoginScreen, GreetingHeader,
  HomeOffline, HomeScanning, HomeTripsAvailable, HomeActiveTrip,
  TripRequestSheet, TripsScreen, AccountScreen,
});
