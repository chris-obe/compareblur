import { useMemo, useState } from 'react';
import { scaleLinear, scaleLog } from '@visx/scale';
import { LinePath, Line } from '@visx/shape';
import { Group } from '@visx/group';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { blurCurve } from '../../lib/engine';
import { systemLabel, type CompareSystem } from '../../store/CompareProvider';

// Monochrome differentiation: solid + three dash patterns. Caps at 4 systems.
export const DASHES = ['0', '5,4', '1.5,4', '9,4,1.5,4'];

const MARGIN = { top: 14, right: 18, bottom: 34, left: 46 };
const MIN_M = 0.5;
const MAX_M = 200;

interface Pt {
  distance: number;
  blurPct: number;
}
interface Series {
  id: string;
  label: string;
  points: Pt[];
}

function blurAt(points: Pt[], d: number): number | null {
  if (points.length === 0 || d < points[0].distance || d > points[points.length - 1].distance)
    return null;
  for (let i = 1; i < points.length; i++) {
    if (d <= points[i].distance) {
      const a = points[i - 1];
      const b = points[i];
      const t = (d - a.distance) / (b.distance - a.distance || 1);
      return a.blurPct + t * (b.blurPct - a.blurPct);
    }
  }
  return points[points.length - 1].blurPct;
}

function Inner({
  width,
  height,
  series,
}: {
  width: number;
  height: number;
  series: Series[];
}) {
  const [cursor, setCursor] = useState<number | null>(null);
  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const yMax = useMemo(() => {
    const m = Math.max(0.5, ...series.flatMap((s) => s.points.map((p) => p.blurPct)));
    return Math.ceil(m * 1.1);
  }, [series]);

  const xScale = useMemo(
    () => scaleLog<number>({ domain: [MIN_M, MAX_M], range: [0, innerW], base: 10 }),
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

  const tickFmt = (d: number) => (d >= 1 ? `${d}m` : `${d}m`);

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
            tickValues={[0.5, 1, 2, 5, 10, 20, 50, 100, 200]}
            stroke="var(--line)"
            tickStroke="var(--line)"
            tickFormat={(v) => tickFmt(v as number)}
            tickLabelProps={() => ({ fill: 'var(--muted)', fontSize: 10, dy: 2, textAnchor: 'middle' })}
          />

          {series.map((s, i) => (
            <LinePath
              key={s.id}
              data={s.points}
              x={(p) => xScale(p.distance)}
              y={(p) => yScale(p.blurPct)}
              stroke="var(--fg)"
              strokeWidth={1.5}
              strokeDasharray={DASHES[i % DASHES.length]}
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
                    stroke="var(--fg)"
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
      <div className="pointer-events-none absolute left-12 top-2 space-y-1">
        {cursor != null ? (
          <>
            <div className="label">at {cursor < 10 ? cursor.toFixed(1) : Math.round(cursor)} m</div>
            {[...series]
              .map((s, i) => ({ s, i, v: blurAt(s.points, cursor) }))
              .filter((r) => r.v != null)
              .sort((a, b) => (b.v as number) - (a.v as number))
              .map(({ s, i, v }) => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <DashSwatch index={i} />
                  <span className="tabular-nums font-bold">{(v as number).toFixed(1)}%</span>
                  <span className="text-muted">{s.label}</span>
                </div>
              ))}
          </>
        ) : (
          <div className="label">hover the chart to read blur at a distance</div>
        )}
      </div>
    </div>
  );
}

export function DashSwatch({ index }: { index: number }) {
  return (
    <svg width={22} height={8} className="shrink-0">
      <line
        x1={0}
        y1={4}
        x2={22}
        y2={4}
        stroke="var(--fg)"
        strokeWidth={1.5}
        strokeDasharray={DASHES[index % DASHES.length]}
      />
    </svg>
  );
}

export function BlurChart({
  systems,
  subjectWidthM,
}: {
  systems: CompareSystem[];
  subjectWidthM: number;
}) {
  const series: Series[] = useMemo(
    () =>
      systems.map((s) => ({
        id: s.id,
        label: systemLabel(s),
        points: blurCurve(
          { format: s.format, focal: s.focal, aperture: s.aperture },
          subjectWidthM,
          { axis: 'h', minM: MIN_M, maxM: MAX_M, steps: 200 },
        ),
      })),
    [systems, subjectWidthM],
  );

  return (
    <div className="h-[360px] w-full border border-line">
      {systems.length === 0 ? (
        <div className="flex h-full items-center justify-center text-xs text-muted">
          Add systems below to plot their background blur.
        </div>
      ) : (
        <ParentSize>{({ width, height }) => <Inner width={width} height={height} series={series} />}</ParentSize>
      )}
    </div>
  );
}
