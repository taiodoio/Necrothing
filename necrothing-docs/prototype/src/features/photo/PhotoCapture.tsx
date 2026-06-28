// Cattura foto: scegli/scatta un'immagine, ritaglia con un rettangolo
// ridimensionabile, applica pixel-art B/N e salva in Galleria (o condividi).

import { useEffect, useRef, useState } from 'react';
import { Sheet } from '@/shared/components/Sheet';
import { useGameStore } from '@/shared/store/gameStore';
import { pixelateGrayscale } from '@/shared/utils/image';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

interface Crop {
  x: number;
  y: number;
  size: number;
}

const FRAME = 300; // lato dell'area di anteprima (px)

export function PhotoCapture({ onClose, onSaved }: Props) {
  const addPhoto = useGameStore((s) => s.addPhoto);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgBox, setImgBox] = useState({ w: FRAME, h: FRAME });
  const [crop, setCrop] = useState<Crop>({ x: 20, y: 20, size: 160 });
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const resultBlob = useRef<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ mode: 'move' | 'resize'; px: number; py: number; c: Crop } | null>(null);

  useEffect(() => () => {
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [srcUrl, resultUrl]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setResultUrl(null);
    resultBlob.current = null;
    setSrcUrl(URL.createObjectURL(f));
  };

  const onImgLoad = () => {
    const el = imgRef.current;
    if (!el) return;
    const ratio = el.naturalWidth / el.naturalHeight;
    const w = ratio >= 1 ? FRAME : Math.round(FRAME * ratio);
    const h = ratio >= 1 ? Math.round(FRAME / ratio) : FRAME;
    setImgBox({ w, h });
    const size = Math.round(Math.min(w, h) * 0.8);
    setCrop({ x: Math.round((w - size) / 2), y: Math.round((h - size) / 2), size });
  };

  const clampCrop = (c: Crop): Crop => {
    const size = Math.max(40, Math.min(c.size, imgBox.w, imgBox.h));
    const x = Math.max(0, Math.min(c.x, imgBox.w - size));
    const y = Math.max(0, Math.min(c.y, imgBox.h - size));
    return { x, y, size };
  };

  const onPointerDown = (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = { mode, px: e.clientX, py: e.clientY, c: crop };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (d.mode === 'move') setCrop(clampCrop({ ...d.c, x: d.c.x + dx, y: d.c.y + dy }));
    else setCrop(clampCrop({ ...d.c, size: d.c.size + Math.max(dx, dy) }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const capture = async () => {
    const el = imgRef.current;
    if (!el) return;
    setBusy(true);
    try {
      const scaleX = el.naturalWidth / imgBox.w;
      const scaleY = el.naturalHeight / imgBox.h;
      const sx = crop.x * scaleX;
      const sy = crop.y * scaleY;
      const sw = crop.size * scaleX;
      const sh = crop.size * scaleY;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas non disponibile.');
      ctx.drawImage(el, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const cropped: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('crop'))), 'image/png'),
      );
      const file = new File([cropped], 'cattura.png', { type: 'image/png' });
      const out = await pixelateGrayscale(file);
      resultBlob.current = out;
      setResultUrl(URL.createObjectURL(out));
    } catch {
      /* ignora */
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

  return (
    <Sheet title="Foto del cimitero" onClose={onClose}>
      {!srcUrl && (
        <div className="field">
          <p className="muted" style={{ fontSize: 13 }}>
            Scatta o scegli una foto: ritagliala e diventerà un ricordo pixel-art in bianco e nero.
          </p>
          <label className="btn btn--primary" style={{ display: 'inline-flex', cursor: 'pointer' }}>
            📷 Scatta / Scegli
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={onPick}
            />
          </label>
        </div>
      )}

      {srcUrl && !resultUrl && (
        <div className="field">
          <div
            style={{
              position: 'relative',
              width: imgBox.w,
              height: imgBox.h,
              margin: '0 auto',
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            <img
              ref={imgRef}
              src={srcUrl}
              onLoad={onImgLoad}
              alt="da ritagliare"
              style={{ width: imgBox.w, height: imgBox.h, display: 'block', borderRadius: 8 }}
              draggable={false}
            />
            <div
              className="crop-box"
              style={{ left: crop.x, top: crop.y, width: crop.size, height: crop.size }}
              onPointerDown={onPointerDown('move')}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <span
                className="crop-handle"
                onPointerDown={onPointerDown('resize')}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              />
            </div>
          </div>
          <div className="wizard-nav">
            <button className="btn" onClick={() => setSrcUrl(null)} disabled={busy}>
              Indietro
            </button>
            <button className="btn btn--primary" onClick={capture} disabled={busy}>
              📸 Scatta
            </button>
          </div>
        </div>
      )}

      {resultUrl && (
        <div className="field" style={{ textAlign: 'center' }}>
          <img
            src={resultUrl}
            alt="risultato"
            style={{ maxWidth: '100%', borderRadius: 10, imageRendering: 'pixelated' }}
          />
          <div className="wizard-nav">
            <button className="btn" onClick={() => setResultUrl(null)} disabled={busy}>
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
