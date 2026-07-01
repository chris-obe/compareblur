import { useMemo, useState } from 'react';
import { scaleLinear, scaleLog } from '@visx/scale';
import { LinePath, Line } from '@visx/shape';
import { Group } from '@visx/group';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { Ruler } from 'lucide-react';
import { compareLineColor, compareLineStyle } from '../../lib/compareStyles';
import { blurFraction, fieldOfView, focusDistanceForFraming } from '../../lib/engine';
import { systemLabel, type CompareSystem } from '../../store/CompareProvider';

const MARGIN = { top: 14, right: 18, bottom: 34, left: 46 };
const MIN_BG_BEHIND_M = 0.1;
const MAX_BG_BEHIND_M = 200;

interface Pt {
  behindM: number;
  blurPct: number;
}
interface Series {
  id: string;
  label: string;
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
}: {
  width: number;
  height: number;
  series: Series[];
  showContext: boolean;
}) {
  const [cursor, setCursor] = useState<number | null>(null);
  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = Math.max(0, height - MARGIN.top - MARGIN.bottom);

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

  return (
    <div className="relative">
      <svg width={width} height={height} className="touch-none">
        <Group left={MARGIN.left} top={MARGIN.top}>
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
              {series.map((s) => {
                const v = blurAt(s.points, cursor);
                if (v == null) return null;
                return (
                  <circle
                    key={s.id}
                    cx={xScale(cursor)}
                    cy={yScale(v)}
                    r={3}
                    fill="var(--bg)"
                    stroke={s.stroke}
                    strokeWidth={1.5}
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
      <div className="pointer-events-none absolute left-12 top-2 max-w-[calc(100%-4rem)] space-y-1">
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
                    {s.label}
                    {showContext ? ` · stand ${formatDistance(s.focusM)} · ${Math.round(s.fovH)}° FOV` : ''}
                  </span>
                </div>
              ))}
          </>
        ) : (
          <div className="label">hover to read blur at a background distance</div>
        )}
      </div>

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
  const series: Series[] = useMemo(
    () =>
      systems.map((s, index) => {
        const focusM = seriesFocusDistance(s, subjectWidthM, focusOverrideM);
        const color = compareLineColor(s.lineColor, index);
        const style = compareLineStyle(s.lineStyle, index);
        return {
          id: s.id,
          label: systemLabel(s),
          stroke: color.stroke,
          dash: style.dash,
          focusM,
          fovH: fieldOfView(s.focal, s.format).h,
          points: blurBehindSubjectCurve(s, focusM),
        };
      }),
    [systems, subjectWidthM, focusOverrideM],
  );

  return (
    <div className="flex h-full min-h-[360px] w-full flex-col border border-line">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide">Background blur by framing</div>
          <div className="label mt-1">x = background distance behind subject · y = blur as % of frame width</div>
        </div>
        <button
          type="button"
          onClick={() => setShowContext((current) => !current)}
          aria-pressed={showContext}
          title="Show standing distance and horizontal FOV"
          className={[
            'inline-flex items-center gap-2 border px-3 py-1.5 text-xs uppercase tracking-wide transition-colors',
            showContext ? 'border-fg bg-fg text-bg' : 'border-line hover:border-line-strong',
          ].join(' ')}
        >
          <Ruler size={14} strokeWidth={1.5} />
          FOV / stand
        </button>
      </div>
      {systems.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-xs text-muted">
          Add a system to plot its background blur.
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <ParentSize>{({ width, height }) => <Inner width={width} height={height} series={series} showContext={showContext} />}</ParentSize>
        </div>
      )}
    </div>
  );
}

function formatDistance(distanceM: number): string {
  if (distanceM < 1) return `${Math.round(distanceM * 100)}cm`;
  if (distanceM < 10) return `${distanceM.toFixed(1)}m`;
  return `${Math.round(distanceM)}m`;
}
