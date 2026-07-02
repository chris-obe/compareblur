import { Check, ChevronDown, Crosshair, MoveHorizontal, Target, X } from 'lucide-react';
import { NumberField } from '../ui/NumberField';
import { focusDistanceForFraming, getFormat } from '../../lib/engine';
import { SUBJECT_DISTANCE_PRESETS } from '../../lib/subjectDistance';
import { Dropdown } from '../ui/Dropdown';
import { Tooltip } from '../ui/Tooltip';

interface Props {
  width: number;
  onChange: (w: number) => void;
  focusM: number | null;
  onFocusChange: (m: number | null) => void;
}

// Focus-distance slider is log-mapped so close distances get fine control.
const FOCUS_MIN = 0.3;
const FOCUS_MAX = 200;
const L_MIN = Math.log10(FOCUS_MIN);
const L_MAX = Math.log10(FOCUS_MAX);
const sliderToDist = (t: number) => 10 ** (L_MIN + (t / 1000) * (L_MAX - L_MIN));
const distToSlider = (d: number) => Math.round(((Math.log10(d) - L_MIN) / (L_MAX - L_MIN)) * 1000);
const fmtDist = (d: number) => (d < 10 ? `${d.toFixed(1)} m` : `${Math.round(d)} m`);

export function SubjectControl({ width, onChange, focusM, onFocusChange }: Props) {
  const selectedPreset = SUBJECT_DISTANCE_PRESETS.find((preset) => preset.widthM === width);
  const isPreset = selectedPreset != null;
  const manual = focusM != null;
  // where the handle sits in framing mode: the distance a 50mm FF lens would frame this subject at
  const autoRef = focusDistanceForFraming(50, getFormat('ff'), width);
  const sliderDist = manual ? focusM : autoRef;
  const setFramingWidth = (nextWidth: number) => {
    onFocusChange(null);
    onChange(nextWidth);
  };
  const enableFixedDistance = () => onFocusChange(sliderDist);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dropdown
        align="left"
        className="w-72"
        closeOnClick={false}
        trigger={
          <Tooltip tip="compareFraming" side="bottom" align="start">
            <div className="inline-flex h-9 items-center gap-2 border border-line px-2.5 text-xs transition-colors hover:border-line-strong">
              <Target size={14} strokeWidth={1.6} />
              <span className="label">Frame</span>
              <span className="font-bold">{selectedPreset?.label ?? `${fmtDist(width)} wide`}</span>
              <ChevronDown size={13} strokeWidth={1.6} className="text-muted" />
            </div>
          </Tooltip>
        }
      >
        {({ close }) => (
          <div className="py-1">
            <div className="label px-3 py-1.5">Subject fill</div>
            {SUBJECT_DISTANCE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setFramingWidth(preset.widthM);
                  close();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-faint"
              >
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  {!manual && width === preset.widthM && <Check size={12} strokeWidth={2.4} />}
                </span>
                <span className="min-w-0 flex-1 truncate">{preset.label}</span>
                <span className="text-muted tabular-nums">{fmtDist(preset.widthM)} wide</span>
              </button>
            ))}
            <div className="mt-1 border-t border-line p-3">
              <label className="flex items-center gap-2 text-xs">
                <span className="label shrink-0">Custom</span>
                <NumberField
                  value={width}
                  onCommit={setFramingWidth}
                  min={0.1}
                  step={0.1}
                  aria-label="Subject width in metres"
                  className={[
                    'min-w-0 flex-1 border bg-transparent px-2 py-1 text-right outline-none tabular-nums focus:border-line-strong',
                    !manual && !isPreset ? 'border-fg' : 'border-line',
                  ].join(' ')}
                />
                <span className="text-muted">m wide</span>
              </label>
            </div>
          </div>
        )}
      </Dropdown>

      <Dropdown
        align="left"
        className="w-72"
        trigger={
          <Tooltip tip="comparePositionMode" side="bottom" align="start">
            <div className="inline-flex h-9 items-center gap-2 border border-line px-2.5 text-xs transition-colors hover:border-line-strong">
              <Crosshair size={14} strokeWidth={1.6} />
              <span className="label">Mode</span>
              <span className="font-bold">{manual ? 'Fixed position' : 'Match framing'}</span>
              <ChevronDown size={13} strokeWidth={1.6} className="text-muted" />
            </div>
          </Tooltip>
        }
      >
        {({ close }) => (
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                onFocusChange(null);
                close();
              }}
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-faint"
            >
              <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                {!manual && <Check size={12} strokeWidth={2.4} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">Match framing</span>
                <span className="label block normal-case tracking-normal">Each system stands where it needs to.</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                enableFixedDistance();
                close();
              }}
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-faint"
            >
              <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                {manual && <Check size={12} strokeWidth={2.4} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">Fixed position</span>
                <span className="label block normal-case tracking-normal">One camera-to-subject distance.</span>
              </span>
            </button>
          </div>
        )}
      </Dropdown>

      {manual ? (
        <Tooltip tip="compareFixedDistance" side="bottom" align="start">
          <div className="flex h-9 min-w-[min(100%,22rem)] flex-1 items-center gap-2 border border-line px-2.5">
            <MoveHorizontal size={14} strokeWidth={1.6} className="shrink-0 text-muted" />
            <input
              type="range"
              min={0}
              max={1000}
              value={distToSlider(sliderDist)}
              onChange={(e) => onFocusChange(sliderToDist(Number(e.target.value)))}
              aria-label="Fixed camera-to-subject distance"
              className="h-1 min-w-0 flex-1 cursor-pointer appearance-none bg-line"
              style={{ accentColor: 'var(--fg)' }}
            />
            <span className="w-16 shrink-0 text-right text-xs font-bold tabular-nums">{fmtDist(focusM)}</span>
            <button
              type="button"
              onClick={() => onFocusChange(null)}
              aria-label="Reset to match framing"
              title="Reset to match framing"
              className="flex h-6 w-6 shrink-0 items-center justify-center border border-line text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              <X size={13} strokeWidth={1.5} />
            </button>
          </div>
        </Tooltip>
      ) : (
        <div className="flex h-9 min-w-0 flex-1 items-center gap-3 overflow-hidden border border-line px-2.5 text-xs">
          <span className="min-w-0 truncate">
            <span className="label mr-1">Stand</span>
            <span className="font-bold">per system</span>
          </span>
          <span className="hidden min-w-0 truncate md:inline">
            <span className="label mr-1">BG</span>
            <span className="font-bold">+0.1-200m</span>
          </span>
        </div>
      )}
    </div>
  );
}
