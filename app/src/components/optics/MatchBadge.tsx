import type { LookMatchVerdict } from '../../lib/lookMatching';

const LABELS: Record<LookMatchVerdict, string> = {
  close: 'Close',
  usable: 'Usable',
  different: 'Different',
  impossible: 'Hard match',
};

export function MatchBadge({ verdict, score }: { verdict: LookMatchVerdict; score: number }) {
  const strong = verdict === 'close';
  return (
    <span
      className={[
        'inline-flex items-center gap-2 border px-2 py-1 text-[10px] font-bold uppercase tracking-wide tabular-nums',
        strong ? 'border-fg bg-fg text-bg' : 'border-line text-fg',
      ].join(' ')}
      title={`${score}/100 practical same-framing score`}
    >
      <span>{LABELS[verdict]}</span>
      <span className={strong ? 'text-bg/70' : 'text-muted'}>{score}</span>
    </span>
  );
}
