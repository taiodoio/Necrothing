# Implementation Plan — PWA Mobile-First

Versione: `v0.1`
Data: 2026-06-25

## Obiettivo

Pianificare l'implementazione della PWA **NECROTHING** mobile-first, local-first,
native-ready (Capacitor), con rendering **SVG/DOM** e asset placeholder
sostituibili da SVG animati.

## Decisioni chiave

| Tema | Decisione | Note |
|---|---|---|
| Rendering | **SVG/DOM + React** | Sostituisce PixiJS (vedi ADR 0002). Animazioni via CSS/SMIL. |
| Approccio | **Mobile-first** | Layout progettato per touch e viewport stretti; scala a desktop. |
| Storage web | **IndexedDB** via `idb` | Adapter pattern, niente `localStorage`. |
| Storage native | **SQLite** (Capacitor) | Implementato in fase successiva tramite stesso adapter. |
| Asset | **Placeholder SVG inline** | Componenti React; swap futuro con SVG animati. |
| Scope iniziale | **MVP completo** | Burial flow + commemorazione + pulizia + simulazione base + notifiche. |

## Stack confermato

- React 18 + TypeScript + Vite
- `vite-plugin-pwa` (Workbox) per manifest + service worker offline
- Zustand (state) + React Router (routing)
- `idb` (IndexedDB wrapper) dietro repository + storage adapter
- Vitest + Testing Library (unit/component)
- Capacitor-ready (struttura), integrazione nativa in fase successiva

## Architettura a livelli

```text
UI (React, SVG scene)
  → Zustand stores
    → Use cases
      → Domain services
        → Repositories
          → StorageAdapter (Web: IndexedDB | Native: SQLite)
        → Platform adapters (Notifications, Filesystem, Share)
```

Nessun componente React conosce la piattaforma: tutto passa da adapter.

## Struttura cartelle (prototype/)

```text
prototype/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/
│   ├── manifest.webmanifest        (gestito da vite-plugin-pwa)
│   └── icons/                       (placeholder PWA icons)
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── app/                         router, providers, layout shell
    ├── features/
    │   ├── cemetery/                scena SVG, griglia
    │   ├── graves/                  grave entity, sprite, dettaglio
    │   ├── burial/                  wizard FEATURE-001
    │   ├── commemoration/           fiori, visite
    │   ├── maintenance/             erbacce
    │   ├── progression/             XP, ranghi, prestigio
    │   ├── simulation/              world simulation engine
    │   └── notifications/           preferenze + scheduler
    ├── shared/
    │   ├── assets/                  componenti SVG placeholder
    │   ├── components/              UI primitives (button, modal, xp bar)
    │   ├── domain/                  tipi entità + enum
    │   ├── db/                      schema + connessione IndexedDB
    │   ├── repositories/            grave, world, progression, settings
    │   ├── services/               	domain services + adapter platform
    │   ├── store/                    zustand stores
    │   ├── hooks/
    │   └── utils/                    id, date, rng (seeded), clock
    └── test/                        setup vitest
```

## Fasi

### Fase 0 — Fix documentazione (questa fase)

- Creare `docs/ux-ui/01-ux-structure.md` (link rotto nell'indice).
- Aggiungere `docs/technical/05-pwa-manifest-sw.md` (manifest + service worker + offline).
- Aggiornare `docs/technical/01-technical-architecture.md`: rendering SVG/DOM.
- Nuovo ADR `0002-svg-rendering.md` (PixiJS → SVG/DOM).
- Allineare `README.md` e `checklists/repository-checklist.md` con lo stato reale.
- Creare cartelle `assets/` e `prototype/` (dichiarate ma assenti).

### Fase 1 — Scaffold PWA

- Vite + React + TS, `vite-plugin-pwa`, manifest, SW offline.
- Struttura cartelle, router, shell UI mobile-first, theme gothic.
- Icone PWA placeholder.

### Fase 2 — Storage + data model

- Tipi dominio + enum (categorie, cause morte, meteo, stagioni, fasi giorno).
- Schema IndexedDB (`idb`), `StorageAdapter`, repositories.
- Seed `WorldState` singleton.

### Fase 3 — Scena cimitero SVG

- Griglia celle (`CemeteryCell`), pan/zoom touch, tap su cella.
- Componenti SVG placeholder (tile, lapidi, fiori, erbacce, NPC).

### Fase 4 — Burial flow + progressione

- Wizard multi-step (FEATURE-001) con validazioni.
- Creazione grave, assegnazione XP, ranghi, prestigio.

### Fase 5 — Commemorazione + manutenzione + simulazione

- Porta fiori, visita tomba (memory events).
- Rimozione erbacce.
- World simulation engine (run on open/foreground, seeded RNG).

### Fase 6 — Notifiche

- `NotificationService` + preferenze (quiet hours, per categoria).
- Web Notifications adapter; interfaccia Capacitor-ready.

### Fase 7 — Test + wiring finale

- Unit/component test (validazioni, XP, scheduling, simulazione).
- Wiring end-to-end, build PWA, commit/push.

## Asset placeholder → SVG animati

Ogni asset è un componente React in `shared/assets/` che riceve props
(`variant`, `state`, `size`). L'MVP usa forme SVG semplici; la sostituzione
con SVG animati avviene cambiando solo questi componenti, senza toccare
la logica di gioco.

## Out of scope (MVP)

- Capacitor build native (struttura pronta, integrazione successiva).
- SQLite native adapter.
- Sharing card PNG, achievement completi, zone tematiche, meteo avanzato.
