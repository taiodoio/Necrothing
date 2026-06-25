# PWA Manifest & Service Worker

Versione: `v0.1`

## Obiettivo

Rendere NECROTHING installabile e pienamente funzionante offline, coerente con
il pilastro local-first.

## Manifest

Gestito da `vite-plugin-pwa`. Campi previsti:

```jsonc
{
  "name": "NECROTHING — Il Cimitero degli Oggetti Morti",
  "short_name": "NECROTHING",
  "description": "Il cimitero privato, offline e ironico dei tuoi oggetti morti.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0d0b12",
  "theme_color": "#0d0b12",
  "lang": "it",
  "categories": ["games", "lifestyle"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Le icone iniziali sono placeholder, sostituibili in seguito.

## Service Worker

- Generato da Workbox (`vite-plugin-pwa`, `registerType: autoUpdate`).
- **Precache** dell'app shell (HTML/CSS/JS/asset buildati).
- **Runtime caching**: l'app è local-first, quindi i dati restano in IndexedDB,
  non nella cache HTTP. La cache copre solo asset statici.
- **Offline**: dopo la prima visita l'app deve avviarsi e funzionare senza rete.

## Strategia di aggiornamento

- `autoUpdate`: nuovo SW preso al reload.
- Mostrare un avviso non invasivo "Nuova versione disponibile" opzionale (P1).
- Le migrazioni IndexedDB sono versionate e indipendenti dal SW.

## Installabilità

- Manifest valido + SW + servito su HTTPS.
- Prompt `beforeinstallprompt` gestito con CTA discreta nelle impostazioni.

## Differenze native (Capacitor)

- Su native il SW non è usato per il caricamento: l'app è impacchettata.
- Notifiche, filesystem e SQLite passano da plugin nativi (vedi adapter).
- Lo stesso codice UI gira in entrambi i contesti.

## Test PWA

- Lighthouse PWA installabile.
- Avvio offline dopo prima visita.
- Persistenza dati dopo chiusura/riapertura.
