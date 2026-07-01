import { useEffect, useMemo, useState } from 'react';
import { Check, Lightbulb, RefreshCw } from 'lucide-react';
import { GALLERY_SEED } from '../../data/gallery.seed';
import { getFormat } from '../../lib/engine';
import { listGalleryPhotos } from '../../lib/galleryApi';
import { catalogLookCandidatesForCamera, compareSystemToReference, kitLookCandidates } from '../../lib/lookCandidates';
import {
  matchMapPoint,
  rankLookCandidates,
  referenceMapPoint,
  type LookMatchResult,
  type ReferenceLook,
} from '../../lib/lookMatching';
import { buildTasteProfile, nextTasteQuizItems } from '../../lib/tasteProfile';
import type { GalleryItem } from '../../lib/types';
import { useCatalog } from '../../store/CatalogProvider';
import { useCompare, nextSystemId } from '../../store/CompareProvider';
import { useKit } from '../../store/KitProvider';
import { useReactions } from '../../store/ReactionsProvider';
import { LookMapChart } from '../optics/LookMapChart';
import { ReferenceLookBuilder } from '../optics/ReferenceLookBuilder';
import { ReferenceLookCard } from '../optics/ReferenceLookCard';
import { SuggestionResults } from '../optics/SuggestionResults';
import { ReactionBar } from '../ui/ReactionBar';
import { SearchSelect, type SelectOption } from '../ui/SearchSelect';

type SuggestionMode = 'taste' | 'compare';

const DEFAULT_REFERENCE: ReferenceLook = {
  id: 'manual-reference',
  label: 'Manual look',
  detail: 'Standalone reference',
  format: getFormat('ff'),
  focal: 85,
  aperture: 1.8,
  subjectWidthM: 2,
  source: { type: 'manual' },
};

