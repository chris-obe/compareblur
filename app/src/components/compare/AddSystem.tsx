import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { FORMATS, getFormat, cropFactor, type Format } from '../../lib/engine';
import {
  apertureRangeLabel,
  cameraFormat,
  defaultFocal,
  lensesForCamera,
  maxApertureAtFocal,
  type CatalogLens,
} from '../../lib/gear';
import { compareSourceFromKitCombo, kitComboCandidates, lensOptionLabel } from '../../lib/lookCandidates';
import { useCatalog } from '../../store/CatalogProvider';
import { useKit } from '../../store/KitProvider';
import { useCompare, nextSystemId, type CompareSystem } from '../../store/CompareProvider';
import { NumberField } from '../ui/NumberField';
import { SearchSelect, type SelectOption } from '../ui/SearchSelect';

type AddMode = 'kit' | 'catalog' | 'manual';

const shortFmt = (format: Format) => format.name.replace(/\s*\(.*?\)\s*/g, '').trim();

const fieldCls =
  'border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong';

export function AddSystem() {
  const { add } = useCompare();

  return (
    <div className="border border-line">
      <div className="border-b border-line px-3 py-2">
        <div className="text-xs font-bold uppercase tracking-wide">Select Camera</div>
      </div>
      <div className="p-4">
        <AddSystemForm onAdd={add} />
      </div>
    </div>
  );
}

function AddSystemForm({ onAdd }: { onAdd: (system: CompareSystem) => void }) {
  const [mode, setMode] = useState<AddMode>('kit');

  return (
    <div className="space-y-2">
      <OptionPanel
        title="From kit"
        active={mode === 'kit'}
        onSelect={() => setMode('kit')}
      >
        <KitOption onAdd={onAdd} />
      </OptionPanel>
      <OptionPanel
        title="Camera + lens"
        active={mode === 'catalog'}
        onSelect={() => setMode('catalog')}
      >
        <CatalogOption onAdd={onAdd} />
      </OptionPanel>
      <OptionPanel
        title="Manual"
        active={mode === 'manual'}
        onSelect={() => setMode('manual')}
      >
        <ManualOption onAdd={onAdd} />
      </OptionPanel>
    </div>
  );
}

function OptionPanel({
  title,
  active,
  onSelect,
  children,
}: {
  title: string;
  active: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={['border', active ? 'border-line-strong' : 'border-line'].join(' ')}>
      <button
        type="button"
        onClick={onSelect}
        className={[
          'flex h-9 w-full items-center justify-between px-3 text-left text-xs uppercase tracking-wide transition-colors',
          active ? 'bg-faint text-fg' : 'text-muted hover:bg-faint hover:text-fg',
        ].join(' ')}
      >
        <span>{title}</span>
        <span className={['h-1.5 w-1.5 border border-current', active ? 'bg-current' : ''].join(' ')} />
      </button>
      {active && <div className="space-y-3 border-t border-line p-3">{children}</div>}
    </section>
  );
}

function KitOption({ onAdd }: { onAdd: (system: CompareSystem) => void }) {
  const { cameras, lenses } = useKit();
  const combos = useMemo(() => kitComboCandidates(cameras, lenses), [cameras, lenses]);
  const options = useMemo<SelectOption[]>(
    () => combos.map((combo) => ({ id: combo.id, label: combo.label, maker: 'Kit' })),
    [combos],
  );
  const [comboId, setComboId] = useState('');
  const combo = combos.find((item) => item.id === comboId);
  const [focal, setFocal] = useState(50);
  const [aperture, setAperture] = useState(1.8);

  useEffect(() => {
    if (!combo) return;
    setFocal(combo.focalMin);
    setAperture(maxApertureAtFocal(combo, combo.focalMin));
  }, [combo?.id]);

  const submit = () => {
    if (!combo) return;
    onAdd({
      id: nextSystemId(),
      context: combo.label,
      format: getFormat(combo.formatId),
      focal,
      aperture,
      source: compareSourceFromKitCombo(combo),
    });
  };

  return (
    <>
      {combos.length === 0 ? (
        <div className="text-xs text-muted">Your kit is empty. Add saved cameras and lenses in My Kit, or use Manual.</div>
      ) : (
        <LabeledControl label="Kit combination">
          <SearchSelect
            options={options}
            value={comboId}
            onChange={setComboId}
            placeholder="Select kit combination"
            showMakerInTrigger={false}
          />
        </LabeledControl>
      )}
      {combo && <FocalAperture lens={combo} focal={focal} aperture={aperture} setFocal={setFocal} setAperture={setAperture} />}
      <AddButton onClick={submit} disabled={!combo} />
    </>
  );
}

