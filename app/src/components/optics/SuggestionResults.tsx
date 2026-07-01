import { GitCompare } from 'lucide-react';
import type { LookMatchResult } from '../../lib/lookMatching';
import { Button } from '../ui/Button';
import { MatchBadge } from './MatchBadge';

interface Props {
  title: string;
  results: LookMatchResult[];
  empty: string;
  onAddToCompare: (result: LookMatchResult) => void;
}

export function SuggestionResults({ title, results, empty, onAddToCompare }: Props) {
  return (
    <section className="border border-line">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <div className="text-xs font-bold uppercase tracking-wide">{title}</div>
        <div className="label">{results.length ? `${results.length} ranked` : 'empty'}</div>
      </div>
      {results.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-muted">{empty}</div>
      ) : (
        <div className="divide-y divide-line">
          {results.map((result) => (
            <article key={result.candidate.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <MatchBadge verdict={result.verdict} score={result.score} />
                  <span className="label">{result.candidate.group === 'kit' ? 'In your kit' : 'Compatible mount'}</span>
                </div>
                <h3 className="truncate text-sm font-bold">{result.candidate.lensName}</h3>
                <div className="label mt-1 truncate">{result.candidate.bodyName}</div>
                <p className="mt-2 text-xs leading-relaxed text-muted">{result.note}</p>
              </div>
              <div className="grid min-w-0 grid-cols-3 gap-px border border-line bg-line md:w-72">
                <Metric label="Use" value={`${Math.round(result.recommendedFocal)}mm · ƒ/${round1(result.recommendedAperture)}`} />
                <Metric label="Framing" value={`${result.sameFraming.fovDeltaPct}%`} />
                <Metric label="Position" value={`${result.samePosition.fovDeltaPct}%`} />
                <Metric label="Blur" value={`${signed(result.sameFraming.blurDeltaPctPoints)}%`} />
                <Metric label="Stops" value={`${round1(result.sameFraming.blurDeltaStops)}`} />
                <Button
                  type="button"
                  onClick={() => onAddToCompare(result)}
                  className="min-h-full border-0 bg-bg px-2 py-2"
                  title="Add to Compare"
                >
                  <GitCompare size={13} strokeWidth={1.5} />
                  Add
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-bg px-2 py-2">
      <div className="label mb-1">{label}</div>
      <div className="truncate text-xs font-bold tabular-nums">{value}</div>
    </div>
  );
}

function signed(value: number): string {
  return value > 0 ? `+${round1(value)}` : `${round1(value)}`;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
