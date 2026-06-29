import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useReactions } from '../../store/ReactionsProvider';
import type { Reaction } from '../../lib/reactions';

interface Option {
  id: Reaction;
  title: string;
  render: (size: number) => React.ReactNode;
}

function DoubleThumbsUp({ size }: { size: number }) {
  return (
    <span className="relative inline-flex items-center">
      <ThumbsUp size={size} strokeWidth={1.6} />
      <ThumbsUp size={size} strokeWidth={1.6} className="-ml-[6px]" />
    </span>
  );
}

// Ascending sentiment, Netflix-style: not-for-me, like, love (double thumbs).
const OPTIONS: Option[] = [
  { id: 'dislike', title: 'Not for me', render: (s) => <ThumbsDown size={s} strokeWidth={1.6} /> },
  { id: 'like', title: 'Like', render: (s) => <ThumbsUp size={s} strokeWidth={1.6} /> },
  { id: 'love', title: 'Love', render: (s) => <DoubleThumbsUp size={s} /> },
];

function OptionButton({
  option,
  active,
  big,
  onClick,
}: {
  option: Option;
  active: boolean;
  big: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={option.title}
      aria-label={option.title}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={[
        'inline-flex shrink-0 items-center justify-center border transition-colors',
        big ? 'h-9 w-11' : 'h-7 w-8',
        active ? 'border-fg bg-fg text-bg' : 'border-line bg-surface text-fg hover:border-line-strong',
      ].join(' ')}
    >
      {option.render(big ? 16 : 14)}
    </button>
  );
}

interface Props {
  photoId: string;
  mode: 'compact' | 'expanded';
  className?: string;
}

// Reused in both places: gallery cards (compact, reveals on card hover) and the
// lightbox (expanded, always shown). Reads/writes the shared reactions store.
export function ReactionBar({ photoId, mode, className = '' }: Props) {
  const { get, getCounts, set } = useReactions();
  const value = get(photoId);
  const counts = getCounts(photoId);
  const choose = (id: Reaction) => set(photoId, value === id ? null : id);

  if (mode === 'expanded') {
    return (
      <div className={['flex flex-wrap items-center gap-3', className].join(' ')}>
        <div className="flex items-center gap-2">
          {OPTIONS.map((o) => (
            <OptionButton key={o.id} option={o} active={value === o.id} big onClick={() => choose(o.id)} />
          ))}
        </div>
        <div className="label">
          {counts.total} total · {counts.like} likes · {counts.love} loves
        </div>
      </div>
    );
  }

  // compact: lives inside a `group` (the gallery card). Options reveal on hover;
  // a persistent badge marks the current reaction at rest.
  const activeOption = OPTIONS.find((o) => o.id === value);
  return (
    <div className={['relative flex items-center justify-end', className].join(' ')}>
      <div className="flex gap-1 opacity-0 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100">
        {OPTIONS.map((o) => (
          <OptionButton key={o.id} option={o} active={value === o.id} big={false} onClick={() => choose(o.id)} />
        ))}
      </div>
      {activeOption && (
        <span className="pointer-events-none absolute right-0 inline-flex h-7 w-8 items-center justify-center border border-fg bg-fg text-bg transition-opacity duration-150 group-hover:opacity-0">
          {activeOption.render(14)}
        </span>
      )}
    </div>
  );
}
