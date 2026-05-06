// ── Allway Driver App — Shared Components ─────────────────────────────────

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #0D0D14; font-family: 'Inter', system-ui, sans-serif; color: #F0F0F0; }
  @keyframes pulse       { 0%,100%{opacity:1} 50%{opacity:.35} }
  @keyframes spin        { to{transform:rotate(360deg)} }
  @keyframes slideUp     { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeUp      { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes radarSweep  { from{transform:translate(-50%,-50%) rotate(0deg)} to{transform:translate(-50%,-50%) rotate(360deg)} }
  @keyframes ctaBreath   { 0%,100%{box-shadow:0 0 0 7px rgba(245,184,0,.08),0 8px 32px rgba(245,184,0,.35)} 50%{box-shadow:0 0 0 10px rgba(245,184,0,.12),0 8px 42px rgba(245,184,0,.5)} }
  @keyframes lucidBreath { 0%,100%{box-shadow:0 0 0 8px rgba(93,202,165,.06),0 0 20px rgba(93,202,165,.18)} 50%{box-shadow:0 0 0 10px rgba(93,202,165,.1),0 0 30px rgba(93,202,165,.3)} }
  @keyframes neonGlow    { 0%,100%{opacity:.4;filter:blur(20px)} 50%{opacity:.85;filter:blur(38px)} }
  @keyframes cardBurst   { 0%{transform:scale(.92);opacity:1} 100%{transform:scale(1.18);opacity:0} }
  @keyframes progressBar { from{width:0} to{width:60%} }
  @keyframes sheetUp     { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
  .action-btn { transition: all .18s cubic-bezier(0.4,0,0.2,1) !important; }
  .action-btn:active { transform: scale(.96) !important; opacity: .8 !important; }
  .tab-item { transition: all .18s cubic-bezier(0.4,0,0.2,1) !important; }
  .tab-item:active { transform: scale(.9) !important; opacity: .7 !important; }
  input::placeholder { color: rgba(255,255,255,.22); }
  input:focus { border-color: rgba(245,184,0,0.5) !important; box-shadow: 0 0 0 3px rgba(245,184,0,0.08) !important; }
  ::-webkit-scrollbar { width: 0; }
`;

// ── Logo SVG ──────────────────────────────────────────────────────────────────
function AllwayLogo({ size = 26, glow = true }) {
  return (
    <img
      src="assets/allway-logo.png"
      alt="Allway"
      style={{
        width: size,
        height: size * (24 / 26),
        filter: glow ? 'drop-shadow(0 2px 8px rgba(245,184,0,0.45))' : 'none',
        flexShrink: 0,
      }}
    />
  );
}

// ── Brand Name ─────────────────────────────────────────────────────────────────
function BrandName({ size = 13 }) {
  return (
    <span style={{ fontSize: size, fontWeight: 900, letterSpacing: 0.5, color: '#fff' }}>
      ALLWAY <span style={{ color: '#F5B800' }}>TAXI</span>
    </span>
  );
}

// ── AppBar ────────────────────────────────────────────────────────────────────
function AppBar({ online }) {
  return (
    <div style={{
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 18px 10px',
      background: 'rgba(13,13,20,0.96)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AllwayLogo size={26} />
        <BrandName size={13} />
      </div>
      <StatusPill online={online} />
    </div>
  );
}

// ── Status Pill ───────────────────────────────────────────────────────────────
function StatusPill({ online }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      padding: '5px 11px',
      borderRadius: 999,
      background: online ? 'rgba(93,202,165,0.1)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${online ? 'rgba(93,202,165,0.3)' : 'rgba(255,255,255,0.08)'}`,
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: online ? '#5DCAA5' : 'rgba(255,255,255,0.22)',
        boxShadow: online ? '0 0 7px #5DCAA5' : 'none',
        animation: online ? 'pulse 2s infinite' : 'none',
      }} />
      <span style={{
        fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
        color: online ? '#5DCAA5' : 'rgba(255,255,255,0.3)',
      }}>{online ? 'ONLINE' : 'OFFLINE'}</span>
    </div>
  );
}

