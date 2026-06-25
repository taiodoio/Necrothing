import { Link, useNavigate } from 'react-router-dom';

const ITEMS: { to: string; icon: string; label: string; desc: string }[] = [
  { to: '/settings/notifications', icon: '🔔', label: 'Notifiche', desc: 'Locali, narrative, disattivabili' },
  { to: '/achievements', icon: '🏆', label: 'Achievement', desc: 'I tuoi traguardi da custode' },
  { to: '/settings/backup', icon: '💾', label: 'Backup', desc: 'Esporta / importa file .necro' },
  { to: '/settings/about', icon: '🪦', label: 'Info', desc: 'Privacy e versione' },
];

export function SettingsHub() {
  const navigate = useNavigate();
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="btn btn--ghost" onClick={() => navigate('/')} aria-label="Indietro">
          ← Cimitero
        </button>
        <strong style={{ marginLeft: 8 }}>Impostazioni</strong>
      </header>
      <div className="scene-wrap">
        <ul className="timeline">
          {ITEMS.map((it) => (
            <li key={it.to}>
              <Link
                to={it.to}
                style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, color: 'inherit', textDecoration: 'none' }}
              >
                <span style={{ fontSize: 22 }}>{it.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{it.label}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {it.desc}
                  </div>
                </div>
                <span className="muted">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
