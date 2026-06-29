import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Chip } from '../ui/Chip';

interface Props {
  tags: string[];
  allTags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}

export function TagSearch({ tags, allTags, onAdd, onRemove }: Props) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    return allTags.filter((t) => !tags.includes(t) && (q === '' || t.includes(q))).slice(0, 6);
  }, [allTags, value, tags]);

  const commit = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t)) onAdd(t);
    setValue('');
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label mr-1">Tags</span>
      {tags.map((t) => (
        <Chip key={t} active onRemove={() => onRemove(t)}>
          {t}
        </Chip>
      ))}
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(suggestions[0] ?? value);
            if (e.key === 'Backspace' && value === '' && tags.length) onRemove(tags[tags.length - 1]);
          }}
          placeholder="add tag…"
          className="w-28 border border-line bg-transparent px-2 py-1 text-xs outline-none focus:border-line-strong placeholder:text-muted transition-colors"
        />
        <AnimatePresence>
          {focused && suggestions.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="absolute left-0 z-40 mt-1 min-w-32 border border-line bg-surface"
            >
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commit(s)}
                    className="block w-full px-3 py-1.5 text-left text-xs hover:bg-faint"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
