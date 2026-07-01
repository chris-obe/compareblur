import { Link } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { LookMapChart } from '../optics/LookMapChart';
import { summarizeCompareSpread, systemMapPoint } from '../../lib/lookMatching';
import type { CompareSystem } from '../../store/CompareProvider';

interface Props {
  systems: CompareSystem[];
  subjectWidthM: number;
  focusOverrideM: number | null;
}

export function CompareLookPanel({ systems, subjectWidthM, focusOverrideM }: Props) {
  const points = systems.map((system) =>
    systemMapPoint({
      ...system,
      subjectWidthM: system.subjectWidthM ?? subjectWidthM,
      focusDistanceM: focusOverrideM,
    }),
  );
  const spread = summarizeCompareSpread(points);

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_16rem]">
      <LookMapChart points={points} title="Framing / blur map" empty="Add systems to compare framing and blur together." />
      <aside className="grid grid-cols-2 gap-px border border-line bg-line xl:grid-cols-1">
        <Insight label="FOV spread" value={`${spread.fovSpreadPct}%`} />
        <Insight label="Blur spread" value={`${spread.blurSpreadStops} stops`} />
        <div className="col-span-2 bg-bg p-3 xl:col-span-1">
          <div className="label mb-2">Read</div>
          <p className="text-xs leading-relaxed text-muted">
            {spread.warning ?? 'The compared systems are close enough that blur differences are worth reading directly.'}
          </p>
        </div>
        <div className="col-span-2 bg-bg p-3 xl:col-span-1">
          <Link
            to="/suggestions"
            className="inline-flex w-full items-center justify-center gap-2 border border-line px-3 py-1.5 text-xs uppercase tracking-wide transition-colors hover:border-line-strong"
          >
            <Lightbulb size={14} strokeWidth={1.5} />
            Suggest matches
          </Link>
        </div>
      </aside>
    </div>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg p-3">
      <div className="label mb-1">{label}</div>
      <div className="text-lg font-bold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}
