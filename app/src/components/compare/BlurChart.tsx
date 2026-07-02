import { useMemo, useState, type ReactNode } from 'react';
import { scaleLinear, scaleLog } from '@visx/scale';
import { LinePath, Line } from '@visx/shape';
import { Group } from '@visx/group';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { Check, ChevronDown, Layers, MousePointer2, Ruler } from 'lucide-react';
import { compareLineColor, compareLineStyle } from '../../lib/compareStyles';
import { blurFraction, fieldOfView, focusDistanceForFraming } from '../../lib/engine';
import { systemLabel, systemOpticsLabel, systemSourceLabel, type CompareSystem } from '../../store/CompareProvider';
import type { TooltipKey } from '../../lib/tooltips';
import { Dropdown } from '../ui/Dropdown';
import { Tooltip } from '../ui/Tooltip';

const MARGIN = { top: 14, right: 18, bottom: 34, left: 46 };
const MIN_BG_BEHIND_M = 0.1;
const MAX_BG_BEHIND_M = 200;
type ReadoutMode = 'fixed' | 'tracked';

const DEPTH_BANDS = [
  { id: 'small-room', label: 'Small room', shortLabel: 'Small room', fromM: 0.1, toM: 5, opacity: 0.055 },
  { id: 'large-room', label: 'Large room', shortLabel: 'Large room', fromM: 5, toM: 20, opacity: 0.035 },
  { id: 'garden-street', label: 'Garden / street', shortLabel: 'Garden', fromM: 20, toM: 40, opacity: 0.055 },
  { id: 'open-distance', label: 'Open distance', shortLabel: 'Open', fromM: 40, toM: 200, opacity: 0.035 },
] as const;
const DEPTH_LABEL_MIN_WIDTH = 72;

interface Pt {
  behindM: number;
  blurPct: number;
}
interface Series {
  id: string;
  label: string;
  sourceLabel: string;
  optionLabel: string;
  stroke: string;
  dash: string;
  focusM: number;
  fovH: number;
  points: Pt[];
}

function blurAt(points: Pt[], behindM: number): number | null {
  if (points.length === 0 || behindM < points[0].behindM || behindM > points[points.length - 1].behindM)
    return null;
  for (let i = 1; i < points.length; i++) {
    if (behindM <= points[i].behindM) {
      const a = points[i - 1];
      const b = points[i];
      const t = (behindM - a.behindM) / (b.behindM - a.behindM || 1);
      return a.blurPct + t * (b.blurPct - a.blurPct);
    }
  }
  return points[points.length - 1].blurPct;
}

