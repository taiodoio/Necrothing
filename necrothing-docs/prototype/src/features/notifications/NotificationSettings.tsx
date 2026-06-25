// Centro impostazioni notifiche: globale, per categoria, quiet hours.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/shared/store/gameStore';
import type { NotificationPreferences } from '@/shared/domain/types';

const CATEGORY_FIELDS: { key: keyof NotificationPreferences; label: string }[] = [
  { key: 'anniversaries', label: 'Anniversari' },
  { key: 'weeds', label: 'Erbacce' },
  { key: 'flowers', label: 'Fiori appassiti' },
  { key: 'ghosts', label: 'Fantasmi' },
  { key: 'npcEvents', label: 'Eventi NPC' },
  { key: 'seasonalEvents', label: 'Eventi stagionali' },
];

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="switch-row">
      <label>{label}</label>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 22, height: 22 }}
      />
    </div>
  );
}

export function NotificationSettings() {
  const navigate = useNavigate();
  const prefs = useGameStore((s) => s.notificationPrefs);
  const update = useGameStore((s) => s.updateNotificationPrefs);
  const requestPermission = useGameStore((s) => s.requestNotificationPermission);
  const [local, setLocal] = useState<NotificationPreferences>(prefs);

  const save = async (next: NotificationPreferences) => {
    setLocal(next);
    await update(next);
  };

  const enableWithPermission = async (on: boolean) => {
    if (on) await requestPermission();
    await save({ ...local, enabled: on });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="btn btn--ghost"
          onClick={() => navigate('/settings')}
          aria-label="Indietro"
        >
          ← Impostazioni
        </button>
        <strong style={{ marginLeft: 8 }}>Notifiche</strong>
      </header>

      <div className="scene-wrap">
        <p className="muted" style={{ fontSize: 13 }}>
          Le notifiche sono locali, narrative e disattivabili. Niente marketing, niente cloud.
        </p>

        <Toggle
          label="Abilita notifiche"
          checked={local.enabled}
          onChange={enableWithPermission}
        />

        <h3 style={{ marginTop: 18 }}>Categorie</h3>
        {CATEGORY_FIELDS.map((f) => (
          <Toggle
            key={f.key}
            label={f.label}
            checked={Boolean(local[f.key])}
            disabled={!local.enabled}
            onChange={(v) => save({ ...local, [f.key]: v })}
          />
        ))}

        <h3 style={{ marginTop: 18 }}>Ore di silenzio</h3>
        <Toggle
          label="Abilita quiet hours"
          checked={local.quietHoursEnabled}
          disabled={!local.enabled}
          onChange={(v) => save({ ...local, quietHoursEnabled: v })}
        />
        {local.quietHoursEnabled && (
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Da</label>
              <input
                type="time"
                value={local.quietHoursStart ?? '22:00'}
                onChange={(e) => save({ ...local, quietHoursStart: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>A</label>
              <input
                type="time"
                value={local.quietHoursEnd ?? '08:00'}
                onChange={(e) => save({ ...local, quietHoursEnd: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
