# PWA + Capacitor

Versione: `v0.1`

## Strategia

NECROTHING nasce come PWA installabile e viene impacchettata come app nativa tramite Capacitor.

## Obiettivi

- Una singola codebase.
- Supporto installazione web.
- Build native iOS/Android.
- Accesso a notifiche locali, filesystem e SQLite su native.

## Target

| Target | Stato |
|---|---|
| Web PWA | Primario |
| Android Capacitor | Primario |
| iOS Capacitor | Primario |
| Desktop | Futuro |

## Differenze piattaforma

| Funzione | Web/PWA | Native Capacitor |
|---|---|---|
| Database | IndexedDB | SQLite |
| Immagini | IndexedDB/OPFS | Filesystem app |
| Notifiche | limitate/browser | Local Notifications native |
| Export | download file | file share/save |
| Import | file picker | file picker native |

## Regola implementativa

Ogni feature deve passare da un adapter multipiattaforma.

Esempio:

```text
StorageService
├── WebStorageAdapter
└── NativeStorageAdapter
```

Nessun componente React deve sapere se l'app sta girando su web o native.
