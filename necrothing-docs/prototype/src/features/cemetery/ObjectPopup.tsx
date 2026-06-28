// Popup contestuale flottante sopra un oggetto selezionato sulla mappa.
// Mostra icone d'azione (esamina, fiori, pulisci, ruota, elimina, conferma…).

export interface PopupAction {
  key: string;
  icon: string;
  label: string;
  danger?: boolean;
  primary?: boolean;
}

interface Props {
  /** Coordinate (px) dell'ancora nel sistema di .map-wrap (centro-alto oggetto). */
  x: number;
  y: number;
  actions: PopupAction[];
  onAction: (key: string) => void;
}

export function ObjectPopup({ x, y, actions, onAction }: Props) {
  return (
    <div
      className="obj-popup"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      role="menu"
    >
      <div className="obj-popup-row">
        {actions.map((a) => (
          <button
            key={a.key}
            className={`obj-popup-btn${a.danger ? ' danger' : ''}${a.primary ? ' primary' : ''}`}
            title={a.label}
            aria-label={a.label}
            onClick={() => onAction(a.key)}
          >
            <span className="obj-popup-ico" aria-hidden>
              {a.icon}
            </span>
          </button>
        ))}
      </div>
      <span className="obj-popup-tip" aria-hidden />
    </div>
  );
}
