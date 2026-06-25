# NECROTHING — Prototype PWA

PWA local-first di NECROTHING. React + TypeScript + Vite, rendering SVG/DOM,
persistenza IndexedDB, mobile-first, native-ready (Capacitor).

Vedi `../docs/technical/04-implementation-plan.md`.

## Requisiti

- Node 20+ (sviluppato con Node 22)

## Comandi

```bash
npm install        # installa le dipendenze
npm run dev        # dev server (http://localhost:5173)
npm run build      # build di produzione (genera PWA + service worker)
npm run preview    # anteprima della build
npm run test       # test (Vitest)
npm run typecheck  # type-check
```

## Cosa include l'MVP

- Scaffold PWA installabile (manifest + service worker offline via `vite-plugin-pwa`).
- Persistenza locale su IndexedDB (`idb`) dietro repository.
- Scena cimitero SVG con griglia (mobile-first).
- Burial flow completo (FEATURE-001) con validazioni e **foto** opzionale.
- Progressione: Punti Necro (XP), ranghi, prestigio.
- Commemorazione (porta fiori) e manutenzione (pulizia erbacce).
- World simulation engine deterministico (erbacce, fiori appassiti, meteo, fantasmi,
  **anniversari**, **benedizione del prete**).
- **Limite giornaliero** sepolture astratte.
- **Achievement** (engine + pagina) con toast di sblocco.
- **Decorazioni** posizionabili sulle zolle, sbloccate per rango.
- **Backup/Import `.necro`** (export/import dell'intero stato, privacy-first).
- **Condivisione**: certificato di morte come immagine (Web Share API / download).
- Notifiche locali narrative con preferenze e quiet hours (adapter web).
- Impostazioni: hub con Notifiche, Achievement, Backup, Info.

## Architettura

```
UI (React + SVG)
 → Zustand store (use case)
   → Domain services (grave, progression, simulation, notification)
     → Repositories
       → IndexedDB (web)  |  SQLite (native, futuro)
     → Platform adapters (notifiche; filesystem/share futuri)
```

Nessun componente conosce la piattaforma: tutto passa da repository/adapter.

## Asset placeholder → SVG animati

Gli asset sono componenti SVG in `src/shared/assets/` (es. `GraveSprite`,
`EmptyPlotSprite`). Per sostituirli con SVG animati basta cambiare questi
componenti: la logica di gioco non cambia.

## Native (Capacitor) — prossimi passi

La struttura è pronta. Per il packaging nativo:

1. `npm i @capacitor/core @capacitor/cli` e `npx cap init`.
2. Aggiungere `NativeNotificationAdapter` (`@capacitor/local-notifications`)
   che implementa `LocalNotificationsAdapter`.
3. Aggiungere un repository SQLite con la stessa interfaccia dei repository web.
4. Selezionare l'adapter in base alla piattaforma all'avvio.
