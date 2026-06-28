// Galleria: griglia delle foto pixel-art salvate. Apri per condividere o
// eliminare. I blob vengono caricati on-demand come object URL e revocati.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/shared/store/gameStore';
import { galleryService } from '@/shared/services/galleryService';
import { Sheet } from '@/shared/components/Sheet';

function useObjectUrls(ids: string[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const cache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const wanted = new Set(ids);
    // Revoca quelli non più presenti.
    for (const [id, url] of cache.current) {
      if (!wanted.has(id)) {
        URL.revokeObjectURL(url);
        cache.current.delete(id);
      }
    }
    (async () => {
      for (const id of ids) {
        if (cache.current.has(id)) continue;
        const blob = await galleryService.getBlob(id);
        if (cancelled || !blob) continue;
        cache.current.set(id, URL.createObjectURL(blob));
      }
      if (!cancelled) setUrls(Object.fromEntries(cache.current));
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  useEffect(
    () => () => {
      for (const url of cache.current.values()) URL.revokeObjectURL(url);
      cache.current.clear();
    },
    [],
  );

  return urls;
}

export function GalleryPage() {
  const navigate = useNavigate();
  const photos = useGameStore((s) => s.photos);
  const removePhoto = useGameStore((s) => s.removePhoto);
  const ids = photos.map((p) => p.id);
  const urls = useObjectUrls(ids);
  const [openId, setOpenId] = useState<string | null>(null);

  const open = photos.find((p) => p.id === openId) ?? null;
  const openUrl = openId ? urls[openId] : undefined;

  const share = async () => {
    if (!openId) return;
    const blob = await galleryService.getBlob(openId);
    if (!blob) return;
    const file = new File([blob], 'necrothing.png', { type: 'image/png' });
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
  };

  const del = async () => {
    if (!openId) return;
    await removePhoto(openId);
    setOpenId(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="btn btn--ghost" onClick={() => navigate('/')} aria-label="Indietro">
          ← Cimitero
        </button>
        <strong style={{ marginLeft: 8 }}>Galleria</strong>
        <span className="weather-badge">{photos.length}</span>
      </header>

      <div className="scene-wrap">
        {photos.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: 24 }}>
            Nessun ricordo, per ora. Scatta una foto del cimitero dalla mappa. 📷
          </p>
        ) : (
          <div className="gallery-grid">
            {photos.map((p) => (
              <button
                key={p.id}
                className="gallery-cell"
                onClick={() => setOpenId(p.id)}
                aria-label="Apri foto"
              >
                {urls[p.id] ? (
                  <img src={urls[p.id]} alt="ricordo" style={{ imageRendering: 'pixelated' }} />
                ) : (
                  <span className="muted">…</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {open && (
        <Sheet title={new Date(open.createdAt).toLocaleString('it-IT')} onClose={() => setOpenId(null)}>
          <div style={{ textAlign: 'center' }}>
            {openUrl && (
              <img
                src={openUrl}
                alt="ricordo"
                style={{ maxWidth: '100%', borderRadius: 10, imageRendering: 'pixelated' }}
              />
            )}
            <div className="wizard-nav">
              <button className="btn btn--danger" onClick={del}>
                🗑 Elimina
              </button>
              <button className="btn btn--primary" onClick={share}>
                📤 Condividi
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
