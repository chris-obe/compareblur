import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from './Button';
import { Chip } from './Chip';

export interface TagOption {
  slug: string;
  label: string;
  archived?: boolean;
}

interface Props {
  tags: TagOption[];
  value: string[];
  onChange: (value: string[]) => void;
  onCreateTag?: (label: string) => Promise<TagOption>;
}

export function TagPicker({ tags, value, onChange, onCreateTag }: Props) {
  const [draft, setDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const selected = useMemo(() => new Set(value.map(normalizeTagLabel)), [value]);
  const activeTags = useMemo(() => tags.filter((tag) => !tag.archived), [tags]);
  const normalizedDraft = normalizeTagLabel(draft);
  const existing = activeTags.find((tag) => normalizeTagLabel(tag.label) === normalizedDraft);
  const canCreate = !!normalizedDraft && !existing && !selected.has(normalizedDraft) && !!onCreateTag;
  const suggestions = useMemo(() => {
    const needle = normalizedDraft;
    return activeTags
      .filter((tag) => !selected.has(normalizeTagLabel(tag.label)))
      .filter((tag) => !needle || normalizeTagLabel(tag.label).includes(needle))
      .slice(0, 8);
  }, [activeTags, normalizedDraft, selected]);

  const add = (label: string) => {
    const normalized = normalizeTagLabel(label);
    if (!normalized || selected.has(normalized)) return;
    onChange([...value, normalized]);
    setDraft('');
  };

  const create = async () => {
    if (!canCreate || !onCreateTag) return;
    setCreating(true);
    try {
      const tag = await onCreateTag(draft);
      add(tag.label);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {value.map((tag) => (
          <Chip key={tag} active onRemove={() => onChange(value.filter((item) => item !== tag))}>
            {tag}
          </Chip>
        ))}
        {value.length === 0 && <span className="text-xs text-muted">No tags selected</span>}
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <div className="relative min-w-44 flex-1">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (existing) add(existing.label);
              }
            }}
            placeholder="Search tags…"
            className="w-full border border-line bg-transparent px-2 py-1.5 text-xs outline-none transition-colors placeholder:text-muted focus:border-line-strong"
          />
          {draft && suggestions.length > 0 && (
            <div className="absolute left-0 z-40 mt-1 w-full border border-line bg-surface">
              {suggestions.map((tag) => (
                <button
                  key={tag.slug}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => add(tag.label)}
                  className="block w-full px-3 py-1.5 text-left text-xs hover:bg-faint"
                >
                  {tag.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {existing ? (
          <Button type="button" onClick={() => add(existing.label)}>
            <Plus size={13} strokeWidth={1.5} />
            Add tag
          </Button>
        ) : (
          <Button type="button" onClick={create} disabled={!canCreate || creating}>
            <Plus size={13} strokeWidth={1.5} />
            Add new tag
          </Button>
        )}
      </div>
    </div>
  );
}

function normalizeTagLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

