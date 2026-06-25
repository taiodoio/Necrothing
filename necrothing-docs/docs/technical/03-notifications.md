# Notifications

Versione: `v0.1`

## Obiettivo

Le notifiche servono a incrementare il ritorno nell'app senza tradire la filosofia privacy-first e senza sembrare marketing.

Devono essere locali, narrative, opt-in e disattivabili.

## Tipologie

| Tipo | Descrizione | Esempio |
|---|---|---|
| Anniversario | Ricorrenza annuale della morte | “Oggi ricorre l'anniversario della dipartita di Mouse Logitech.” |
| Fiori appassiti | I fiori su una tomba sono spariti | “I fiori sono ormai cenere.” |
| Erbacce | Il cimitero richiede manutenzione | “Le erbacce stanno reclamando tre tombe.” |
| Fantasma | Evento raro notturno | “Stanotte qualcuno è tornato.” |
| NPC | Becchino/prete disponibili | “Il becchino ti aspetta vicino al cancello.” |
| Stagionale | Halloween, Natale, ecc. | “I cancelli dell'Oltretomba sono aperti.” |

## Regole UX

- Nessuna notifica prima del consenso esplicito.
- Centro impostazioni notifiche sempre accessibile.
- Disattivazione globale.
- Disattivazione per categoria.
- Disattivazione per singola tomba.
- Quiet hours configurabili.
- Frequenza massima consigliata: 1 notifica al giorno, salvo anniversari.

## Preferenze utente

```ts
interface NotificationPreferences {
  enabled: boolean;
  anniversaries: boolean;
  weeds: boolean;
  flowers: boolean;
  ghosts: boolean;
  npcEvents: boolean;
  seasonalEvents: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}
```

## Scheduler

Lo scheduler deve essere idempotente.

Ogni volta che viene eseguito:

1. legge preferenze;
2. cancella notifiche obsolete;
3. ricalcola notifiche future;
4. schedula solo quelle consentite;
5. salva `lastNotificationScheduleAt`.

## Copywriting

Le notifiche devono sembrare messaggi dal mondo di gioco.

Evitare:

- “Torna nell'app.”
- “Hai nuove attività.”
- “Non perdere la tua ricompensa.”

Preferire:

- “Il cimitero ha memoria lunga.”
- “Una lapide reclama attenzione.”
- “Il becchino ha contato nuove erbacce.”
