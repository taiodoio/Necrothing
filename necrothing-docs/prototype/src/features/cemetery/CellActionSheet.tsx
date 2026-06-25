import { Sheet } from '@/shared/components/Sheet';

interface Props {
  onClose: () => void;
  onBury: () => void;
  onDecorate: () => void;
}

export function CellActionSheet({ onClose, onBury, onDecorate }: Props) {
  return (
    <Sheet title="Zolla libera" onClose={onClose}>
      <p className="muted" style={{ fontSize: 13 }}>
        Cosa vuoi fare con questa zolla?
      </p>
      <div className="wizard-nav">
        <button className="btn btn--primary" onClick={onBury}>
          ⚰️ Seppellisci qui
        </button>
        <button className="btn" onClick={onDecorate}>
          🪦 Decora qui
        </button>
      </div>
    </Sheet>
  );
}
