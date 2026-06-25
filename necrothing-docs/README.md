# NECROTHING

**Il Cimitero degli Oggetti Morti**

Repository di documentazione, specifiche implementative e pianificazione per lo sviluppo di **NecROTHING**, una PWA local-first trasformabile in app nativa tramite Capacitor.

## Obiettivo

Costruire una documentazione operativa, AI-first e implementation-ready, utile per:

- definire il prodotto;
- guidare lo sviluppo tecnico;
- produrre backlog e task implementativi;
- mantenere coerenza tra design, UX, codice, asset e release;
- fornire contesto strutturato a strumenti come Cursor, Codex o Claude Code.

## Struttura

```text
necrothing-docs/
├── docs/          Documentazione principale
├── specs/         Specifiche implementative
├── adr/           Decisioni architetturali
├── prompts/       Prompt riutilizzabili per AI coding
├── tasks/         Task tecnici atomici
├── checklists/    Checklist QA, release e produzione
├── assets/        Placeholder e liste asset
└── prototype/     Futuro codice PWA
```

## Stack previsto

- React
- TypeScript
- Vite
- PWA (vite-plugin-pwa / Workbox)
- Capacitor
- Rendering SVG/DOM (vedi ADR 0002)
- Zustand
- SQLite locale su native
- IndexedDB fallback su web
- Local Notifications via Capacitor
- Export/import `.necro`

## Stato

Versione iniziale della documentazione: `v0.1`.
