import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { FORMATS, getFormat, type Format } from '../../lib/engine';
import { CAMERAS, LENSES } from '../../data/gear.seed';
import { cameraFormat, defaultFocal, lensesForCamera, type CatalogLens } from '../../lib/gear';
import { useKit } from '../../store/KitProvider';
import { useCompare, nextSystemId, type CompareSystem } from '../../store/CompareProvider';

type Mode = 'camera' | 'kit' | 'manual';

const shortFmt = (f: Format) => f.name.replace(/\s*\(.*?\)\s*/g, '').trim();

const fieldCls =
  'border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong';

export function AddSystem() {
  const { add, systems } = useCompare();
  const { kit } = useKit();
  const [mode, setMode] = useState<Mode>('camera');

  const full = systems.length >= 4;

  return (
    <div className="border border-line">
      <div className="flex border-b border-line">
        {(['camera', 'kit', 'manual'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={[
              'flex-1 px-3 py-2 text-xs uppercase tracking-wide transition-colors',
              mode === m ? 'bg-fg text-bg' : 'text-muted hover:text-fg',
            ].join(' ')}
          >
            {m === 'camera' ? 'Camera + Lens' : m === 'kit' ? 'From Kit' : 'Manual'}
          </button>
        ))}
      </div>
      <div className="p-4">
        {full ? (
          <div className="text-xs text-muted">Comparing 4 systems (the max). Remove one to add another.</div>
        ) : mode === 'camera' ? (
          <CameraMode onAdd={add} />
        ) : mode === 'kit' ? (
          <KitMode onAdd={add} kit={kit} />
        ) : (
          <ManualMode onAdd={add} />
        )}
      </div>
    </div>
  );
}

function AddButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 border border-fg bg-fg px-3 py-1.5 text-xs uppercase tracking-wide text-bg transition-opacity hover:opacity-85 disabled:opacity-40"
    >
      <Plus size={14} strokeWidth={2} /> Add to compare
    </button>
  );
}

