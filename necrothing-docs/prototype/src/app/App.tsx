import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useGameStore } from '@/shared/store/gameStore';
import { CemeteryPage } from '@/features/cemetery/CemeteryPage';
import { NotificationSettings } from '@/features/notifications/NotificationSettings';
import { SettingsHub } from '@/features/settings/SettingsHub';
import { AboutPage } from '@/features/settings/AboutPage';
import { AchievementsPage } from '@/features/achievements/AchievementsPage';
import { BackupPage } from '@/features/backup/BackupPage';

export function App() {
  const ready = useGameStore((s) => s.ready);
  const init = useGameStore((s) => s.init);
  const simulate = useGameStore((s) => s.simulate);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    init().catch((e) => setError(e instanceof Error ? e.message : 'Errore di avvio.'));
  }, [init]);

  // Ri-simula al ritorno in foreground (visibilitychange).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') simulate().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [simulate]);

  if (error) {
    return (
      <div className="app-shell" style={{ padding: 24 }}>
        <h2>Il cimitero non si apre</h2>
        <p className="muted">{error}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="app-shell" style={{ padding: 24, justifyContent: 'center' }}>
        <p className="muted" style={{ textAlign: 'center' }}>
          Apertura dei cancelli…
        </p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<CemeteryPage />} />
      <Route path="/settings" element={<SettingsHub />} />
      <Route path="/settings/notifications" element={<NotificationSettings />} />
      <Route path="/settings/about" element={<AboutPage />} />
      <Route path="/settings/backup" element={<BackupPage />} />
      <Route path="/achievements" element={<AchievementsPage />} />
    </Routes>
  );
}