export function SuggestionsPage() {
  const catalog = useCatalog();
  const kit = useKit();
  const compare = useCompare();
  const { reactions, registerCounts } = useReactions();
  const [mode, setMode] = useState<SuggestionMode>('taste');
  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompareId, setSelectedCompareId] = useState('');
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [manualReference, setManualReference] = useState<ReferenceLook>(DEFAULT_REFERENCE);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listGalleryPhotos()
      .then((next) => {
        if (cancelled) return;
        const loaded = next.length ? next : GALLERY_SEED;
        setPhotos(loaded);
        registerCounts(loaded);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPhotos(GALLERY_SEED);
        setError(err instanceof Error ? err.message : 'Gallery photos could not be loaded.');
        registerCounts(GALLERY_SEED);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [registerCounts]);

  const taste = useMemo(() => buildTasteProfile(photos, reactions), [photos, reactions]);
  const compareReferences = useMemo(
    () => compare.systems.map((system) => compareSystemToReference(system, compare.subjectWidthM, compare.focusOverrideM)),
    [compare.focusOverrideM, compare.subjectWidthM, compare.systems],
  );
  const selectedCompare = compareReferences.find((reference) => reference.id === selectedCompareId) ?? compareReferences[0] ?? null;
  const reference = mode === 'taste'
    ? taste.reference ?? manualReference
    : selectedCompare ?? manualReference;

  const sourceCameraId = reference.source.type === 'catalog' ? reference.source.cameraId : undefined;
  const sourceKitCameraCatalogId = reference.source.type === 'kit' ? reference.source.cameraCatalogId : undefined;
  const ownedCameraCatalogId = sourceKitCameraCatalogId ?? kit.cameras[0]?.catalogId;
  const activeCamera =
    catalog.cameras.find((camera) => camera.id === selectedCameraId) ??
    catalog.cameras.find((camera) => camera.id === sourceCameraId) ??
    catalog.cameras.find((camera) => camera.id === ownedCameraCatalogId) ??
    null;

  const cameraOptions = useMemo<SelectOption[]>(
    () => catalog.cameras.map((camera) => ({ id: camera.id, label: `${camera.name} · ${camera.mount}`, maker: camera.maker })),
    [catalog.cameras],
  );

  const kitResults = useMemo(
    () => rankLookCandidates(reference, kitLookCandidates(kit.cameras, kit.lenses), 8),
    [kit.cameras, kit.lenses, reference],
  );
  const mountResults = useMemo(
    () => rankLookCandidates(reference, catalogLookCandidatesForCamera(activeCamera, catalog.lenses), 10),
    [activeCamera, catalog.lenses, reference],
  );
  const mapPoints = useMemo(
    () => [
      referenceMapPoint(reference),
      ...kitResults.slice(0, 4).map(matchMapPoint),
      ...mountResults.slice(0, 5).map(matchMapPoint),
    ],
    [kitResults, mountResults, reference],
  );

  const quizItems = useMemo(() => nextTasteQuizItems(photos, reactions, 6), [photos, reactions]);
  const weakTopScore = Math.max(kitResults[0]?.score ?? 0, mountResults[0]?.score ?? 0) < 40;

  const addResultToCompare = (result: LookMatchResult) => {
    compare.add({
      id: nextSystemId(),
      identifier: result.candidate.lensName,
      context: `${result.candidate.bodyName} · ${result.candidate.lensName}`,
      format: result.candidate.format,
      focal: result.recommendedFocal,
      aperture: result.recommendedAperture,
      subjectWidthM: reference.subjectWidthM,
      source: result.candidate.source,
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-4 lg:p-6">
      <header className="flex flex-col gap-3 border-b border-line pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="label mb-2">Suggestions</div>
          <h1 className="text-2xl font-bold tracking-tight">Find lenses that behave like the look</h1>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </header>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-0 xl:self-start">
          {mode === 'taste' ? (
            <TastePanel
              loading={loading}
              error={error}
              summary={taste.summary}
              confidence={taste.confidence}
              sampleSize={taste.sampleSize}
              quizItems={quizItems}
            />
          ) : (
            <CompareReferencePanel
              references={compareReferences}
              selectedId={selectedCompare?.id ?? ''}
              onSelect={setSelectedCompareId}
              manualReference={manualReference}
              onManualReference={setManualReference}
            />
          )}

          <section className="border border-line">
            <div className="border-b border-line px-4 py-2">
              <div className="text-xs font-bold uppercase tracking-wide">Catalog mount</div>
            </div>
            <div className="space-y-3 p-4">
              <SearchSelect
                options={cameraOptions}
                value={activeCamera?.id ?? ''}
                onChange={setSelectedCameraId}
                placeholder={catalog.status === 'loading' ? 'Loading catalog…' : 'Select camera or mount'}
              />
              <div className="text-xs leading-relaxed text-muted">
                {activeCamera ? `${activeCamera.mount} mount · ${activeCamera.formatId}` : 'Choose a body to rank compatible catalog lenses.'}
              </div>
            </div>
          </section>
        </aside>

        <main className="min-w-0 space-y-4">
          <ReferenceLookCard reference={reference} summary={mode === 'taste' ? taste.summary : undefined} />
          {weakTopScore && (
            <div className="border border-line-strong px-4 py-3 text-sm font-bold">
              You will struggle to find a close match in the current kit/mount pool. The nearest options below are compromises.
            </div>
          )}
          <LookMapChart points={mapPoints} title="Closest matches on the map" />
          <div className="grid gap-4 2xl:grid-cols-2">
            <SuggestionResults
              title="In your kit"
              results={kitResults}
              empty="Add cameras and lenses to My Kit to rank owned options."
              onAddToCompare={addResultToCompare}
            />
            <SuggestionResults
              title={activeCamera ? `For ${activeCamera.mount}` : 'For this mount'}
              results={mountResults}
              empty="Select a catalog body to rank compatible lenses."
              onAddToCompare={addResultToCompare}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: SuggestionMode; onChange: (mode: SuggestionMode) => void }) {
  return (
    <div className="inline-grid grid-cols-2 border border-line">
      {(['taste', 'compare'] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={[
            'px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors',
            mode === item ? 'bg-fg text-bg' : 'hover:bg-faint',
          ].join(' ')}
        >
          {item === 'taste' ? 'Taste' : 'Compare'}
        </button>
      ))}
    </div>
  );
}

function TastePanel({
  loading,
  error,
  summary,
  confidence,
  sampleSize,
  quizItems,
}: {
  loading: boolean;
  error: string | null;
  summary: string;
  confidence: 'none' | 'thin' | 'useful';
  sampleSize: number;
  quizItems: GalleryItem[];
}) {
  return (
    <section className="border border-line">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <div className="text-xs font-bold uppercase tracking-wide">Taste signal</div>
        {loading ? <RefreshCw size={14} strokeWidth={1.5} className="animate-spin text-muted" /> : <Check size={14} strokeWidth={1.5} />}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Lightbulb size={15} strokeWidth={1.5} />
          <span className="text-sm font-bold">{confidence === 'useful' ? 'Pattern detected' : 'Needs a few more reactions'}</span>
        </div>
        <p className="text-sm leading-relaxed text-muted">{summary}</p>
        <div className="label">{sampleSize} liked references</div>
        {error && <div className="border border-line px-3 py-2 text-xs text-muted">{error}</div>}
        {confidence !== 'useful' && <TasteQuiz items={quizItems} />}
      </div>
    </section>
  );
}

function TasteQuiz({ items }: { items: GalleryItem[] }) {
  if (items.length === 0) return <div className="text-xs text-muted">No unrated gallery photos left.</div>;
  return (
    <div className="space-y-2">
      <div className="label">Quick taste pass</div>
      {items.slice(0, 3).map((item) => (
        <div key={item.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 border border-line p-2">
          <img src={item.src} alt={item.title} className="aspect-square w-full object-cover grayscale" />
          <div className="min-w-0">
            <div className="truncate text-xs font-bold">{item.title}</div>
            <div className="label mt-1 truncate">{item.focal}mm · ƒ/{item.aperture}</div>
            <ReactionBar photoId={item.id} mode="expanded" className="mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CompareReferencePanel({
  references,
  selectedId,
  onSelect,
  manualReference,
  onManualReference,
}: {
  references: ReferenceLook[];
  selectedId: string;
  onSelect: (id: string) => void;
  manualReference: ReferenceLook;
  onManualReference: (reference: ReferenceLook) => void;
}) {
  if (references.length === 0) {
    return <ReferenceLookBuilder value={manualReference} onChange={onManualReference} />;
  }
  return (
    <section className="border border-line">
      <div className="border-b border-line px-4 py-2">
        <div className="text-xs font-bold uppercase tracking-wide">Compare reference</div>
      </div>
      <div className="divide-y divide-line">
        {references.map((reference) => (
          <button
            key={reference.id}
            type="button"
            onClick={() => onSelect(reference.id)}
            className={[
              'block w-full px-4 py-3 text-left transition-colors hover:bg-faint',
              selectedId === reference.id ? 'bg-faint' : '',
            ].join(' ')}
          >
            <div className="truncate text-sm font-bold">{reference.label}</div>
            <div className="label mt-1 truncate">{reference.detail}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
