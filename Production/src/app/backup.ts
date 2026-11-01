// File di backup .necro3d: uno ZIP con save.json (stato e indice) e le
// immagini come veri file JPEG (foto del cimitero in photos/, foto degli
// oggetti sepolti in graves/). Così non pesano un terzo in più come in
// base64, e aprendo lo ZIP si vedono come immagini normali. I vecchi
// backup (un unico JSON con le foto in base64) si importano ancora.

import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { t } from '../i18n/index.ts';
import type { LanguagePreference } from '../i18n/index.ts';

export const BACKUP_FORMAT = 'necrothing-3d';
export const BACKUP_VERSION = 3;

/** Foto scattata nel cimitero (galleria). */
export interface PhotoRecord { id: string; createdAt: string; dataUrl: string }
/** Foto dell'oggetto sepolto (la tomba la indica con `photoId`). */
export interface MemorialPhoto { id: string; dataUrl: string }

export interface BackupContent { state: unknown; photos: PhotoRecord[]; memorials: MemorialPhoto[]; exportedAt?: string; language?: LanguagePreference }

const isLanguagePreference = (value: unknown): value is LanguagePreference => value === 'auto'
  || typeof value === 'string' && ['it', 'en', 'de', 'fr', 'es', 'pt', 'zh-Hans', 'zh-Hant', 'ja', 'ko'].includes(value);

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export function dataUrlToBytes(url: string): { bytes: Uint8Array; mime: string } {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(url);
  if (!m) throw new Error(t('backup.invalidImage'));
  const raw = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return { bytes, mime: m[1] };
}

export function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(s)}`;
}

/** Nome di file sicuro per un id (gli id sono già semplici, ma non si sa mai). */
const safe = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, '_');

export function packBackup(state: unknown, photos: PhotoRecord[], memorials: MemorialPhoto[], exportedAt = new Date().toISOString(), language?: LanguagePreference): Uint8Array {
  const files: Zippable = {};
  const put = (dir: string, id: string, dataUrl: string) => {
    const { bytes, mime } = dataUrlToBytes(dataUrl);
    const name = `${dir}/${safe(id)}.${EXT[mime] ?? 'bin'}`;
    files[name] = [bytes, { level: 0 }]; // già compresse: si copiano così come sono
    return name;
  };
  const index = {
    format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, state, ...(language ? { language } : {}),
    photos: photos.map((p) => ({ id: p.id, createdAt: p.createdAt, file: put('photos', p.id, p.dataUrl) })),
    memorials: memorials.map((m) => ({ id: m.id, file: put('graves', m.id, m.dataUrl) })),
  };
  files['save.json'] = strToU8(JSON.stringify(index));
  return zipSync(files, { level: 6 });
}

const isZip = (b: Uint8Array) => b.length > 3 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
/** I file di servizio che macOS aggiunge comprimendo una cartella (__MACOSX/, ._nome). */
const isJunk = (name: string) => name.startsWith('__MACOSX/') || /(^|\/)\._/.test(name);

export function unpackBackup(bytes: Uint8Array, depth = 0): BackupContent {
  if (!isZip(bytes)) {
    // vecchio formato: tutto in un JSON, foto in base64
    let parsed: { format?: string; state?: unknown; photos?: PhotoRecord[]; language?: unknown } | null = null;
    try { parsed = JSON.parse(strFromU8(bytes)); } catch { /* sotto: file non riconosciuto */ }
    if (parsed?.format !== BACKUP_FORMAT) throw new Error(t('backup.unknownFile'));
    return { state: parsed.state, photos: parsed.photos ?? [], memorials: [], ...(isLanguagePreference(parsed.language) ? { language: parsed.language } : {}) };
  }
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(bytes, { filter: (f) => !isJunk(f.name) }); } catch { throw new Error(t('backup.corrupt')); }
  // save.json in cima, oppure dentro la cartella con cui è stato ricompresso il backup:
  // le immagini si cercano accanto a lui
  const index = Object.keys(files).filter((n) => n === 'save.json' || n.endsWith('/save.json')).sort((a, b) => a.length - b.length)[0];
  if (!index) {
    // il backup intero dentro uno zip (es. il file .necro3d compresso di nuovo): si apre quello
    if (depth === 0) {
      for (const [name, b] of Object.entries(files)) {
        if (name.endsWith('/') || !b.length) continue;
        try { return unpackBackup(b, depth + 1); } catch { /* non era lui: si prova il prossimo */ }
      }
    }
    throw new Error(t('backup.unknownFile'));
  }
  const dir = index.slice(0, -'save.json'.length);
  let parsed: { format?: string; exportedAt?: string; state?: unknown; language?: unknown; photos?: Array<{ id: string; createdAt: string; file: string }>; memorials?: Array<{ id: string; file: string }> };
  try { parsed = JSON.parse(strFromU8(files[index])); } catch { throw new Error(t('backup.corrupt')); }
  if (parsed.format !== BACKUP_FORMAT) throw new Error(t('backup.unknownFile'));
  const image = (file: string) => {
    const b = files[dir + file];
    return b ? bytesToDataUrl(b, MIME[file.split('.').pop() ?? ''] ?? 'application/octet-stream') : null;
  };
  const photos: PhotoRecord[] = [];
  for (const p of parsed.photos ?? []) { const dataUrl = image(p.file); if (dataUrl) photos.push({ id: p.id, createdAt: p.createdAt, dataUrl }); }
  const memorials: MemorialPhoto[] = [];
  for (const m of parsed.memorials ?? []) { const dataUrl = image(m.file); if (dataUrl) memorials.push({ id: m.id, dataUrl }); }
  return { state: parsed.state, photos, memorials, exportedAt: parsed.exportedAt, ...(isLanguagePreference(parsed.language) ? { language: parsed.language } : {}) };
}
