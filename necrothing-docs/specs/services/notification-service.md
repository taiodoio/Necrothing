# Service Spec: NotificationService

Versione: `v0.1`

## Responsabilità

Gestire permessi, preferenze, schedulazione e cancellazione delle notifiche locali.

## Interfaccia

```ts
interface NotificationService {
  checkPermission(): Promise<NotificationPermissionState>;
  requestPermission(): Promise<NotificationPermissionState>;
  getPreferences(): Promise<NotificationPreferences>;
  updatePreferences(preferences: NotificationPreferences): Promise<void>;
  scheduleAnniversary(graveId: string): Promise<void>;
  scheduleAllAnniversaries(): Promise<void>;
  scheduleWeedReminder(): Promise<void>;
  scheduleFlowerReminder(graveId: string): Promise<void>;
  scheduleGhostEvent(graveId: string): Promise<void>;
  cancelForGrave(graveId: string): Promise<void>;
  cancelAll(): Promise<void>;
  rescheduleAll(): Promise<void>;
}
```

## Regole

- Non schedulare notifiche se `enabled=false`.
- Non richiedere permesso al primo avvio senza contesto.
- Non inviare più di una notifica ordinaria al giorno.
- Gli anniversari hanno priorità superiore.
- Le quiet hours devono essere rispettate.

## Dipendenze

- `GraveRepository`
- `SettingsRepository`
- `CapacitorLocalNotificationsAdapter`
- `ClockService`

## Test

- Permesso negato.
- Permesso concesso.
- Preferenze disattivate.
- Scheduling anniversario.
- Cancellazione notifiche per tomba.
- Quiet hours.
