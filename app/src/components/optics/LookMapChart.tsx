import { useMemo, useState } from 'react';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { localPoint } from '@visx/event';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import type { LookMapPoint } from '../../lib/lookMatching';

const MARGIN = { top: 16, right: 16, bottom: 34, left: 46 };

interface Props {
  points: LookMapPoint[];
  title?: string;
  empty?: string;
  className?: string;
}

export function LookMapChart({ points, title = 'FOV / blur map', empty = 'Add a reference to map the look.', className = '' }: Props) {
  return (
    <section className={['border border-line', className].join(' ')}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <div className="text-xs font-bold uppercase tracking-wide">{title}</div>
        <div className="label">tight FOV → more blur</div>
      </div>
      <div className="h-[220px] min-h-[220px]">
        {points.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted">{empty}</div>
        ) : (
          <ParentSize>{({ width, height }) => <Inner width={width} height={height} points={points} />}</ParentSize>
        )}
      </div>
    </section>
  );
}

function Inner({ width, height, points }: { width: number; height: number; points: LookMapPoint[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = Math.max(0, height - MARGIN.top - MARGIN.bottom);
  const active = points.find((point) => point.id === activeId) ?? points[0];

  const xDomain = useMemo(() => {
    const values = points.map((point) => point.fovDeg).filter(Number.isFinite);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return padDomain(min, max, 0.12);
  }, [points]);
  const yDomain = useMemo(() => {
    const values = points.map((point) => point.blurPct).filter(Number.isFinite);
    const min = Math.min(0, ...values);
    const max = Math.max(1, ...values);
    return [min, max * 1.18] as [number, number];
  }, [points]);

  const xScale = useMemo(() => scaleLinear<number>({ domain: xDomain, range: [innerW, 0] }), [innerW, xDomain]);
  const yScale = useMemo(() => scaleLinear<number>({ domain: yDomain, range: [innerH, 0] }), [innerH, yDomain]);

  const onMove = (event: React.MouseEvent | React.TouchEvent) => {
    const local = localPoint(event);
    if (!local) return;
    const x = local.x - MARGIN.left;
    const y = local.y - MARGIN.top;
    const nearest = points
      .map((point) => ({
        point,
        distance: Math.hypot(xScale(point.fovDeg) - x, yScale(point.blurPct) - y),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearest && nearest.distance < 42) setActiveId(nearest.point.id);
  };

  return (
    <div className="relative">
      <svg width={width} height={height} className="touch-none">
        <Group left={MARGIN.left} top={MARGIN.top}>
          <AxisLeft
            scale={yScale}
            numTicks={4}
            stroke="var(--line)"
            tickStroke="var(--line)"
            tickFormat={(value) => `${value}%`}
            tickLabelProps={() => ({ fill: 'var(--muted)', fontSize: 10, dx: -4, dy: 3, textAnchor: 'end' })}
          />
          <AxisBottom
            top={innerH}
            scale={xScale}
            numTicks={5}
            stroke="var(--line)"
            tickStroke="var(--line)"
            tickFormat={(value) => `${Math.round(value as number)}°`}
            tickLabelProps={() => ({ fill: 'var(--muted)', fontSize: 10, dy: 2, textAnchor: 'middle' })}
          />
          <rect width={innerW} height={innerH} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setActiveId(null)} onTouchMove={onMove} />
          {points.map((point) => (
            <circle
              key={point.id}
              cx={xScale(point.fovDeg)}
              cy={yScale(point.blurPct)}
              r={point.id === activeId || point.group === 'reference' ? 5 : 4}
              fill={point.group === 'reference' ? 'var(--fg)' : 'var(--bg)'}
              stroke="var(--fg)"
              strokeWidth={point.group === 'reference' ? 1 : 1.5}
            />
          ))}
        </Group>
      </svg>
      <div className="pointer-events-none absolute left-12 top-2 max-w-[70%]">
        <div className="label mb-1">{active.group === 'reference' ? 'reference' : active.score != null ? `${active.score}/100` : 'system'}</div>
        <div className="truncate text-xs font-bold">{active.label}</div>
        {active.detail && <div className="label mt-1 truncate opacity-80">{active.detail}</div>}
      </div>
    </div>
  );
}

function padDomain(min: number, max: number, fraction: number): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [20, 80];
  if (min === max) return [Math.max(1, min - 10), max + 10];
  const pad = (max - min) * fraction;
  return [Math.max(1, min - pad), max + pad];
}
