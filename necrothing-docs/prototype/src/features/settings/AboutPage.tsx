import { useNavigate } from 'react-router-dom';

export function AboutPage() {
  const navigate = useNavigate();
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="btn btn--ghost" onClick={() => navigate('/settings')} aria-label="Indietro">
          ← Impostazioni
        </button>
        <strong style={{ marginLeft: 8 }}>Info</strong>
      </header>
      <div className="scene-wrap" style={{ fontSize: 14, lineHeight: 1.7 }}>
        <h3>NECROTHING</h3>
        <p className="muted">Il Cimitero degli Oggetti Morti — v0.1 (prototype)</p>
        <p>
          NECROTHING è un piccolo mondo personale, offline e privato, dove ogni oggetto sepolto
          lascia una traccia narrativa.
        </p>
        <h3 style={{ marginTop: 16 }}>Privacy</h3>
        <ul className="muted" style={{ paddingLeft: 18 }}>
          <li>Nessun account, nessun cloud.</li>
          <li>Nessun tracciamento, nessuna analytics esterna.</li>
          <li>I dati restano sul tuo dispositivo (IndexedDB).</li>
          <li>Backup manuale tramite file .necro.</li>
        </ul>
        <p className="muted" style={{ marginTop: 16, fontStyle: 'italic' }}>
          «I tuoi morti restano con te.»
        </p>
      </div>
    </div>
  );
}
