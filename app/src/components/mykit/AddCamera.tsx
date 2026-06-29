import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { lensesForCamera } from '../../lib/gear';
import { useKit } from '../../store/KitProvider';
import { useCatalog } from '../../store/CatalogProvider';
import { LensMultiSelect } from './LensMultiSelect';
import { SearchSelect } from '../ui/SearchSelect';

// Add a camera to the kit, optionally with several compatible lenses in one move.
export function AddCamera() {
  const { cameras: catalogCameras, lenses: catalogLenses, status } = useCatalog();
  const { cameras, lenses, addCamera, addCatalogLenses } = useKit();
  const [camId, setCamId] = useState(catalogCameras[0]?.id ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const cameraOptions = useMemo(
    () => catalogCameras.map((c) => ({ id: c.id, label: c.name, maker: c.maker })),
    [catalogCameras],
  );
  const camera = catalogCameras.find((c) => c.id === camId) ?? catalogCameras[0];
  const compatible = useMemo(
    () => (camera ? lensesForCamera(camera, catalogLenses) : []),
    [camera, catalogLenses],
  );
  const ownedOnMount = useMemo(
    () => new Set(lenses.filter((l) => l.mount === camera.mount && l.catalogId).map((l) => l.catalogId!)),
    [lenses, camera.mount],
  );
  const alreadyOwnCamera = camera ? cameras.some((c) => c.catalogId === camera.id) : false;

  const onCam = (id: string) => {
    setCamId(id);
    setSelected(new Set());
  };

  const commit = () => {
    if (!camera) return;
    addCamera(camera);
    if (selected.size) {
      addCatalogLenses(
        compatible.filter((l) => selected.has(l.id)),
        camera.mount,
      );
    }
    setSelected(new Set());
  };

  const count = selected.size;
  return (
    <div className="space-y-3 border border-line p-4">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="label">Camera {status === 'loading' && '· loading catalog'}</span>
          <SearchSelect options={cameraOptions} value={camId} onChange={onCam} placeholder="Search cameras…" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Lenses ({compatible.length} compatible)</span>
          <LensMultiSelect
            lenses={compatible}
            ownedCatalogIds={ownedOnMount}
            value={selected}
            onChange={setSelected}
            placeholder="Optional — pick lenses"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={commit}
        disabled={alreadyOwnCamera && count === 0}
        className="inline-flex items-center gap-2 border border-fg bg-fg px-3 py-1.5 text-xs uppercase tracking-wide text-bg transition-opacity hover:opacity-85 disabled:opacity-40"
      >
        <Plus size={14} strokeWidth={2} />
        {alreadyOwnCamera ? `Add ${count} lens${count === 1 ? '' : 'es'}` : `Add camera${count ? ` + ${count} lens${count === 1 ? '' : 'es'}` : ''}`}
      </button>
      {alreadyOwnCamera && (
        <p className="label">You already own this body — lenses you pick will be added to it.</p>
      )}
    </div>
  );
}
