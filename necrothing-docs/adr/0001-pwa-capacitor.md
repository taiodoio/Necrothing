# ADR 0001: PWA + Capacitor

Data: 2026-06-25
Stato: Accettata

## Contesto

NECROTHING deve essere sviluppata come applicazione local-first, installabile come PWA e pubblicabile come app nativa su iOS e Android.

## Decisione

Utilizzare React + TypeScript + Vite per la PWA e Capacitor per il packaging nativo.

## Motivazioni

- Una sola codebase.
- Accesso a plugin nativi.
- Compatibilità con notifiche locali.
- Buona integrazione con SQLite locale.
- Distribuzione possibile sia web sia store.
- Minore complessità rispetto a Unity per un gestionale 2D.

## Conseguenze

Positive:

- Sviluppo più rapido.
- UI web moderna.
- Buona compatibilità con AI coding tools.

Negative:

- Differenze tra storage web e native da gestire tramite adapter.
- Alcune funzionalità PWA dipendono dal browser.
- Testing multipiattaforma necessario.
