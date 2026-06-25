import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backupService } from '@/shared/services/backupService';
import { systemClock } from '@/shared/utils/clock';

export function BackupPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const doExport = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const text = await backupService.exportToString(systemClock);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `necrothing-${systemClock.todayIso()}.necro`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus('Backup esportato.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Errore di export.');
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Importare sostituirà tutti i dati attuali. Continuare?')) {
      e.target.value = '';
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const text = await file.text();
      await backupService.importFromString(text);
      setStatus('Backup importato. Ricarico…');
      setTimeout(() => window.location.assign('/'), 800);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Errore di import.');
      setBusy(false);
    }
    e.target.value = '';
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="btn btn--ghost"
          onClick={() => navigate('/settings')}
          aria-label="Indietro"
        >
          ← Impostazioni
        </button>
        <strong style={{ marginLeft: 8 }}>Backup</strong>
      </header>

      <div className="scene-wrap">
        <p className="muted" style={{ fontSize: 13 }}>
          I tuoi dati restano sul dispositivo. Esporta un file <code>.necro</code> per
          conservarli o trasferirli. Nessun cloud, nessun account.
        </p>

        <div className="field" style={{ marginTop: 16 }}>
          <button className="btn btn--primary" onClick={doExport} disabled={busy}>
            💾 Esporta backup .necro
          </button>
        </div>

        <h3 style={{ marginTop: 18 }}>Importa</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Attenzione: l'import sostituisce completamente i dati attuali.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".necro,application/json"
          onChange={onFile}
          style={{ display: 'none' }}
        />
        <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
          📂 Importa da file
        </button>

        {status && (
          <p className="muted" style={{ marginTop: 16 }}>
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
