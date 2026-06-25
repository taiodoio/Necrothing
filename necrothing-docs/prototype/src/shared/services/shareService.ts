// Generazione card condivisibile: "Certificato di Morte" di una tomba.
// Il disegno è un SVG (autorato), convertito in PNG per la condivisione.
// generateCardSvg è puro (testabile); la conversione PNG vive nel browser.

import type { Grave } from '@/shared/domain/types';
import {
  CATEGORY_LABELS,
  DEATH_CAUSE_LABELS,
  type DeathCause,
} from '@/shared/domain/enums';

export const CARD_W = 600;
export const CARD_H = 800;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function causeLabel(cause: string): string {
  return (DEATH_CAUSE_LABELS as Record<string, string>)[cause as DeathCause] ?? cause;
}

/** Spezza una stringa in righe entro un numero massimo di caratteri. */
function wrap(text: string, max: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

export function generateCardSvg(grave: Grave): string {
  const name = escapeXml(grave.name);
  const category = escapeXml(CATEGORY_LABELS[grave.category]);
  const cause = escapeXml(causeLabel(grave.deathCause));
  const dates = grave.birthDate
    ? `${escapeXml(grave.birthDate)} — ${escapeXml(grave.deathDate)}`
    : `† ${escapeXml(grave.deathDate)}`;
  const epitaphLines = grave.epitaph ? wrap(grave.epitaph, 38, 3) : [];

  const epitaphSvg = epitaphLines
    .map(
      (line, i) =>
        `<text x="300" y="${560 + i * 30}" text-anchor="middle" font-family="Georgia, serif" font-size="20" font-style="italic" fill="#c9bfe6">«${escapeXml(
          line,
        )}»</text>`,
    )
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#16131f"/>
      <stop offset="1" stop-color="#0d0b12"/>
    </linearGradient>
  </defs>
  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#bg)"/>
  <rect x="24" y="24" width="${CARD_W - 48}" height="${CARD_H - 48}" rx="18" fill="none" stroke="#3a3550" stroke-width="2"/>
  <rect x="34" y="34" width="${CARD_W - 68}" height="${CARD_H - 68}" rx="14" fill="none" stroke="#2a2640" stroke-width="1"/>

  <text x="300" y="96" text-anchor="middle" font-family="Georgia, serif" font-size="22" letter-spacing="4" fill="#9b87c4">CERTIFICATO DI MORTE</text>
  <line x1="160" y1="116" x2="440" y2="116" stroke="#3a3550" stroke-width="1"/>

  <!-- lapide -->
  <g transform="translate(300,250)">
    <ellipse cx="0" cy="92" rx="120" ry="26" fill="#1b1828"/>
    <path d="M-86 92 V-10 a86 86 0 0 1 172 0 V92 Z" fill="#5d5678"/>
    <path d="M-86 92 V-10 a86 86 0 0 1 172 0 V92 Z" fill="none" stroke="#2a2640" stroke-width="3"/>
    <rect x="-7" y="-2" width="14" height="70" rx="3" fill="#39334e"/>
    <rect x="-30" y="18" width="60" height="14" rx="3" fill="#39334e"/>
  </g>

  <text x="300" y="430" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-weight="700" fill="#e7e2f0">${name}</text>
  <text x="300" y="466" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#a79fc0">${category}</text>
  <text x="300" y="500" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#a79fc0">${dates}</text>
  <text x="300" y="528" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="#6f678c">Causa: ${cause}</text>

  ${epitaphSvg}

  <text x="300" y="724" text-anchor="middle" font-family="Georgia, serif" font-size="16" letter-spacing="2" fill="#9b87c4">NECROTHING</text>
  <text x="300" y="748" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="#6f678c">Il Cimitero degli Oggetti Morti</text>
</svg>`;
}

/** Converte una stringa SVG in un Blob PNG (solo browser). */
export async function svgToPngBlob(svg: string): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.width = CARD_W;
    img.height = CARD_H;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Impossibile rasterizzare la card.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas non disponibile.');
    ctx.drawImage(img, 0, 0, CARD_W, CARD_H);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob fallito.'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Condivide (Web Share API con file) o scarica la card PNG. */
export async function shareOrDownloadCard(grave: Grave): Promise<void> {
  const svg = generateCardSvg(grave);
  const png = await svgToPngBlob(svg);
  const file = new File([png], `necrothing-${grave.name.replace(/\s+/g, '_')}.png`, {
    type: 'image/png',
  });

  const navAny = navigator as Navigator & {
    canShare?: (data?: { files?: File[] }) => boolean;
    share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
  };
  if (navAny.canShare && navAny.canShare({ files: [file] }) && navAny.share) {
    await navAny.share({
      files: [file],
      title: 'NECROTHING',
      text: `Riposa in pace, ${grave.name}.`,
    });
    return;
  }

  const url = URL.createObjectURL(png);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
