import { useMemo } from 'react';
import { Trash2, Camera as CameraIcon, Aperture } from 'lucide-react';
import { useKit } from '../store/KitProvider';
import { mountLabel } from '../lib/gear';
import { formatLabel } from '../lib/categories';
import type { OwnedCamera, OwnedLens } from '../lib/types';
import { AddCamera } from '../components/mykit/AddCamera';
import { AddLensToMount } from '../components/mykit/AddLensToMount';

interface MountGroup {
  mount: string;
  cameras: OwnedCamera[];
  lenses: OwnedLens[];
  formats: Set<string>;
}

export function MyKit() {
  const { cameras, lenses, removeCamera, removeLens, clear } = useKit();

  const groups = useMemo<MountGroup[]>(() => {
    const map = new Map<string, MountGroup>();
    const get = (mount: string) => {
      let g = map.get(mount);
      if (!g) {
        g = { mount, cameras: [], lenses: [], formats: new Set() };
        map.set(mount, g);
      }
      return g;
    };
    for (const c of cameras) {
      const g = get(c.mount);
      g.cameras.push(c);
      g.formats.add(c.formatId);
    }
    for (const l of lenses) get(l.mount).lenses.push(l);
    // a mount with only lenses needs formats to scope the add control
    for (const g of map.values()) {
      if (g.formats.size === 0) g.lenses.forEach((l) => l.coversFormatIds.forEach((f) => g.formats.add(f)));
    }
    return [...map.values()].sort((a, b) => mountLabel(a.mount).localeCompare(mountLabel(b.mount)));
  }, [cameras, lenses]);

  const empty = cameras.length === 0 && lenses.length === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <div className="label mb-2">Add a camera</div>
        <AddCamera />
      </div>

      <div className="flex items-baseline justify-between">
        <div className="label">
          {cameras.length} {cameras.length === 1 ? 'body' : 'bodies'} · {lenses.length}{' '}
          {lenses.length === 1 ? 'lens' : 'lenses'}
        </div>
        {!empty && (
          <button type="button" onClick={clear} className="label hover:text-fg">
            Clear all
          </button>
        )}
      </div>

      {empty ? (
        <div className="border border-line px-4 py-10 text-center text-xs text-muted">
          Your kit is empty — add a camera above. Lenses can come with it.
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.mount} className="border border-line">
              <div className="flex items-baseline justify-between border-b border-line bg-faint px-4 py-2">
                <span className="text-sm font-bold">{mountLabel(g.mount)}</span>
                <span className="label">{[...g.formats].map(formatLabel).join(' · ')}</span>
              </div>

              {g.cameras.map((c) => (
                <Row key={c.id} icon={<CameraIcon size={14} strokeWidth={1.5} />} onRemove={() => removeCamera(c.id)}>
                  <span className="text-sm">{c.name}</span>
                  <span className="label ml-2">{formatLabel(c.formatId)}</span>
                </Row>
              ))}

              {g.lenses.map((l) => (
                <Row key={l.id} icon={<Aperture size={14} strokeWidth={1.5} />} onRemove={() => removeLens(l.id)} muted>
                  <span className="text-sm">{l.name}</span>
                  <span className="label ml-2">
                    {l.focalMin === l.focalMax ? `${l.focalMin}mm` : `${l.focalMin}–${l.focalMax}mm`} · ƒ/{l.apMax}
                  </span>
                </Row>
              ))}

              <AddLensToMount mount={g.mount} formats={g.formats} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  icon,
  children,
  onRemove,
  muted,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onRemove: () => void;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line px-4 py-2.5 last:border-b-0">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className={muted ? 'text-muted' : ''}>{icon}</span>
        <span className="min-w-0 truncate">{children}</span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="shrink-0 text-muted transition-colors hover:text-fg"
      >
        <Trash2 size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}
