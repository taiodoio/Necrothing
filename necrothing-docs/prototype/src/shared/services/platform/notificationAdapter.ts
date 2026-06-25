// Adapter notifiche locali multipiattaforma.
// Interfaccia allineata a @capacitor/local-notifications così che l'adapter
// nativo possa essere aggiunto senza toccare il resto del codice.

export type PermissionState = 'granted' | 'denied' | 'prompt';

export interface ScheduledNotification {
  id: number;
  title: string;
  body: string;
  /** Quando mostrarla. Su web lo scheduling reale non è garantito. */
  at?: Date;
}

export interface LocalNotificationsAdapter {
  checkPermission(): Promise<PermissionState>;
  requestPermission(): Promise<PermissionState>;
  schedule(notifications: ScheduledNotification[]): Promise<void>;
  cancel(ids: number[]): Promise<void>;
  /** Mostra subito (usata per eventi immediati come fantasmi). */
  showNow(title: string, body: string): Promise<void>;
}
