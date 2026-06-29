import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { lensesForMount } from '../../lib/gear';
import { useKit } from '../../store/KitProvider';
import { useCatalog } from '../../store/CatalogProvider';
import { LensMultiSelect } from './LensMultiSelect';

// Minimal "add lens to this mount" used on each saved mount group.
export function AddLensToMount({ mount, formats }: { mount: string; formats: Set<string> }) {
  const { lenses: catalogLenses } = useCatalog();
  const { lenses, addCatalogLenses } = useKit();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const compatible = useMemo(() => lensesForMount(mount, formats, catalogLenses), [mount, formats, catalogLenses]);
  const ownedOnMount = useMemo(
    () => new Set(lenses.filter((l) => l.mount === mount && l.catalogId).map((l) => l.catalogId!)),
    [lenses, mount],
  );

  const add = () => {
    if (!selected.size) return;
    addCatalogLenses(compatible.filter((l) => selected.has(l.id)), mount);
    setSelected(new Set());
  };

  return (
    <div className="flex items-center gap-2 border-t border-line px-4 py-2">
      <span className="label shrink-0">Add lens</span>
      <div className="min-w-0 flex-1">
        <LensMultiSelect
          lenses={compatible}
          ownedCatalogIds={ownedOnMount}
          value={selected}
          onChange={setSelected}
          placeholder="Pick lenses for this mount"
        />
      </div>
      <button
        type="button"
        onClick={add}
        disabled={!selected.size}
        aria-label="Add selected lenses"
        className="inline-flex shrink-0 items-center gap-1 border border-line px-2 py-1.5 text-xs uppercase tracking-wide transition-colors hover:border-line-strong disabled:opacity-40"
      >
        <Plus size={13} strokeWidth={2} /> {selected.size || ''}
      </button>
    </div>
  );
}
