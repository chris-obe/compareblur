import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { FORMATS, getFormat, cropFactor, type Format } from '../../lib/engine';
import {
  apertureRangeLabel,
  maxApertureAtFocal,
  type CatalogLens,
} from '../../lib/gear';
import { useKit } from '../../store/KitProvider';
import { useCompare, nextSystemId, type CompareSystem } from '../../store/CompareProvider';
import { NumberField } from '../ui/NumberField';
import type { OwnedCamera, OwnedLens } from '../../lib/types';

type SelectorMode = 'kit' | 'custom';

const shortFmt = (f: Format) => f.name.replace(/\s*\(.*?\)\s*/g, '').trim();

const fieldCls =
  'border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong';

export function AddSystem() {
  const { add, systems } = useCompare();

  const full = systems.length >= 4;

  return (
    <div className="border border-line">
      <div className="border-b border-line px-3 py-2">
        <div className="text-xs font-bold uppercase tracking-wide">Select Camera</div>
      </div>
      <div className="p-4">
        {full ? (
          <div className="text-xs text-muted">Comparing 4 systems (the max). Remove one to add another.</div>
        ) : (
          <ConsolidatedMode onAdd={add} />
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

function ConsolidatedMode({ onAdd }: { onAdd: (s: CompareSystem) => void }) {
  const { cameras, lenses } = useKit();
  const [cameraMode, setCameraMode] = useState<SelectorMode>('kit');
  const [lensMode, setLensMode] = useState<SelectorMode>('kit');
  const [cameraId, setCameraId] = useState('');
  const [lensId, setLensId] = useState('');
  const [customCamera, setCustomCamera] = useState('');
  const [customLens, setCustomLens] = useState('');
  const [customFormatId, setCustomFormatId] = useState('ff');
  const [focal, setFocal] = useState(50);
  const [aperture, setAperture] = useState(1.8);

  const camera = cameraMode === 'kit' ? cameras.find((item) => item.id === cameraId) : undefined;
  const kitLenses = useMemo(
    () => compatibleKitLenses(lenses, camera),
    [camera, lenses],
  );
  const lens = lensMode === 'kit' ? kitLenses.find((item) => item.id === lensId) : undefined;

  useEffect(() => {
    if (lensMode !== 'kit' || !lensId) return;
    if (!kitLenses.some((item) => item.id === lensId)) setLensId('');
  }, [kitLenses, lensId, lensMode]);

  useEffect(() => {
    if (!lens) return;
    setFocal(lens.focalMin);
    setAperture(maxApertureAtFocal(lens, lens.focalMin));
  }, [lens?.id]);

  const format = camera ? getFormat(camera.formatId) : getFormat(customFormatId);
  const cameraLabel = camera ? camera.name : customCamera.trim();
  const lensLabel = lens ? lens.name : customLens.trim();
  const cameraReady = cameraMode === 'kit' ? !!camera : !!cameraLabel;
  const lensReady = lensMode === 'kit' ? !!lens : !!lensLabel;

  const submit = () => {
    if (!cameraReady || !lensReady) return;
    onAdd({
      id: nextSystemId(),
      context: [cameraLabel, lensLabel].filter(Boolean).join(' · '),
      format,
      focal,
      aperture,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <ModeSelect label="Camera source" value={cameraMode} onChange={(value) => setCameraMode(value)} />
          {cameraMode === 'kit' ? (
            <label className="flex flex-col gap-1">
              <span className="label">Camera</span>
              <select className={fieldCls} value={cameraId} onChange={(event) => setCameraId(event.target.value)}>
                <option value="">Select camera</option>
                {cameras.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {shortFmt(getFormat(item.formatId))} · {cropFactor(getFormat(item.formatId)).toFixed(1)}×
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <label className="flex flex-col gap-1">
                <span className="label">Camera</span>
                <input className={fieldCls} value={customCamera} onChange={(event) => setCustomCamera(event.target.value)} placeholder="Custom camera" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label">Format</span>
                <select className={fieldCls} value={customFormatId} onChange={(event) => setCustomFormatId(event.target.value)}>
                  {FORMATS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {shortFmt(item)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-line pt-4">
        <SelectorHeader title="Select Lens" />
        <div className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <ModeSelect label="Lens source" value={lensMode} onChange={(value) => setLensMode(value)} />
          {lensMode === 'kit' ? (
            <label className="flex flex-col gap-1">
              <span className="label">Lens {camera ? `(${kitLenses.length} compatible)` : ''}</span>
              <select className={fieldCls} value={lensId} onChange={(event) => setLensId(event.target.value)}>
                <option value="">Select lens</option>
                {kitLenses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {lensLabelForOption(item)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="label">Lens</span>
              <input className={fieldCls} value={customLens} onChange={(event) => setCustomLens(event.target.value)} placeholder="Custom lens" />
            </label>
          )}
        </div>
      </div>

      {lens ? (
        <FocalAperture lens={lens} focal={focal} aperture={aperture} setFocal={setFocal} setAperture={setAperture} />
      ) : (
        <ManualOptics focal={focal} aperture={aperture} setFocal={setFocal} setAperture={setAperture} />
      )}

      {cameras.length === 0 && lenses.length === 0 && (
        <div className="text-xs text-muted">Your kit is empty. Use Custom, or add saved items in My Kit.</div>
      )}
      <AddButton onClick={submit} disabled={!cameraReady || !lensReady} />
    </div>
  );
}

function SelectorHeader({ title }: { title: string }) {
  return <div className="text-xs font-bold uppercase tracking-wide">{title}</div>;
}

function ModeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SelectorMode;
  onChange: (value: SelectorMode) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label">{label}</span>
      <select className={fieldCls} value={value} onChange={(event) => onChange(event.target.value as SelectorMode)}>
        <option value="kit">From kit</option>
        <option value="custom">Custom</option>
      </select>
    </label>
  );
}

function ManualOptics({
  focal,
  aperture,
  setFocal,
  setAperture,
}: {
  focal: number;
  aperture: number;
  setFocal: (n: number) => void;
  setAperture: (n: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1">
        <span className="label">Focal mm</span>
        <NumberField value={focal} onCommit={setFocal} min={1} className={fieldCls} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">ƒ/</span>
        <NumberField value={aperture} onCommit={setAperture} min={0.7} step={0.1} className={fieldCls} />
      </label>
    </div>
  );
}

function compatibleKitLenses(lenses: OwnedLens[], camera: OwnedCamera | undefined): OwnedLens[] {
  if (!camera) return lenses;
  return lenses.filter((lens) => lens.mount === camera.mount && lens.coversFormatIds.includes(camera.formatId));
}

function lensLabelForOption(lens: OwnedLens): string {
  const focal = lens.focalMin === lens.focalMax ? `${lens.focalMin}mm` : `${lens.focalMin}–${lens.focalMax}mm`;
  return `${lens.name} · ${focal} · ${apertureRangeLabel(lens)}`;
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
