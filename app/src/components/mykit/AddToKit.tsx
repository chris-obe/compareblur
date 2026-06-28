import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { FORMATS } from '../../lib/engine';
import { CAMERAS, LENSES } from '../../data/gear.seed';
import { lensesForCamera } from '../../lib/gear';
import { groupByMaker } from '../../lib/group';
import { useKit } from '../../store/KitProvider';
import type { Lens } from '../../lib/types';
import { NumberField } from '../ui/NumberField';

const fieldCls =
  'border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong';

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `k-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

type Mode = 'catalog' | 'manual';

export function AddToKit() {
  const [mode, setMode] = useState<Mode>('catalog');
  return (
    <div className="border border-line">
      <div className="flex border-b border-line">
        {(['catalog', 'manual'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={[
              'flex-1 px-3 py-2 text-xs uppercase tracking-wide transition-colors',
              mode === m ? 'bg-fg text-bg' : 'text-muted hover:text-fg',
            ].join(' ')}
          >
            {m === 'catalog' ? 'From catalog' : 'Manual'}
          </button>
        ))}
      </div>
      <div className="p-4">{mode === 'catalog' ? <CatalogMode /> : <ManualMode />}</div>
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
      <Plus size={14} strokeWidth={2} /> Add to kit
    </button>
  );
}

function CatalogMode() {
  const { addLens } = useKit();
  const [camId, setCamId] = useState(CAMERAS[0].id);
  const camera = CAMERAS.find((c) => c.id === camId)!;
  const available = useMemo(() => lensesForCamera(camera, LENSES), [camera]);
  const camGroups = useMemo(() => groupByMaker(CAMERAS), []);
  const lensGroups = useMemo(() => groupByMaker(available), [available]);
  const [lensId, setLensId] = useState(available[0]?.id ?? '');
  const lens = available.find((l) => l.id === lensId) ?? available[0];

  const onCam = (id: string) => {
    setCamId(id);
    const cam = CAMERAS.find((c) => c.id === id)!;
    setLensId(lensesForCamera(cam, LENSES)[0]?.id ?? '');
  };

  const submit = () => {
    if (!lens) return;
    const entry: Lens = {
      id: newId(),
      name: `${lens.maker} ${lens.name}`,
      type: lens.type,
      focalMin: lens.focalMin,
      focalMax: lens.focalMax,
      apMax: lens.apMax,
      apMin: lens.apMin,
      mount: camera.mount,
      formatId: camera.formatId,
    };
    addLens(entry);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="label">Body</span>
          <select className={fieldCls} value={camId} onChange={(e) => onCam(e.target.value)}>
            {camGroups.map(([maker, cams]) => (
              <optgroup key={maker} label={maker}>
                {cams.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Lens ({available.length})</span>
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
      <AddButton onClick={submit} disabled={!lens} />
    </div>
  );
}

function ManualMode() {
  const { addLens } = useKit();
  const [name, setName] = useState('');
  const [isZoom, setIsZoom] = useState(false);
  const [focalMin, setFocalMin] = useState(50);
  const [focalMax, setFocalMax] = useState(50);
  const [apMax, setApMax] = useState(1.8);
  const [apMin, setApMin] = useState(16);
  const [formatId, setFormatId] = useState('ff');

  const submit = () => {
    const fMax = isZoom ? Math.max(focalMin, focalMax) : focalMin;
    addLens({
      id: newId(),
      name: name.trim() || `${focalMin}${isZoom ? `–${fMax}` : ''}mm ƒ/${apMax}`,
      type: isZoom ? 'zoom' : 'prime',
      focalMin,
      focalMax: fMax,
      apMax,
      apMin,
      formatId,
    });
    setName('');
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="label">Name (optional)</span>
          <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Helios 44-2" />
        </label>
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
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={isZoom} onChange={(e) => setIsZoom(e.target.checked)} />
        Zoom lens
      </label>
      <div className="grid grid-cols-4 gap-2">
        <label className="flex flex-col gap-1">
          <span className="label">Focal{isZoom ? ' min' : ''}</span>
          <NumberField value={focalMin} onCommit={setFocalMin} min={1} className={fieldCls} />
        </label>
        {isZoom && (
          <label className="flex flex-col gap-1">
            <span className="label">Focal max</span>
            <NumberField value={focalMax} onCommit={setFocalMax} min={1} className={fieldCls} />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="label">ƒ/ max</span>
          <NumberField value={apMax} onCommit={setApMax} min={0.7} step={0.1} className={fieldCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">ƒ/ min</span>
          <NumberField value={apMin} onCommit={setApMin} min={1} step={0.1} className={fieldCls} />
        </label>
      </div>
      <AddButton onClick={submit} />
    </div>
  );
}