function CameraMode({ onAdd }: { onAdd: (s: CompareSystem) => void }) {
  const [camId, setCamId] = useState(CAMERAS[0].id);
  const camera = CAMERAS.find((c) => c.id === camId)!;
  const available = useMemo(() => lensesForCamera(camera, LENSES), [camera]);
  const [lensId, setLensId] = useState(available[0]?.id ?? '');
  const lens = available.find((l) => l.id === lensId) ?? available[0];

  // controlled focal/aperture, re-seeded when the lens changes
  const [focal, setFocal] = useState(lens ? defaultFocal(lens) : 50);
  const [aperture, setAperture] = useState(lens ? lens.apMax : 1.8);
  const [lastLens, setLastLens] = useState(lens?.id);
  if (lens && lens.id !== lastLens) {
    setLastLens(lens.id);
    setFocal(defaultFocal(lens));
    setAperture(lens.apMax);
  }

  const onCam = (id: string) => {
    setCamId(id);
    const cam = CAMERAS.find((c) => c.id === id)!;
    const first = lensesForCamera(cam, LENSES)[0];
    setLensId(first?.id ?? '');
  };

  const submit = () => {
    if (!lens) return;
    onAdd({
      id: nextSystemId(),
      context: camera.name,
      format: cameraFormat(camera),
      focal,
      aperture,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="label">Camera</span>
          <select className={fieldCls} value={camId} onChange={(e) => onCam(e.target.value)}>
            {CAMERAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Lens ({available.length} available)</span>
          <select className={fieldCls} value={lensId} onChange={(e) => setLensId(e.target.value)}>
            {available.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.thirdParty ? ' ·3rd' : ''}
                {!l.af ? ' ·MF' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      {lens && <FocalAperture lens={lens} focal={focal} aperture={aperture} setFocal={setFocal} setAperture={setAperture} />}
      <AddButton onClick={submit} disabled={!lens} />
    </div>
  );
}

function KitMode({ onAdd, kit }: { onAdd: (s: CompareSystem) => void; kit: ReturnType<typeof useKit>['kit'] }) {
  if (kit.length === 0) return <div className="text-xs text-muted">Your kit is empty. Add lenses in My Kit.</div>;
  const [lensId, setLensId] = useState(kit[0].id);
  const lens = kit.find((l) => l.id === lensId)!;
  const fmt = getFormat(lens.formatId ?? 'ff');
  const [focal, setFocal] = useState(lens.focalMin);
  const [aperture, setAperture] = useState(lens.apMax);
  const [last, setLast] = useState(lens.id);
  if (lens.id !== last) {
    setLast(lens.id);
    setFocal(lens.focalMin);
    setAperture(lens.apMax);
  }
  const submit = () =>
    onAdd({
      id: nextSystemId(),
      context: `${shortFmt(fmt)} (kit)`,
      format: fmt,
      focal,
      aperture,
    });
  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1">
        <span className="label">Your lens · {shortFmt(fmt)}</span>
        <select className={fieldCls} value={lensId} onChange={(e) => setLensId(e.target.value)}>
          {kit.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <FocalAperture
        lens={{ focalMin: lens.focalMin, focalMax: lens.focalMax, apMax: lens.apMax, apMin: lens.apMin, type: lens.type }}
        focal={focal}
        aperture={aperture}
        setFocal={setFocal}
        setAperture={setAperture}
      />
      <AddButton onClick={submit} />
    </div>
  );
}

function ManualMode({ onAdd }: { onAdd: (s: CompareSystem) => void }) {
  const [formatId, setFormatId] = useState('ff');
  const [focal, setFocal] = useState(50);
  const [aperture, setAperture] = useState(1.8);
  const fmt = getFormat(formatId);
  const submit = () =>
    onAdd({
      id: nextSystemId(),
      context: shortFmt(fmt),
      format: fmt,
      focal,
      aperture,
    });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1">
          <span className="label">Format</span>
          <select className={fieldCls} value={formatId} onChange={(e) => setFormatId(e.target.value)}>
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Focal mm</span>
          <input type="number" min={1} className={fieldCls} value={focal} onChange={(e) => setFocal(Math.max(1, +e.target.value || 0))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">ƒ/</span>
          <input type="number" step={0.1} min={0.7} className={fieldCls} value={aperture} onChange={(e) => setAperture(Math.max(0.7, +e.target.value || 0))} />
        </label>
      </div>
      <AddButton onClick={submit} />
    </div>
  );
}

// Focal (range-aware) + aperture controls shared by camera/kit modes.
function FocalAperture({
  lens,
  focal,
  aperture,
  setFocal,
  setAperture,
}: {
  lens: Pick<CatalogLens, 'focalMin' | 'focalMax' | 'apMax' | 'apMin' | 'type'>;
  focal: number;
  aperture: number;
  setFocal: (n: number) => void;
  setAperture: (n: number) => void;
}) {
  const isZoom = lens.focalMax > lens.focalMin;
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1">
        <span className="label">
          Focal {isZoom ? `(${lens.focalMin}–${lens.focalMax}mm)` : 'mm'}
        </span>
        <input
          type="number"
          className={fieldCls}
          value={focal}
          min={lens.focalMin}
          max={lens.focalMax}
          disabled={!isZoom}
          onChange={(e) =>
            setFocal(Math.min(lens.focalMax, Math.max(lens.focalMin, +e.target.value || lens.focalMin)))
          }
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">Aperture (ƒ/{lens.apMax}–{lens.apMin})</span>
        <input
          type="number"
          step={0.1}
          className={fieldCls}
          value={aperture}
          min={lens.apMax}
          max={lens.apMin}
          onChange={(e) =>
            setAperture(Math.min(lens.apMin, Math.max(lens.apMax, +e.target.value || lens.apMax)))
          }
        />
      </label>
    </div>
  );
}
