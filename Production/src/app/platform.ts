// Ciclo di vita condiviso tra browser di sviluppo e app Capacitor.
// Gli eventi DOM e nativi possono descrivere la stessa pausa: LifecycleGate li deduplica.

import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface LifecycleHandlers {
  pause: () => void;
  resume: () => void;
  blur: () => void;
  focus: () => void;
  /** Ritorna true se il tasto Indietro è stato consumato dall'interfaccia. */
  backButton?: () => boolean;
}

/** Riduce più notifiche equivalenti a una sola transizione di stato. */
export class LifecycleGate {
  private paused: boolean;
  private focused: boolean;
  private readonly handlers: LifecycleHandlers;

  constructor(handlers: LifecycleHandlers, paused: boolean, focused: boolean) {
    this.handlers = handlers;
    this.paused = paused;
    this.focused = focused;
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.handlers.pause();
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.handlers.resume();
    // Alcuni WebView non mandano focus dopo il rientro in primo piano.
    this.focus();
  }

  blur() {
    if (!this.focused) return;
    this.focused = false;
    this.handlers.blur();
  }

  focus() {
    if (this.focused) return;
    this.focused = true;
    this.handlers.focus();
  }
}

/** I plugin nativi si usano solo dentro Capacitor; nel browser le API restano assenti. */
export function nativePlugins() {
  return Capacitor.isNativePlatform() ? { App, LocalNotifications } : null;
}

/** Ascolta gli eventi di pagina e Capacitor; ritorna una funzione di cleanup. */
export function watchLifecycle(h: LifecycleHandlers): () => void {
  const gate = new LifecycleGate(h, document.hidden, document.hasFocus());
  const onVisibility = () => (document.hidden ? gate.pause() : gate.resume());
  const onShow = () => { if (!document.hidden) gate.resume(); };
  const onBlur = () => gate.blur();
  const onFocus = () => gate.focus();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onShow);
  document.addEventListener('pause', onPause);
  document.addEventListener('resume', onResume);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);

  const nativeHandles: Promise<PluginListenerHandle>[] = [];
  if (Capacitor.isNativePlatform()) {
    nativeHandles.push(App.addListener('appStateChange', (state) => (state.isActive ? gate.resume() : gate.pause())));
    if (h.backButton) nativeHandles.push(App.addListener('backButton', ({ canGoBack }) => {
      if (h.backButton?.()) return;
      if (canGoBack) window.history.back();
      else void App.exitApp();
    }));
  }

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onShow);
    document.removeEventListener('pause', onPause);
    document.removeEventListener('resume', onResume);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
    void Promise.all(nativeHandles).then((handles) => Promise.all(handles.map((handle) => handle.remove())));
  };

  function onPageHide() { gate.pause(); }
  function onPause() { gate.pause(); }
  function onResume() { gate.resume(); }
}
