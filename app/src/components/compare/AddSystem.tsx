import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { FORMATS, getFormat, type Format } from '../../lib/engine';
import {
  apertureRangeLabel,
  cameraFormat,
  defaultFocal,
  lensesForCamera,
  maxApertureAtFocal,
  type AperturePoint,
  type CatalogLens,
} from '../../lib/gear';
import { useKit } from '../../store/KitProvider';
import { useCatalog } from '../../store/CatalogProvider';
import { useCompare, nextSystemId, type CompareSystem } from '../../store/CompareProvider';
import { NumberField } from '../ui/NumberField';
import { groupByMaker } from '../../lib/group';
import { SearchSelect } from '../ui/SearchSelect';

type Mode = 'camera' | 'kit' | 'manual';

const shortFmt = (f: Format) => f.name.replace(/\s*\(.*?\)\s*/g, '').trim();

const fieldCls =
  'border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong';

export function AddSystem() {
  const { add, systems } = useCompare();
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
          <KitMode onAdd={add} />
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
  const { cameras, lenses, status } = useCatalog();
  const [camId, setCamId] = useState(cameras[0]?.id ?? '');
  const cameraOptions = useMemo(
    () => cameras.map((c) => ({ id: c.id, label: c.name, maker: c.maker })),
    [cameras],
  );
  const camera = cameras.find((c) => c.id === camId) ?? cameras[0];
  const available = useMemo(() => (camera ? lensesForCamera(camera, lenses) : []), [camera, lenses]);
  const lensGroups = useMemo(() => groupByMaker(available), [available]);
  const [lensId, setLensId] = useState(available[0]?.id ?? '');
  const lens = available.find((l) => l.id === lensId) ?? available[0];

  // controlled focal/aperture, re-seeded when the lens changes
  const [focal, setFocal] = useState(lens ? defaultFocal(lens) : 50);
  const [aperture, setAperture] = useState(lens ? maxApertureAtFocal(lens, focal) : 1.8);
  const [lastLens, setLastLens] = useState(lens?.id);
  if (lens && lens.id !== lastLens) {
    setLastLens(lens.id);
    setFocal(defaultFocal(lens));
    setAperture(maxApertureAtFocal(lens, defaultFocal(lens)));
  }

  const onCam = (id: string) => {
    setCamId(id);
    const cam = cameras.find((c) => c.id === id);
    const first = cam ? lensesForCamera(cam, lenses)[0] : undefined;
    setLensId(first?.id ?? '');
  };

  const submit = () => {
    if (!lens || !camera) return;
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
          <SearchSelect
            options={cameraOptions}
            value={camId}
            onChange={onCam}
            placeholder={status === 'loading' ? 'Loading catalog…' : 'Search cameras…'}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Lens ({available.length} available)</span>
          <select className={fieldCls} value={lensId} onChange={(e) => setLensId(e.target.value)}>
            {lensGroups.map(([maker, lenses]) => (
              <optgroup key={maker} label={maker}>
                {lenses.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.thirdParty ? ' ·3rd' : ''}
                    {!l.af ? ' ·MF' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
      {lens && <FocalAperture lens={lens} focal={focal} aperture={aperture} setFocal={setFocal} setAperture={setAperture} />}
      <AddButton onClick={submit} disabled={!lens} />
    </div>
  );
}

// A body+lens combo from the owned kit (the look depends on which body the lens
// is mounted on, so we offer the real combinations).
interface KitCombo {
  id: string;
  label: string;
  formatId: string;
  focalMin: number;
  focalMax: number;
  apMax: number;
  apMin: number;
  aperturePoints?: AperturePoint[];
  type: 'prime' | 'zoom';
}

function KitMode({ onAdd }: { onAdd: (s: CompareSystem) => void }) {
  const { cameras, lenses } = useKit();
  const combos = useMemo<KitCombo[]>(() => {
    const out: KitCombo[] = [];
    for (const lens of lenses) {
      const bodies = cameras.filter(
        (c) => c.mount === lens.mount && lens.coversFormatIds.includes(c.formatId),
      );
      const targets = bodies.length ? bodies : [null];
      for (const body of targets) {
        const formatId = body?.formatId ?? lens.coversFormatIds[0] ?? 'ff';
        out.push({
          id: `${lens.id}|${body?.id ?? 'native'}`,
          label: `${lens.name}${body ? ` · ${body.name}` : ''}`,
          formatId,
          focalMin: lens.focalMin,
          focalMax: lens.focalMax,
          apMax: lens.apMax,
          apMin: lens.apMin,
          aperturePoints: lens.aperturePoints,
          type: lens.type,
        });
      }
    }
    return out;
  }, [cameras, lenses]);

  const [comboId, setComboId] = useState(combos[0]?.id ?? '');
  const combo = combos.find((c) => c.id === comboId) ?? combos[0];
  const [focal, setFocal] = useState(combo?.focalMin ?? 50);
  const [aperture, setAperture] = useState(combo ? maxApertureAtFocal(combo, combo.focalMin) : 1.8);
  const [last, setLast] = useState(combo?.id);
  if (combo && combo.id !== last) {
    setLast(combo.id);
    setFocal(combo.focalMin);
    setAperture(maxApertureAtFocal(combo, combo.focalMin));
  }

  if (combos.length === 0)
    return <div className="text-xs text-muted">Your kit is empty. Add a camera and lenses in My Kit.</div>;

  const fmt = getFormat(combo.formatId);
  const submit = () =>
    onAdd({ id: nextSystemId(), context: combo.label, format: fmt, focal, aperture });

  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1">
        <span className="label">Body + lens from your kit</span>
        <select className={fieldCls} value={comboId} onChange={(e) => setComboId(e.target.value)}>
          {combos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <FocalAperture lens={combo} focal={focal} aperture={aperture} setFocal={setFocal} setAperture={setAperture} />
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
          <NumberField value={focal} onCommit={setFocal} min={1} className={fieldCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">ƒ/</span>
          <NumberField value={aperture} onCommit={setAperture} min={0.7} step={0.1} className={fieldCls} />
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
  lens: Pick<CatalogLens, 'focalMin' | 'focalMax' | 'apMax' | 'apMin' | 'aperturePoints' | 'type'>;
  focal: number;
  aperture: number;
  setFocal: (n: number) => void;
  setAperture: (n: number) => void;
}) {
  const isZoom = lens.focalMax > lens.focalMin;
  const maxAtFocal = maxApertureAtFocal(lens, focal);
  const commitFocal = (next: number) => {
    setFocal(next);
    const nextMax = maxApertureAtFocal(lens, next);
    if (aperture < nextMax) setAperture(nextMax);
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1">
        <span className="label">
          Focal {isZoom ? `(${lens.focalMin}–${lens.focalMax}mm)` : 'mm'}
        </span>
        <NumberField
          value={focal}
          onCommit={commitFocal}
          min={lens.focalMin}
          max={lens.focalMax}
          disabled={!isZoom}
          className={fieldCls}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">Aperture ({apertureRangeLabel(lens)} lens)</span>
        <NumberField
          value={aperture}
          onCommit={setAperture}
          min={maxAtFocal}
          max={lens.apMin}
          step={0.1}
          className={fieldCls}
        />
      </label>
    </div>
  );
}