function Inner({
  width,
  height,
  series,
  showContext,
  showDepthBands,
  readoutMode,
  trackedSeriesIds,
}: {
  width: number;
  height: number;
  series: Series[];
  showContext: boolean;
  showDepthBands: boolean;
  readoutMode: ReadoutMode;
  trackedSeriesIds: string[];
}) {
  const [cursor, setCursor] = useState<number | null>(null);
  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = Math.max(0, height - MARGIN.top - MARGIN.bottom);
  const trackedSeriesSet = useMemo(() => new Set(trackedSeriesIds), [trackedSeriesIds]);
  const visibleTrackedSeries = useMemo(
    () => series.filter((item) => trackedSeriesSet.has(item.id)),
    [series, trackedSeriesSet],
  );

  const yMax = useMemo(() => {
    const m = Math.max(0.5, ...series.flatMap((s) => s.points.map((p) => p.blurPct)));
    return Math.ceil(m * 1.1);
  }, [series]);

  const xScale = useMemo(
    () => scaleLog<number>({ domain: [MIN_BG_BEHIND_M, MAX_BG_BEHIND_M], range: [0, innerW], base: 10 }),
    [innerW],
  );
  const yScale = useMemo(
    () => scaleLinear<number>({ domain: [0, yMax], range: [innerH, 0] }),
    [innerH, yMax],
  );

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    const p = localPoint(e);
    if (!p) return;
    const x = p.x - MARGIN.left;
    if (x < 0 || x > innerW) return setCursor(null);
    setCursor(xScale.invert(x));
  };

  const tickFmt = (d: number) => (d >= 1 ? `${d}m` : `${d.toFixed(1)}m`);
  const trackedReadouts =
    cursor == null
      ? []
      : layoutTrackedReadouts(
          visibleTrackedSeries
            .map((item) => {
              const blurPct = blurAt(item.points, cursor);
              if (blurPct == null) return null;
              return {
                series: item,
                blurPct,
                behindM: cursor,
                point: {
                  x: MARGIN.left + xScale(cursor),
                  y: MARGIN.top + yScale(blurPct),
                },
              };
            })
            .filter((item): item is TrackedReadoutInput => item != null),
          { width, height },
          showContext,
        );
  const cursorPlotX = cursor == null ? null : xScale(cursor);
  const cursorScreenX = cursorPlotX == null ? null : MARGIN.left + cursorPlotX;
  const fixedReadoutStyle =
    cursorScreenX == null
      ? undefined
      : cursorScreenX < width / 2
        ? { left: cursorScreenX + 12, right: 12 }
        : { left: 12, right: width - cursorScreenX + 12 };
  const cursorLabelOnRight =
    cursorPlotX == null ? true : cursorPlotX < 128 ? true : cursorPlotX > innerW - 148 ? false : cursorPlotX > innerW / 2;

  return (
    <div className="relative">
      <svg width={width} height={height} className="touch-none">
        <Group left={MARGIN.left} top={MARGIN.top}>
          {showDepthBands &&
            DEPTH_BANDS.map((band) => {
              const x0 = xScale(Math.max(band.fromM, MIN_BG_BEHIND_M));
              const x1 = xScale(Math.min(band.toM, MAX_BG_BEHIND_M));
              const bandWidth = Math.max(0, x1 - x0);
              return (
                <g key={band.id} pointerEvents="none">
                  <rect x={x0} y={0} width={bandWidth} height={innerH} fill="var(--fg)" opacity={band.opacity} />
                  {bandWidth >= DEPTH_LABEL_MIN_WIDTH && (
                    <text
                      x={x0 + 8}
                      y={14}
                      fill="var(--muted)"
                      fontSize={10}
                      fontWeight={700}
                      letterSpacing={0.2}
                    >
                      {band.shortLabel}
                    </text>
                  )}
                </g>
              );
            })}

          <AxisLeft
            scale={yScale}
            numTicks={4}
            stroke="var(--line)"
            tickStroke="var(--line)"
            tickFormat={(v) => `${v}%`}
            tickLabelProps={() => ({ fill: 'var(--muted)', fontSize: 10, dx: -4, dy: 3, textAnchor: 'end' })}
          />
          <AxisBottom
            top={innerH}
            scale={xScale}
            tickValues={[0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200]}
            stroke="var(--line)"
            tickStroke="var(--line)"
            tickFormat={(v) => tickFmt(v as number)}
            tickLabelProps={() => ({ fill: 'var(--muted)', fontSize: 10, dy: 2, textAnchor: 'middle' })}
          />

          {series.map((s) => (
            <LinePath
              key={s.id}
              data={s.points}
              x={(p) => xScale(p.behindM)}
              y={(p) => yScale(p.blurPct)}
              stroke={s.stroke}
              strokeWidth={1.5}
              strokeDasharray={s.dash}
              curve={undefined}
            />
          ))}

          {cursor != null && (
            <>
              <Line
                from={{ x: xScale(cursor), y: 0 }}
                to={{ x: xScale(cursor), y: innerH }}
                stroke="var(--fg)"
                strokeWidth={1}
                strokeDasharray="2,3"
                pointerEvents="none"
              />
              <text
                x={xScale(cursor) + (cursorLabelOnRight ? 8 : -8)}
                y={-3}
                fill="var(--fg)"
                fontSize={10}
                fontWeight={700}
                letterSpacing={0.2}
                textAnchor={cursorLabelOnRight ? 'start' : 'end'}
                pointerEvents="none"
              >
                background position
              </text>
              {series.map((s) => {
                const v = blurAt(s.points, cursor);
                if (v == null) return null;
                const tracked = readoutMode === 'tracked' && trackedSeriesSet.has(s.id);
                return (
                  <circle
                    key={s.id}
                    cx={xScale(cursor)}
                    cy={yScale(v)}
                    r={tracked ? 5 : 3}
                    fill="var(--bg)"
                    stroke={s.stroke}
                    strokeWidth={tracked ? 2 : 1.5}
                    pointerEvents="none"
                  />
                );
              })}
            </>
          )}

          {/* capture overlay */}
          <rect
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => setCursor(null)}
            onTouchMove={onMove}
          />
        </Group>
      </svg>

      {/* ranked readout */}
      {readoutMode === 'fixed' && (
        <div
          className={[
            'pointer-events-none absolute top-2 space-y-1',
            cursor != null ? 'border border-line bg-bg/90 px-2 py-1' : 'left-12',
          ].join(' ')}
          style={fixedReadoutStyle}
        >
          {cursor != null ? (
            <>
              <div className="label">background +{formatDistance(cursor)} behind subject</div>
              {[...series]
                .map((s) => ({ s, v: blurAt(s.points, cursor) }))
                .filter((r) => r.v != null)
                .sort((a, b) => (b.v as number) - (a.v as number))
                .map(({ s, v }) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <DashSwatch color={s.stroke} dash={s.dash} />
                    <span className="tabular-nums font-bold">{(v as number).toFixed(1)}%</span>
                    <span className="min-w-0 truncate text-muted">
                      {s.optionLabel} · {s.sourceLabel}
                      {showContext
                        ? ` · stand ${formatDistance(s.focusM)} · camera to bg ≈ ${formatDistance(s.focusM + cursor)} · ${Math.round(s.fovH)}° FOV`
                        : ''}
                    </span>
                  </div>
                ))}
            </>
          ) : (
            <div className="label">hover to read blur at a background distance</div>
          )}
        </div>
      )}

      {readoutMode === 'tracked' && cursor != null && (
        <>
          {trackedReadouts.map((readout) => (
            <TrackedReadout key={readout.series.id} readout={readout} showContext={showContext} />
          ))}
        </>
      )}

      {readoutMode === 'tracked' && cursor == null && (
        <div className="pointer-events-none absolute left-12 top-2 label">hover to move tracked readouts</div>
      )}

      {showContext && cursor == null && (
        <div className="pointer-events-none absolute bottom-8 left-12 right-4 flex flex-wrap gap-2">
          {series.map((s) => (
            <div key={s.id} className="flex max-w-full items-center gap-2 border border-line bg-bg/90 px-2 py-1 text-xs">
              <DashSwatch color={s.stroke} dash={s.dash} />
              <span className="truncate font-bold">{formatDistance(s.focusM)}</span>
              <span className="label shrink-0">{Math.round(s.fovH)}° FOV</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TrackedReadoutInput {
  series: Series;
  blurPct: number;
  behindM: number;
  point: { x: number; y: number };
}

interface TrackedReadoutLayout extends TrackedReadoutInput {
  left: number;
  top: number;
  width: number;
}

function trackedBoxSize(bounds: { width: number; height: number }, showContext: boolean) {
  return { w: Math.min(286, Math.max(180, bounds.width - 16)), h: showContext ? 92 : 68 };
}

function preferredTrackedPosition(
  point: { x: number; y: number },
  bounds: { width: number; height: number },
  box: { w: number; h: number },
) {
  const gap = 12;
  const nextToPoint = point.x + gap + box.w > bounds.width ? point.x - gap - box.w : point.x + gap;
  const abovePoint = point.y - gap - box.h < 0 ? point.y + gap : point.y - gap - box.h;
  return {
    left: clamp(nextToPoint, 8, Math.max(8, bounds.width - box.w - 8)),
    top: clamp(abovePoint, 8, Math.max(8, bounds.height - box.h - 8)),
  };
}

function layoutTrackedReadouts(
  inputs: TrackedReadoutInput[],
  bounds: { width: number; height: number },
  showContext: boolean,
): TrackedReadoutLayout[] {
  const box = trackedBoxSize(bounds, showContext);
  const gap = 6;
  const positioned = inputs.map((input, order) => ({
    ...input,
    ...preferredTrackedPosition(input.point, bounds, box),
    width: box.w,
    order,
  }));

  const groups = new Map<string, typeof positioned>();
  for (const item of positioned) {
    const key = item.point.x + box.w + 12 > bounds.width ? 'left' : 'right';
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  for (const group of groups.values()) {
    group.sort((a, b) => a.top - b.top);
    for (let index = 1; index < group.length; index++) {
      group[index].top = Math.max(group[index].top, group[index - 1].top + box.h + gap);
    }
    const overflow = group[group.length - 1]?.top + box.h + 8 - bounds.height;
    if (overflow > 0) {
      for (const item of group) item.top = Math.max(8, item.top - overflow);
    }
  }

  return positioned.sort((a, b) => a.order - b.order);
}

function TrackedReadout({ readout, showContext }: { readout: TrackedReadoutLayout; showContext: boolean }) {
  const { series, blurPct, behindM, left, top, width } = readout;

  return (
    <div
      className="pointer-events-none absolute z-10 border border-line bg-bg/95 px-3 py-2 text-xs shadow-none"
      style={{ left, top, width }}
    >
      <div className="label mb-1">background +{formatDistance(behindM)} behind subject</div>
      <div className="flex items-center gap-2">
        <DashSwatch color={series.stroke} dash={series.dash} />
        <span className="text-base font-bold tabular-nums">{blurPct.toFixed(1)}%</span>
        <span className="min-w-0 truncate text-muted">{series.optionLabel}</span>
      </div>
      {showContext && (
        <div className="label mt-2 truncate">
          {series.sourceLabel} · stand {formatDistance(series.focusM)} · camera to bg ≈{' '}
          {formatDistance(series.focusM + behindM)} · {Math.round(series.fovH)}° FOV
        </div>
      )}
    </div>
  );
}

export function DashSwatch({ color = 'var(--fg)', dash = '0' }: { color?: string; dash?: string }) {
  return (
    <svg width={22} height={8} className="shrink-0">
      <line
        x1={0}
        y1={4}
        x2={22}
        y2={4}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray={dash}
      />
    </svg>
  );
}

function blurBehindSubjectCurve(system: CompareSystem, focusM: number): Pt[] {
  const logStart = Math.log10(MIN_BG_BEHIND_M);
  const logEnd = Math.log10(MAX_BG_BEHIND_M);
  const steps = 200;
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const behindM = 10 ** (logStart + (logEnd - logStart) * (i / steps));
    const backgroundDistanceM = focusM + behindM;
    out.push({
      behindM,
      blurPct: 100 * blurFraction(
        { format: system.format, focal: system.focal, aperture: system.aperture },
        focusM,
        backgroundDistanceM,
      ),
    });
  }
  return out;
}

function seriesFocusDistance(system: CompareSystem, subjectWidthM: number, focusOverrideM: number | null): number {
  return focusOverrideM ?? focusDistanceForFraming(system.focal, system.format, system.subjectWidthM ?? subjectWidthM, 'h');
}

export function BlurChart({
  systems,
  subjectWidthM,
  focusOverrideM,
}: {
  systems: CompareSystem[];
  subjectWidthM: number;
  focusOverrideM: number | null;
}) {
  const [showContext, setShowContext] = useState(true);
  const [showDepthBands, setShowDepthBands] = useState(true);
  const [readoutMode, setReadoutMode] = useState<ReadoutMode>('fixed');
  const [trackedSeriesIds, setTrackedSeriesIds] = useState<string[] | null>(null);
  const series: Series[] = useMemo(
    () =>
      systems.map((s, index) => {
        const focusM = seriesFocusDistance(s, subjectWidthM, focusOverrideM);
        const color = compareLineColor(s.lineColor, index);
        const style = compareLineStyle(s.lineStyle, index);
        return {
          id: s.id,
          label: systemLabel(s),
          sourceLabel: systemSourceLabel(s),
          optionLabel: systemOpticsLabel(s),
          stroke: color.stroke,
          dash: style.dash,
          focusM,
          fovH: fieldOfView(s.focal, s.format).h,
          points: blurBehindSubjectCurve(s, focusM),
        };
      }),
    [systems, subjectWidthM, focusOverrideM],
  );
  const allSeriesIds = useMemo(() => series.map((item) => item.id), [series]);
  const activeTrackedSeriesIds = useMemo(() => {
    if (trackedSeriesIds == null) return allSeriesIds;
    const valid = trackedSeriesIds.filter((id) => allSeriesIds.includes(id));
    return valid.length === 0 ? allSeriesIds : valid;
  }, [allSeriesIds, trackedSeriesIds]);
  const allTracked = activeTrackedSeriesIds.length === allSeriesIds.length;
  const selectAllTracked = () => setTrackedSeriesIds(null);
  const toggleTrackedSeries = (id: string) => {
    setTrackedSeriesIds((current) => {
      const currentIds = current == null ? allSeriesIds : current.filter((item) => allSeriesIds.includes(item));
      const next = currentIds.includes(id) ? currentIds.filter((item) => item !== id) : [...currentIds, id];
      if (next.length === 0 || next.length === allSeriesIds.length) return null;
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-[360px] w-full flex-col border border-line">
      <div className="border-b border-line px-4 py-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide">Blur / background</div>
          <div className="label mt-1">x +m behind subject · y blur %</div>
        </div>
      </div>
      {systems.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-xs text-muted">
          Add a system to plot its background blur.
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          <div className="absolute right-3 top-3 z-20 flex items-center gap-1">
            <ReadoutMenu
              series={series}
              readoutMode={readoutMode}
              onReadoutMode={setReadoutMode}
              selectedIds={activeTrackedSeriesIds}
              allSelected={allTracked}
              onSelectAll={selectAllTracked}
              onToggle={toggleTrackedSeries}
            />
            <LayerMenu
              showDepthBands={showDepthBands}
              showContext={showContext}
              onToggleDepth={() => setShowDepthBands((current) => !current)}
              onToggleContext={() => setShowContext((current) => !current)}
            />
          </div>
          <ParentSize>
            {({ width, height }) => (
              <Inner
                width={width}
                height={height}
                series={series}
                showContext={showContext}
                showDepthBands={showDepthBands}
                readoutMode={readoutMode}
                trackedSeriesIds={activeTrackedSeriesIds}
              />
            )}
          </ParentSize>
        </div>
      )}
    </div>
  );
}

function ReadoutMenu({
  series,
  readoutMode,
  onReadoutMode,
  selectedIds,
  allSelected,
  onSelectAll,
  onToggle,
}: {
  series: Series[];
  readoutMode: ReadoutMode;
  onReadoutMode: (mode: ReadoutMode) => void;
  selectedIds: string[];
  allSelected: boolean;
  onSelectAll: () => void;
  onToggle: (id: string) => void;
}) {
  const selectedSet = new Set(selectedIds);
  const triggerLabel = readoutMode === 'fixed' ? 'List' : allSelected ? 'Track all' : `Track ${selectedIds.length}`;

  return (
    <Dropdown
      align="right"
      className="w-72"
      closeOnClick={false}
      trigger={
        <Tooltip tip="compareChartReadout" align="end">
          <ChartToolTrigger active icon={<MousePointer2 size={15} strokeWidth={1.6} />} label={triggerLabel} />
        </Tooltip>
      }
    >
      {({ close }) => (
        <div className="py-1">
          <div className="label px-3 py-1.5">Cursor</div>
          {(['fixed', 'tracked'] as const).map((mode) => (
            <Tooltip key={mode} tip={mode === 'fixed' ? 'compareReadoutFixed' : 'compareReadoutTracked'} side="bottom" align="start" className="block">
              <button
                type="button"
                onClick={() => {
                  onReadoutMode(mode);
                  if (mode === 'fixed') close();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-faint"
                aria-pressed={readoutMode === mode}
              >
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  {readoutMode === mode && <Check size={12} strokeWidth={2.4} />}
                </span>
                <span className="min-w-0 flex-1 truncate font-bold">{mode === 'fixed' ? 'List' : 'Track lines'}</span>
              </button>
            </Tooltip>
          ))}
          {readoutMode === 'tracked' && series.length > 0 && (
            <div className="mt-1 border-t border-line py-1">
              <button
                type="button"
                onClick={onSelectAll}
                className={['flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-faint', allSelected ? 'bg-faint' : ''].join(' ')}
                aria-pressed={allSelected}
              >
                <ToggleMark selected={allSelected} />
                <span className="min-w-0 flex-1 truncate font-bold">All lines</span>
                <span className="label">{series.length}</span>
              </button>
              <div className="max-h-56 overflow-y-auto">
                {series.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onToggle(item.id)}
                    className={[
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-faint',
                      selectedSet.has(item.id) ? 'bg-faint' : '',
                    ].join(' ')}
                    aria-pressed={selectedSet.has(item.id)}
                  >
                    <ToggleMark selected={selectedSet.has(item.id)} />
                    <DashSwatch color={item.stroke} dash={item.dash} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{item.optionLabel}</span>
                      <span className="label block truncate">{item.sourceLabel}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Dropdown>
  );
}

function LayerMenu({
  showDepthBands,
  showContext,
  onToggleDepth,
  onToggleContext,
}: {
  showDepthBands: boolean;
  showContext: boolean;
  onToggleDepth: () => void;
  onToggleContext: () => void;
}) {
  const enabledCount = Number(showDepthBands) + Number(showContext);

  return (
    <Dropdown
      align="right"
      className="w-72"
      closeOnClick={false}
      trigger={
        <Tooltip tip="compareChartLayers" align="end">
          <ChartToolTrigger
            active={enabledCount > 0}
            icon={<Layers size={15} strokeWidth={1.6} />}
            label={enabledCount > 0 ? `Views ${enabledCount}` : 'Views'}
          />
        </Tooltip>
      }
    >
      <div className="py-1">
        <div className="label px-3 py-1.5">View layers</div>
        <ToggleMenuRow
          active={showDepthBands}
          icon={<Layers size={14} strokeWidth={1.6} />}
          label="Depth bands"
          tip="compareDepthBands"
          onClick={onToggleDepth}
        />
        <ToggleMenuRow
          active={showContext}
          icon={<Ruler size={14} strokeWidth={1.6} />}
          label="FOV / stand"
          tip="compareFovStandLayer"
          onClick={onToggleContext}
        />
      </div>
    </Dropdown>
  );
}

function ChartToolTrigger({ icon, label, active }: { icon: ReactNode; label: string; active?: boolean }) {
  return (
    <div
      className={[
        'inline-flex h-9 items-center gap-2 border px-2.5 text-xs transition-colors',
        active ? 'border-fg bg-bg/95 text-fg' : 'border-line bg-bg/95 text-muted hover:border-line-strong hover:text-fg',
      ].join(' ')}
    >
      {icon}
      <span className="max-w-24 truncate font-bold">{label}</span>
      <ChevronDown size={13} strokeWidth={1.6} className="text-muted" />
    </div>
  );
}

function ToggleMenuRow({
  active,
  icon,
  label,
  tip,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  tip: TooltipKey;
  onClick: () => void;
}) {
  return (
    <Tooltip tip={tip} side="bottom" align="start" className="block">
      <button type="button" onClick={onClick} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-faint" aria-pressed={active}>
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
          {active && <Check size={12} strokeWidth={2.4} />}
        </span>
        <span className="shrink-0 text-muted">{icon}</span>
        <span className="min-w-0 flex-1 truncate font-bold">{label}</span>
      </button>
    </Tooltip>
  );
}

function ToggleMark({ selected }: { selected: boolean }) {
  return (
    <span className={['flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-line', selected ? 'bg-fg' : ''].join(' ')}>
      {selected && <span className="h-1.5 w-1.5 bg-bg" />}
    </span>
  );
}

function formatDistance(distanceM: number): string {
  if (distanceM < 1) return `${Math.round(distanceM * 100)}cm`;
  if (distanceM < 10) return `${distanceM.toFixed(1)}m`;
  return `${Math.round(distanceM)}m`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
