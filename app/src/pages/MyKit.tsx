import { Trash2 } from 'lucide-react';
import { useKit } from '../store/KitProvider';

// Minimal read-of-state list for now; add/edit form comes in a later pass.
export function MyKit() {
  const { kit, removeLens } = useKit();
  return (
    <div className="p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <div className="label">{kit.length} lenses</div>
        <div className="label">focal · aperture range</div>
      </div>
      <div className="border border-line">
        {kit.map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0"
          >
            <div>
              <div className="text-sm">{l.name}</div>
              <div className="label mt-1">
                {l.type} · {l.focalMin === l.focalMax ? `${l.focalMin}mm` : `${l.focalMin}–${l.focalMax}mm`} ·
                ƒ/{l.apMax}–{l.apMin}
                {l.mount ? ` · ${l.mount}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeLens(l.id)}
              className="text-muted hover:text-fg transition-colors"
              aria-label={`Remove ${l.name}`}
            >
              <Trash2 size={15} strokeWidth={1.5} />
            </button>
          </div>
        ))}
        {kit.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-muted">
            No lenses yet. (Add form coming soon.)
          </div>
        )}
      </div>
    </div>
  );
}
