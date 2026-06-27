import { CATEGORIES, type CategoryId } from '../../lib/categories';
import { Chip } from '../ui/Chip';

interface Props {
  selected: Set<CategoryId>;
  onToggle: (id: CategoryId) => void;
}

export function FormatFilter({ selected, onToggle }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label mr-1">Format</span>
      {CATEGORIES.map((c) => (
        <Chip key={c.id} active={selected.has(c.id)} onClick={() => onToggle(c.id)}>
          {c.label}
        </Chip>
      ))}
    </div>
  );
}
