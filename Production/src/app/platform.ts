// Il ciclo di vita dell'app, uguale nel browser (per il debug) e nell'app
// Capacitor: quando l'app va in background (o la scheda si nasconde) il
// gioco si ferma del tutto; quando perde il focus ma resta visibile (centro
// notifiche, chiamata in arrivo, split view, un'altra finestra davanti) va
// al minimo. Nell'app arrivano anche gli eventi di Capacitor: `pause` e
// `resume` sul documento, e `appStateChange` del plugin App se c'è.
// Nessuna dipendenza: i plugin nativi si leggono da window.Capacitor.

export interface LifecycleHandlers {
  /** L'app va in background (o si chiude): salvare, fermare il loop, pianificare le notifiche. */
  pause: () => void;
  /** L'app torna in primo piano. */
  resume: () => void;
  /** Visibile ma senza focus: rallentare al minimo. */
  blur: () => void;
  focus: () => void;
}

interface CapacitorPlugins {
  App?: { addListener: (e: 'appStateChange', cb: (s: { isActive: boolean }) => void) => unknown };
  LocalNotifications?: {
    checkPermissions: () => Promise<{ display: string }>;
    requestPermissions: () => Promise<{ display: string }>;
    schedule: (o: { notifications: Array<{ id: number; title: string; body: string; schedule: { at: Date; allowWhileIdle?: boolean } }> }) => Promise<unknown>;
    getPending: () => Promise<{ notifications: Array<{ id: number }> }>;
    cancel: (o: { notifications: Array<{ id: number }> }) => Promise<unknown>;
  };
}

/** I plugin nativi di Capacitor, se il gioco gira dentro l'app (nel browser: nessuno). */
export function nativePlugins(): CapacitorPlugins | null {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: CapacitorPlugins } }).Capacitor;
  return cap?.isNativePlatform?.() ? cap.Plugins ?? null : null;
}

/** Ascolta il ciclo di vita; ogni stato arriva una volta sola anche se più eventi lo annunciano. Ritorna chi smette di ascoltare. */
export function watchLifecycle(h: LifecycleHandlers): () => void {
  let paused = document.hidden, focused = document.hasFocus();
  const pause = () => { if (paused) return; paused = true; h.pause(); };
  const resume = () => {
    if (!paused) return;
    paused = false;
    h.resume();
    // tornando in primo piano si ha anche il focus (alcuni WebView non mandano `focus`)
    if (!focused) { focused = true; h.focus(); }
  };
  const onVisibility = () => (document.hidden ? pause() : resume());
  const onShow = () => { if (!document.hidden) resume(); };
  const onBlur = () => { if (!focused) return; focused = false; h.blur(); };
  const onFocus = () => { if (focused) return; focused = true; h.focus(); };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', pause);
  window.addEventListener('pageshow', onShow);
  // Capacitor (Android e iOS) li manda sul documento
  document.addEventListener('pause', pause);
  document.addEventListener('resume', resume);
  const app = nativePlugins()?.App?.addListener('appStateChange', (s) => (s.isActive ? resume() : pause())) as { remove?: () => void } | Promise<{ remove?: () => void }> | undefined;
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', pause);
    window.removeEventListener('pageshow', onShow);
    document.removeEventListener('pause', pause);
    document.removeEventListener('resume', resume);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
    void Promise.resolve(app).then((l) => l?.remove?.());
  };
}
