// Alone radiale bianco con l'opacità che sfuma dal centro al bordo.
// Calcolato pixel per pixel invece che con un gradiente su canvas: lì il
// browser salva i colori premoltiplicati per l'opacità e li arrotonda (con il
// dithering) canale per canale, così ai bordi quasi trasparenti alcuni pixel
// tornano rossi, verdi o blu e sotto le luci si vedevano puntini colorati.

import * as THREE from 'three';

/** `stops`: [distanza dal centro 0–1, opacità], in ordine. */
export function radialGlowTexture(stops: Array<[number, number]>, size = 128): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const alphaAt = (d: number) => {
    if (d >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
    for (let i = 1; i < stops.length; i++) {
      const [d1, a1] = stops[i];
      if (d <= d1) {
        const [d0, a0] = stops[i - 1];
        return a0 + (a1 - a0) * ((d - d0) / Math.max(1e-6, d1 - d0));
      }
    }
    return 0;
  };
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      data[o] = data[o + 1] = data[o + 2] = 255; // sempre bianco: il colore lo dà il materiale
      data[o + 3] = Math.round(255 * alphaAt(Math.min(1, Math.hypot(x - c, y - c) / (size / 2))));
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
