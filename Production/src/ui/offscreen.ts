// Renderer fuori schermo (ritratti, miniature): sul telefono il loro contesto
// WebGL può andare perso (app in background, troppi contesti aperti) e da lì
// disegnerebbero immagini vuote. Prima di disegnare si controlla che sia vivo,
// dopo che l'immagine abbia qualcosa: una vuota non si tiene in cache.

import type * as THREE from 'three';

/** Il renderer c'è e il suo contesto non è perso. */
export function alive(r: THREE.WebGLRenderer | null): r is THREE.WebGLRenderer {
  return !!r && !r.getContext().isContextLost();
}

/** L'ultimo disegno ha almeno un pixel non trasparente (serve `preserveDrawingBuffer`). */
export function drewSomething(r: THREE.WebGLRenderer): boolean {
  const gl = r.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  if (!w || !h) return false;
  const px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  for (let i = 3; i < px.length; i += 4) if (px[i] > 12) return true;
  return false;
}
