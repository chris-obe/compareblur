import { ExternalLink, Image, Images, RefreshCw, X } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { compareLineColor, compareLineStyle } from '../../lib/compareStyles';
import { rankGalleryExamplesForCompare, type GalleryExampleGroup } from '../../lib/galleryExamples';
import { subjectPresetById, subjectPresetForWidth, SUBJECT_DISTANCE_PRESETS } from '../../lib/subjectDistance';
import { systemLabel, systemOpticsLabel, systemSourceLabel, type CompareSystem } from '../../store/CompareProvider';
import { usePublicGalleryPhotos } from '../../hooks/usePublicGalleryPhotos';
import { MatchBadge } from '../optics/MatchBadge';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { DashSwatch } from './BlurChart';

interface Props {
  systems: CompareSystem[];
  subjectWidthM: number;
  focusOverrideM: number | null;
  onSubjectWidth: (widthM: number) => void;
  onClose: () => void;
}

export function CompareGalleryExamples({
  systems,
  subjectWidthM,
  focusOverrideM,
  onSubjectWidth,
  onClose,
}: Props) {
  const navigate = useNavigate();
  const { photos, loading, error, reload } = usePublicGalleryPhotos();
  const examples = useMemo(
    () =>
      rankGalleryExamplesForCompare({
        systems,
        photos,
        subjectWidthM,
        focusOverrideM,
      }),
    [focusOverrideM, photos, subjectWidthM, systems],
  );
  const selectedPreset = examples.selectedPresetId ? subjectPresetById(examples.selectedPresetId) : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <div className="label mb-1">Gallery examples</div>
          <h2 className="truncate text-sm font-bold tracking-tight">Similar public photos</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close gallery examples"
          className="flex h-8 w-8 shrink-0 items-center justify-center border border-line text-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-4">
          <SubjectPresetRail value={subjectWidthM} onChange={onSubjectWidth} />

          <div className="flex items-center justify-between gap-3 border border-line px-3 py-2">
            <div className="min-w-0">
              <div className="text-xs font-bold">{selectedPreset?.label ?? 'Custom subject width'}</div>
              <div className="label mt-0.5">
                {focusOverrideM ? `${formatDistance(focusOverrideM)} fixed distance` : 'Auto framing distance'}
              </div>
            </div>
            <button
              type="button"
              onClick={reload}
              title="Reload public gallery examples"
              aria-label="Reload public gallery examples"
              className="flex h-8 w-8 shrink-0 items-center justify-center border border-line text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {error && <div className="border border-line px-3 py-2 text-xs text-muted">{error}</div>}

          {systems.length === 0 ? (
            <EmptyState
              title="No systems to match"
              message="Add a camera and lens first. blur will then pull public gallery photos with a similar optical look."
            />
          ) : loading ? (
            <EmptyState title="Loading examples" message="Reading the public gallery…" loading />
          ) : examples.eligiblePhotoCount === 0 && selectedPreset ? (
            <EmptyState
              title={`No ${selectedPreset.label.toLowerCase()} examples yet`}
              message="No approved public gallery photos are tagged for this subject preset."
            />
          ) : (
            <div className="space-y-4">
              {examples.groups.map((group, index) => (
                <ExampleGroup
                  key={group.id}
                  group={group}
                  index={index}
                  onOpenPhoto={(photoId) => navigate(`/gallery/photo/${encodeURIComponent(photoId)}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubjectPresetRail({ value, onChange }: { value: number; onChange: (widthM: number) => void }) {
  const selected = subjectPresetForWidth(value);
  const selectedIndex = selected
    ? SUBJECT_DISTANCE_PRESETS.findIndex((preset) => preset.id === selected.id)
    : nearestPresetIndex(value);

  return (
    <section className="border border-line p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide">Subject preset</div>
          <div className="label mt-1">Filters examples and updates Compare.</div>
        </div>
        <div className="text-xs font-bold tabular-nums">{selected?.label ?? `${value.toFixed(1)} m`}</div>
      </div>
      <input
        type="range"
        min={0}
        max={SUBJECT_DISTANCE_PRESETS.length - 1}
        step={1}
        value={selectedIndex}
        onChange={(event) => onChange(SUBJECT_DISTANCE_PRESETS[Number(event.target.value)].widthM)}
        aria-label="Gallery example subject preset"
        className="h-1 w-full cursor-pointer appearance-none bg-line"
        style={{ accentColor: 'var(--fg)' }}
      />
      <div className="mt-3 grid grid-cols-5 gap-1">
        {SUBJECT_DISTANCE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.widthM)}
            className={[
              'min-w-0 border px-1.5 py-1.5 text-[10px] uppercase tracking-wide transition-colors',
              preset.id === selected?.id ? 'border-fg bg-fg text-bg' : 'border-line hover:border-line-strong',
            ].join(' ')}
            title={preset.label}
          >
            <span className="block truncate">{shortPresetLabel(preset.label)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ExampleGroup({
  group,
  index,
  onOpenPhoto,
}: {
  group: GalleryExampleGroup;
  index: number;
  onOpenPhoto: (photoId: string) => void;
}) {
  const title = group.systems.length > 1 ? `${group.systems.length} similar systems` : systemSourceLabel(group.systems[0].system);
  const specs = group.systems.map((item) => systemOpticsLabel(item.system)).join(' / ');

  return (
    <section className="border border-line">
      <div className="space-y-2 border-b border-line px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">
              {group.systems.map((item, itemIndex) => {
                const color = compareLineColor(item.system.lineColor, index + itemIndex);
                const style = compareLineStyle(item.system.lineStyle, index + itemIndex);
                return (
                  <span key={item.system.id} className="inline-flex h-5 items-center border border-line px-1.5">
                    <DashSwatch color={color.stroke} dash={style.dash} />
                  </span>
                );
              })}
            </div>
            <h3 className="mt-2 truncate text-sm font-bold">{title}</h3>
            <div className="label mt-1 truncate">{specs}</div>
          </div>
          <div className="label shrink-0">{group.matches.length} photos</div>
        </div>
        {group.systems.length > 1 && (
          <div className="label truncate">
            {group.systems.map((item) => systemLabel(item.system)).join(' · ')}
          </div>
        )}
      </div>

      {group.matches.length === 0 ? (
        <div className="px-3 py-8 text-center text-xs text-muted">No close public examples for this group yet.</div>
      ) : (
        <div className="divide-y divide-line">
          {group.matches.map((match) => (
            <button
              key={match.photo.id}
              type="button"
              onClick={() => onOpenPhoto(match.photo.id)}
              className="grid w-full grid-cols-[5.5rem_minmax(0,1fr)] gap-3 px-3 py-3 text-left transition-colors hover:bg-faint"
            >
              <div className="aspect-square overflow-hidden bg-faint">
                <img src={match.photo.src} alt={match.photo.title} loading="lazy" className="h-full w-full object-cover grayscale" />
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <MatchBadge verdict={match.score.verdict} score={match.score.score} />
                  <ExternalLink size={12} strokeWidth={1.5} className="shrink-0 text-muted" />
                </div>
                <div className="truncate text-xs font-bold">{match.photo.title}</div>
                <div className="label mt-1 truncate">{match.photo.camera} · {match.photo.lens}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <MiniMetric value={`${Math.round(match.photo.focal)}mm`} />
                  <MiniMetric value={`ƒ/${round1(match.photo.aperture)}`} />
                  <MiniMetric value={subjectPresetById(match.photo.subjectPreset)?.label ?? 'Untagged'} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState({ title, message, loading = false }: { title: string; message: string; loading?: boolean }) {
  return (
    <div className="border border-line px-4 py-10 text-center">
      <div className="mb-3 flex justify-center">
        {loading ? (
          <RefreshCw size={18} strokeWidth={1.5} className="animate-spin text-muted" />
        ) : (
          <Images size={18} strokeWidth={1.5} className="text-muted" />
        )}
      </div>
      <div className="text-sm font-bold">{title}</div>
      <p className="mx-auto mt-2 max-w-56 text-xs leading-relaxed text-muted">{message}</p>
    </div>
  );
}

function MiniMetric({ value }: { value: string }) {
  return <span className="border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">{value}</span>;
}

export function CompareGalleryExamplesToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Tooltip tip="compareExamples" side="bottom" align="end">
      <Button type="button" variant={open ? 'solid' : 'ghost'} onClick={onToggle} aria-pressed={open} className="h-9 px-2.5">
        <Image size={14} strokeWidth={1.5} />
        <span className="hidden sm:inline">Examples</span>
      </Button>
    </Tooltip>
  );
}

function shortPresetLabel(label: string): string {
  if (label === 'Infinity / landscape') return '∞';
  return label;
}

function nearestPresetIndex(widthM: number): number {
  return SUBJECT_DISTANCE_PRESETS.reduce((bestIndex, preset, index) => {
    const best = SUBJECT_DISTANCE_PRESETS[bestIndex];
    return Math.abs(preset.widthM - widthM) < Math.abs(best.widthM - widthM) ? index : bestIndex;
  }, 0);
}

function formatDistance(distanceM: number): string {
  return distanceM < 10 ? `${distanceM.toFixed(1)} m` : `${Math.round(distanceM)} m`;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
