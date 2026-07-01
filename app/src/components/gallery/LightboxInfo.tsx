import { useNavigate } from 'react-router-dom';
import { GitCompare } from 'lucide-react';
import { useKit } from '../../store/KitProvider';
import { useCompare, nextSystemId } from '../../store/CompareProvider';
import { ReactionBar } from '../ui/ReactionBar';
import { PhotoOpticsPanel } from './PhotoOpticsPanel';
import type { ViewEntry } from '../../lib/types';

export function LightboxInfo({ entry }: { entry: ViewEntry }) {
  const { cameras, lenses } = useKit();
  const { add: addToCompare } = useCompare();
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-bold">{entry.title}</div>
        <div className="label mt-1">{entry.metaLine}</div>
      </div>

      {entry.id !== 'upload' && (
        <div>
          <div className="label mb-2">What did you think?</div>
          <ReactionBar photoId={entry.id} mode="expanded" />
        </div>
      )}

      <PhotoOpticsPanel
        entry={entry}
        kit={{ cameras, lenses }}
        showKitVerdict
        showIdentityFields={false}
        renderFooter={({ format, focal, aperture }) => (
          <button
            type="button"
            onClick={() => {
              addToCompare({
                id: nextSystemId(),
                identifier: entry.title,
                context: entry.title,
                format,
                focal,
                aperture,
                subjectPreset: entry.subjectPreset,
                subjectWidthM: entry.subjectWidthM,
                source: entry.id === 'upload' ? { type: 'manual' } : { type: 'gallery', photoId: entry.id },
              });
              navigate('/compare');
            }}
            className="flex w-full items-center justify-center gap-2 border border-line px-3 py-2 text-xs uppercase tracking-wide transition-colors hover:border-line-strong"
          >
            <GitCompare size={14} strokeWidth={1.5} /> Compare this look
          </button>
        )}
      />
    </div>
  );
}