// ── TabBar ────────────────────────────────────────────────────────────────────
function TabBar({ tab, setTab }) {
  const tabs = [
    {
      id: 'home', label: 'Home',
      icon: (active) => (
        <>
          <path d="M3 10.5L12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 8.5V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V8.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ),
    },
    {
      id: 'trips', label: 'Trips',
      icon: (active) => (
        <>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15.5 14" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ),
    },
    {
      id: 'account', label: 'Account',
      icon: (active) => (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4 20c0-3.5 3.6-6.5 8-6.5s8 3 8 6.5" strokeLinecap="round" />
        </>
      ),
    },
  ];

  return (
    <div style={{
      flexShrink: 0,
      background: 'rgba(10,10,18,0.97)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      paddingBottom: 8,
    }}>
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <div
            key={t.id}
            className="tab-item"
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '8px 0 4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
              cursor: 'pointer',
              color: active ? '#F5B800' : 'rgba(255,255,255,.28)',
              position: 'relative',
            }}
          >
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 28, height: 2.5,
                background: 'linear-gradient(90deg,#E6A800,#F5B800)',
                borderRadius: '0 0 3px 3px',
              }} />
            )}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '5px 16px 3px',
              borderRadius: 12,
              background: active ? 'rgba(245,184,0,0.09)' : 'transparent',
              transition: 'background .2s ease',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                {t.icon(active)}
              </svg>
              <span style={{ fontSize: 10, fontWeight: active ? 800 : 600, letterSpacing: 0.1 }}>{t.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ShiftCard ─────────────────────────────────────────────────────────────────
function ShiftCard({ online, shiftTime, onToggle, disabled }) {
  const [burst, setBurst] = React.useState(false);

  function handleClick() {
    if (disabled) return;
    setBurst(true);
    setTimeout(() => setBurst(false), 500);
    onToggle();
  }

  return (
    <div style={{ margin: '0 18px', position: 'relative' }}>
      <div style={{
        borderRadius: 22,
        background: online
          ? 'linear-gradient(145deg, rgba(18,38,28,0.95), rgba(10,22,16,0.98))'
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${online ? 'rgba(93,202,165,0.18)' : 'rgba(255,255,255,0.07)'}`,
        padding: '20px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: online ? '0 8px 32px rgba(93,202,165,0.08)' : 'none',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: online ? '#5DCAA5' : 'rgba(255,255,255,0.2)',
              boxShadow: online ? '0 0 8px #5DCAA5' : 'none',
              animation: online ? 'pulse 2s infinite' : 'none',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
              color: online ? '#5DCAA5' : 'rgba(255,255,255,0.22)',
            }}>{online ? 'On Shift' : 'Offline'}</span>
          </div>
          {online ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
                GPS live · tracking on
              </div>
              <div style={{
                fontSize: 22, fontWeight: 900, fontFamily: 'monospace',
                color: 'rgba(255,255,255,0.88)', letterSpacing: 2, marginTop: 2,
              }}>{shiftTime}</div>
            </div>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.42)' }}>
              Tap to start your shift
            </div>
          )}
        </div>

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            className="action-btn"
            onClick={handleClick}
            disabled={disabled}
            style={{
              width: 62, height: 62, borderRadius: '50%',
              border: disabled
                ? '2px solid rgba(255,255,255,0.1)'
                : online
                  ? '2px solid rgba(93,202,165,0.45)'
                  : '2px solid rgba(245,184,0,0.65)',
              background: disabled
                ? 'rgba(255,255,255,0.04)'
                : online
                  ? 'rgba(18,38,28,0.98)'
                  : 'linear-gradient(145deg,#F5B800,#d99e00)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: disabled ? 'none' : online ? 'lucidBreath 3s ease-in-out infinite' : 'ctaBreath 3s ease-in-out infinite',
              transition: 'all 0.4s',
              position: 'relative',
              opacity: disabled ? 0.4 : 1,
            }}
          >
            {burst && (
              <div style={{
                position: 'absolute', inset: -4, borderRadius: '50%',
                border: `2px solid ${online ? 'rgba(93,202,165,0.75)' : 'rgba(245,184,0,0.75)'}`,
                animation: 'cardBurst 0.5s ease-out forwards',
                pointerEvents: 'none',
              }} />
            )}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke={disabled ? 'rgba(255,255,255,0.2)' : online ? '#5DCAA5' : '#111'}
              strokeWidth="2.5" strokeLinecap="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </button>
        </div>
      </div>
      {disabled && (
        <div style={{
          textAlign: 'center', fontSize: 10, fontWeight: 700,
          color: 'rgba(255,255,255,0.25)', marginTop: 8, letterSpacing: 0.3,
        }}>
          Complete trip first
        </div>
      )}
    </div>
  );
}

// ── Mini Earnings Chart ───────────────────────────────────────────────────────
function MiniEarnings({ earned, trips, empty }) {
  const bars = empty
    ? [0, 0, 0, 0, 0, 0, 0]
    : [34, 52, 28, 60, 12, 0, 0];
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayIdx = 3;

  return (
    <div style={{
      margin: '18px 18px 0',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 18,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.25)', letterSpacing: 1, textTransform: 'uppercase' }}>
            This Week
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#F5B800', marginTop: 3 }}>
            {empty ? '—' : `$${earned}`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', fontWeight: 600 }}>
            {empty ? '0 trips' : `${trips} trips`}
          </div>
        </div>
      </div>
      <div style={{ padding: '0 20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 5, height: 64 }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{
                width: '100%',
                height: empty ? 4 : Math.max(h, 4),
                background: empty
                  ? 'rgba(255,255,255,0.07)'
                  : i === todayIdx
                    ? 'linear-gradient(180deg,#F5B800,#e6a800)'
                    : h > 0
                      ? 'rgba(245,184,0,0.28)'
                      : 'rgba(255,255,255,0.06)',
                borderRadius: '3px 3px 0 0',
                boxShadow: (!empty && i === todayIdx) ? '0 4px 12px rgba(245,184,0,.3)' : 'none',
              }} />
              <span style={{
                fontSize: 9, fontWeight: (!empty && i === todayIdx) ? 800 : 600,
                color: (!empty && i === todayIdx) ? '#F5B800' : 'rgba(255,255,255,.25)',
              }}>{labels[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────
function QuickActions() {
  return (
    <div style={{ padding: '18px 18px 0' }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.25)', letterSpacing: 1.2, marginBottom: 10, textTransform: 'uppercase' }}>
        Quick Actions
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Call Support', sub: '24/7 helpline', icon: '📞', bg: 'rgba(93,202,165,.1)', border: 'rgba(93,202,165,.22)' },
          { label: 'Report Issue', sub: 'Submit a ticket', icon: '🚨', bg: 'rgba(240,149,149,.08)', border: 'rgba(240,149,149,.2)' },
        ].map(q => (
          <div key={q.label} className="action-btn" style={{
            background: q.bg,
            border: `1px solid ${q.border}`,
            borderRadius: 16, padding: '16px', cursor: 'pointer',
          }}>
            <div style={{ fontSize: 20, marginBottom: 9 }}>{q.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{q.label}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>{q.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Trip Row ──────────────────────────────────────────────────────────────────
function TripRow({ name, pickup, dropoff, fare, status, time }) {
  const statusMeta = {
    completed: { color: '#5DCAA5', label: 'DONE' },
    dispatching: { color: '#F5B800', label: 'DISPATCHING' },
    cancelled: { color: '#F09595', label: 'CANCELLED' },
  };
  const meta = statusMeta[status] || statusMeta.completed;
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div style={{
      background: 'rgba(255,255,255,.03)',
      border: '1px solid rgba(255,255,255,.07)',
      borderRadius: 16, padding: '14px 16px',
      animation: 'slideUp .3s ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: `linear-gradient(135deg, rgba(245,184,0,0.15), rgba(245,184,0,0.06))`,
            border: '1px solid rgba(245,184,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#F5B800', flexShrink: 0,
          }}>{initials}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F0F0F0' }}>{name}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', marginTop: 1 }}>{time}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {fare && <span style={{ fontSize: 14, fontWeight: 900, color: '#F5B800' }}>{fare}</span>}
          <span style={{
            fontSize: 9, fontWeight: 800,
            color: meta.color,
            background: `${meta.color}18`,
            border: `1px solid ${meta.color}28`,
            borderRadius: 6, padding: '3px 7px',
            letterSpacing: 0.4,
          }}>{meta.label}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, paddingTop: 3, flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5DCAA5' }} />
          <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,.1)' }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F09595' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pickup}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dropoff}</div>
        </div>
      </div>
    </div>
  );
}

// ── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 800,
      color: 'rgba(255,255,255,.28)',
      letterSpacing: 1.5, textTransform: 'uppercase',
      marginBottom: 10,
    }}>{children}</div>
  );
}

Object.assign(window, {
  GLOBAL_CSS,
  AllwayLogo, BrandName, AppBar, StatusPill,
  TabBar, ShiftCard, MiniEarnings, QuickActions,
  TripRow, SectionLabel,
});
