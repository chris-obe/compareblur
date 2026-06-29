import { useEffect, useMemo, useState } from 'react';
import { Trash2, Camera as CameraIcon, Aperture } from 'lucide-react';
import { useKit } from '../store/KitProvider';
import { mountLabel } from '../lib/gear';
import { formatLabel } from '../lib/categories';
import { FORMATS } from '../lib/engine';
import type { OwnedCamera, OwnedLens } from '../lib/types';
import { AddCamera } from '../components/mykit/AddCamera';
import { AddLensToMount } from '../components/mykit/AddLensToMount';

type View = 'mount' | 'format';

interface MountGroup {
  mount: string;
  cameras: OwnedCamera[];
  lenses: OwnedLens[];
  formats: Set<string>;
}
interface FormatSub {
  mount: string;
  cameras: OwnedCamera[];
  lenses: OwnedLens[];
}
interface FormatGroup {
  formatId: string;
  subs: FormatSub[];
}

const formatOrder = (id: string) => {
  const i = FORMATS.findIndex((f) => f.id === id);
  return i < 0 ? 999 : i;
};

export function MyKit() {
  const { cameras, lenses, removeCamera, removeLens, clear } = useKit();
  const [view, setView] = useState<View>(() => {
    try {
      return localStorage.getItem('hmb-kit-view') === 'format' ? 'format' : 'mount';
    } catch {
      return 'mount';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('hmb-kit-view', view);
    } catch {
      /* ignore */
    }
  }, [view]);

  // by mount (lenses live under their mount, shared across that mount's bodies)
  const mountGroups = useMemo<MountGroup[]>(() => {
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
    for (const g of map.values()) {
      if (g.formats.size === 0) g.lenses.forEach((l) => l.coversFormatIds.forEach((f) => g.formats.add(f)));
    }
    return [...map.values()].sort((a, b) => mountLabel(a.mount).localeCompare(mountLabel(b.mount)));
  }, [cameras, lenses]);

  // by format -> camera mount (lenses recycle across bodies of that mount; a lens
  // that covers several formats appears under each)
  const formatGroups = useMemo<FormatGroup[]>(() => {
    const byFormat = new Map<string, Map<string, OwnedCamera[]>>();
    for (const c of cameras) {
      let mounts = byFormat.get(c.formatId);
      if (!mounts) {
        mounts = new Map();
        byFormat.set(c.formatId, mounts);
      }
      const arr = mounts.get(c.mount);
      if (arr) arr.push(c);
      else mounts.set(c.mount, [c]);
    }
    const groups: FormatGroup[] = [];
    for (const [formatId, mounts] of byFormat) {
      const subs: FormatSub[] = [];
      for (const [mount, cams] of mounts) {
        const subLenses = lenses.filter((l) => l.mount === mount && l.coversFormatIds.includes(formatId));
        subs.push({ mount, cameras: cams, lenses: subLenses });
      }
      subs.sort((a, b) => mountLabel(a.mount).localeCompare(mountLabel(b.mount)));
      groups.push({ formatId, subs });
    }
    return groups.sort((a, b) => formatOrder(a.formatId) - formatOrder(b.formatId));
  }, [cameras, lenses]);

  const empty = cameras.length === 0 && lenses.length === 0;

  const cameraRow = (c: OwnedCamera) => (
    <Row key={c.id} icon={<CameraIcon size={14} strokeWidth={1.5} />} onRemove={() => removeCamera(c.id)}>
      <span className="text-sm">{c.name}</span>
      <span className="label ml-2">{formatLabel(c.formatId)}</span>
    </Row>
  );
  const lensRow = (l: OwnedLens) => (
    <Row key={l.id} icon={<Aperture size={14} strokeWidth={1.5} />} onRemove={() => removeLens(l.id)} muted>
      <span className="text-sm">{l.name}</span>
      <span className="label ml-2">
        {l.focalMin === l.focalMax ? `${l.focalMin}mm` : `${l.focalMin}–${l.focalMax}mm`} · ƒ/{l.apMax}
      </span>
    </Row>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <div className="label mb-2">Add a camera</div>
        <AddCamera />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex border border-line">
          {(['mount', 'format'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={[
                'px-3 py-1.5 text-xs uppercase tracking-wide transition-colors',
                view === v ? 'bg-fg text-bg' : 'text-muted hover:text-fg',
              ].join(' ')}
            >
              {v === 'mount' ? 'By mount' : 'By format'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="label">
            {cameras.length} {cameras.length === 1 ? 'body' : 'bodies'} · {lenses.length}{' '}
            {lenses.length === 1 ? 'lens' : 'lenses'}
          </span>
          {!empty && (
            <button type="button" onClick={clear} className="label hover:text-fg">
              Clear all
            </button>
          )}
        </div>
      </div>

      {empty ? (
        <div className="border border-line px-4 py-10 text-center text-xs text-muted">
          Your kit is empty — add a camera above. Lenses can come with it.
        </div>
      ) : view === 'mount' ? (
        <div className="space-y-5">
          {mountGroups.map((g) => (
            <div key={g.mount} className="border border-line">
              <div className="flex items-baseline justify-between border-b border-line bg-faint px-4 py-2">
                <span className="text-sm font-bold">{mountLabel(g.mount)}</span>
                <span className="label">{[...g.formats].map(formatLabel).join(' · ')}</span>
              </div>
              {g.cameras.map(cameraRow)}
              {g.lenses.map(lensRow)}
              <AddLensToMount mount={g.mount} formats={g.formats} />
            </div>
          ))}
        </div>
      ) : formatGroups.length === 0 ? (
        <div className="border border-line px-4 py-10 text-center text-xs text-muted">
          Add a camera to see your kit grouped by format.
        </div>
      ) : (
        <div className="space-y-5">
          {formatGroups.map((fg) => (
            <div key={fg.formatId} className="border border-line">
              <div className="border-b border-line bg-faint px-4 py-2">
                <span className="text-sm font-bold">{formatLabel(fg.formatId)}</span>
              </div>
              {fg.subs.map((sub) => (
                <div key={sub.mount} className="border-b border-line last:border-b-0">
                  <div className="label px-4 pt-2 pb-1">{mountLabel(sub.mount)}</div>
                  {sub.cameras.map(cameraRow)}
                  {sub.lenses.map(lensRow)}
                  <AddLensToMount mount={sub.mount} formats={new Set([fg.formatId])} />
                </div>
              ))}
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
