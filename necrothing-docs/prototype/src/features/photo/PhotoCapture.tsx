// Cattura foto: acquisisce uno screenshot del campo di gioco visibile,
// applica conversione B/N (senza pixelatura) e salva in Galleria o condivide.

import { useState } from 'react';
import html2canvas from 'html2canvas';
import { Sheet } from '@/shared/components/Sheet';
import { useGameStore } from '@/shared/store/gameStore';
import { grayscaleOnly } from '@/shared/utils/image';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export function PhotoCapture({ onClose, onSaved }: Props) {
  const addPhoto = useGameStore((s) => s.addPhoto);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const resultBlob = { current: null as Blob | null };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = async () => {
    setBusy(true);
    setError(null);
    try {
      // Cerca il contenitore della mappa di gioco (visibile sotto il drawer).
      const sceneEl =
        document.querySelector<HTMLElement>('.map-wrap') ??
        document.querySelector<HTMLElement>('.map-scroll');
      if (!sceneEl) throw new Error('Campo di gioco non trovato.');

      const canvas = await html2canvas(sceneEl, {
        useCORS: true,
        allowTaint: true,
        scale: window.devicePixelRatio,
        logging: false,
      });

      const raw: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('screenshot'))), 'image/png'),
      );
      const out = await grayscaleOnly(raw);
      resultBlob.current = out;
      setResultUrl(URL.createObjectURL(out));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore durante la cattura.');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!resultBlob.current) return;
    setBusy(true);
    await addPhoto(resultBlob.current);
    setBusy(false);
    onSaved();
  };

  const share = async () => {
    if (!resultBlob.current) return;
    const file = new File([resultBlob.current], 'necrothing.png', { type: 'image/png' });
    const nav = navigator as Navigator & {
      canShare?: (d?: { files?: File[] }) => boolean;
      share?: (d: { files?: File[]; title?: string }) => Promise<void>;
    };
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      await nav.share({ files: [file], title: 'NECROTHING' });
    } else {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
    await addPhoto(resultBlob.current);
    onSaved();
  };

  const reset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    resultBlob.current = null;
  };

  return (
    <Sheet title="Foto del cimitero" onClose={onClose}>
      {!resultUrl && (
        <div className="field">
          <p className="muted" style={{ fontSize: 13 }}>
            Cattura il tuo cimitero così com&apos;è ora: la foto sarà in bianco e nero.
          </p>
          {error && <div className="error">{error}</div>}
          <button className="btn btn--primary" onClick={capture} disabled={busy}>
            {busy ? 'Cattura…' : '📸 Cattura il campo'}
          </button>
        </div>
      )}

      {resultUrl && (
        <div className="field" style={{ textAlign: 'center' }}>
          <img
            src={resultUrl}
            alt="risultato"
            style={{ maxWidth: '100%', borderRadius: 10 }}
          />
          <div className="wizard-nav">
            <button className="btn" onClick={reset} disabled={busy}>
              Rifai
            </button>
            <button className="btn" onClick={share} disabled={busy}>
              📤 Condividi
            </button>
            <button className="btn btn--primary" onClick={save} disabled={busy}>
              💾 Salva
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
