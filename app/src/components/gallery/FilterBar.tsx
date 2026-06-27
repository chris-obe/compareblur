import type { CategoryId } from '../../lib/categories';
import { FormatFilter } from './FormatFilter';
import { TagSearch } from './TagSearch';

interface Props {
  formats: Set<CategoryId>;
  toggleFormat: (id: CategoryId) => void;
  tags: string[];
  addTag: (t: string) => void;
  removeTag: (t: string) => void;
  resultCount: number;
}

export function FilterBar({
  formats,
  toggleFormat,
  tags,
  addTag,
  removeTag,
  resultCount,
}: Props) {
  return (
    <div className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
      <div className="flex flex-col gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FormatFilter selected={formats} onToggle={toggleFormat} />
          <span className="label">{resultCount} images</span>
        </div>
        <TagSearch tags={tags} onAdd={addTag} onRemove={removeTag} />
      </div>
    </div>
  );
}
