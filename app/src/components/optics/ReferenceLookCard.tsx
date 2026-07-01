import { ScanSearch } from 'lucide-react';
import { formatDisplayName } from '../../lib/galleryFormat';
import { lookMetrics, type ReferenceLook } from '../../lib/lookMatching';

export function ReferenceLookCard({ reference, summary }: { reference: ReferenceLook; summary?: string }) {
  const metrics = lookMetrics(reference);
  return (
    <section className="border border-line">
      <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <div className="label mb-1">Reference look</div>
          <h2 className="truncate text-lg font-bold tracking-tight">{reference.label}</h2>
          {reference.detail && <div className="label mt-1 truncate">{reference.detail}</div>}
        </div>
        <ScanSearch size={17} strokeWidth={1.5} className="mt-1 shrink-0 text-muted" />
      </div>
      {summary && <p className="border-b border-line px-4 py-3 text-sm text-muted">{summary}</p>}
      <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
        <Metric label="Capture" value={`${Math.round(reference.focal)}mm · ƒ/${round1(reference.aperture)}`} />
        <Metric label="Format" value={formatDisplayName(reference.format)} />
        <Metric label="FOV" value={`${Math.round(metrics.fovDeg)}°`} />
        <Metric label="Blur · 50 m" value={`${round1(metrics.blurPct)}%`} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-bg px-3 py-2">
      <div className="label mb-1">{label}</div>
      <div className="truncate text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