function CatalogOption({ onAdd }: { onAdd: (system: CompareSystem) => void }) {
  const { cameras, lenses, status } = useCatalog();
  const [cameraId, setCameraId] = useState('');
  const camera = cameras.find((item) => item.id === cameraId);
  const availableLenses = useMemo(() => (camera ? lensesForCamera(camera, lenses) : []), [camera, lenses]);
  const [lensId, setLensId] = useState('');
  const lens = availableLenses.find((item) => item.id === lensId);
  const [focal, setFocal] = useState(50);
  const [aperture, setAperture] = useState(1.8);

  const cameraOptions = useMemo<SelectOption[]>(
    () => cameras.map((item) => ({ id: item.id, label: item.name, maker: item.maker })),
    [cameras],
  );
  const lensOptions = useMemo<SelectOption[]>(
    () => availableLenses.map((item) => ({ id: item.id, label: lensOptionLabel(item), maker: item.maker })),
    [availableLenses],
  );

  useEffect(() => {
    setLensId('');
  }, [cameraId]);

  useEffect(() => {
    if (!lens) return;
    setFocal(defaultFocal(lens));
    setAperture(maxApertureAtFocal(lens, defaultFocal(lens)));
  }, [lens?.id]);

  const submit = () => {
    if (!camera || !lens) return;
    onAdd({
      id: nextSystemId(),
      context: `${camera.name} · ${lens.name}`,
      format: cameraFormat(camera),
      focal,
      aperture,
      source: { type: 'catalog', cameraId: camera.id, lensId: lens.id, mount: camera.mount },
    });
  };

  return (
    <>
      <LabeledControl label="Camera">
        <SearchSelect
          options={cameraOptions}
          value={cameraId}
          onChange={setCameraId}
          placeholder={status === 'loading' ? 'Loading catalog…' : 'Select camera'}
        />
      </LabeledControl>
      <LabeledControl label={camera ? `Lens (${availableLenses.length} compatible)` : 'Lens'}>
        <SearchSelect
          options={lensOptions}
          value={lensId}
          onChange={setLensId}
          placeholder={camera ? 'Select lens' : 'Select camera first'}
        />
      </LabeledControl>
      {lens && <FocalAperture lens={lens} focal={focal} aperture={aperture} setFocal={setFocal} setAperture={setAperture} />}
      <AddButton onClick={submit} disabled={!camera || !lens} />
    </>
  );
}

function ManualOption({ onAdd }: { onAdd: (system: CompareSystem) => void }) {
  const formatOptions = useMemo<SelectOption[]>(
    () => FORMATS.map((format) => ({ id: format.id, label: `${shortFmt(format)} · ${cropFactor(format).toFixed(1)}x`, maker: 'Format' })),
    [],
  );
  const [formatId, setFormatId] = useState('ff');
  const [focal, setFocal] = useState(50);
  const [aperture, setAperture] = useState(1.8);
  const format = getFormat(formatId);

  const submit = () => {
    onAdd({
      id: nextSystemId(),
      context: shortFmt(format),
      format,
      focal,
      aperture,
      source: { type: 'manual' },
    });
  };

  return (
    <>
      <LabeledControl label="Format">
        <SearchSelect
          options={formatOptions}
          value={formatId}
          onChange={setFormatId}
          placeholder="Select format"
          showMakerInTrigger={false}
        />
      </LabeledControl>
      <ManualOptics focal={focal} aperture={aperture} setFocal={setFocal} setAperture={setAperture} />
      <AddButton onClick={submit} />
    </>
  );
}

function LabeledControl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label">{label}</span>
      {children}
    </label>
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

function ManualOptics({
  focal,
  aperture,
  setFocal,
  setAperture,
}: {
  focal: number;
  aperture: number;
  setFocal: (value: number) => void;
  setAperture: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <LabeledControl label="Focal mm">
        <NumberField value={focal} onCommit={setFocal} min={1} className={fieldCls} />
      </LabeledControl>
      <LabeledControl label="ƒ/">
        <NumberField value={aperture} onCommit={setAperture} min={0.7} step={0.1} className={fieldCls} />
      </LabeledControl>
    </div>
  );
}

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
  setFocal: (value: number) => void;
  setAperture: (value: number) => void;
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
      <LabeledControl label={isZoom ? `Focal (${lens.focalMin}-${lens.focalMax}mm)` : 'Focal mm'}>
        <NumberField
          value={focal}
          onCommit={commitFocal}
          min={lens.focalMin}
          max={lens.focalMax}
          disabled={!isZoom}
          className={fieldCls}
        />
      </LabeledControl>
      <LabeledControl label={`Aperture (${apertureRangeLabel(lens)} lens)`}>
        <NumberField
          value={aperture}
          onCommit={setAperture}
          min={maxAtFocal}
          max={lens.apMin}
          step={0.1}
          className={fieldCls}
        />
      </LabeledControl>
    </div>
  );
}
