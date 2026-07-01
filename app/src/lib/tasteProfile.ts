import { getFormat, matchSystem } from './engine';
import type { GalleryItem } from './types';
import type { Reaction } from './reactions';
import { galleryItemToReference } from './lookCandidates';
import type { ReferenceLook } from './lookMatching';

export interface TasteProfile {
  liked: GalleryItem[];
  disliked: GalleryItem[];
  reference: ReferenceLook | null;
  confidence: 'none' | 'thin' | 'useful';
  summary: string;
  sampleSize: number;
}

const REACTION_WEIGHT: Record<Reaction, number> = {
  love: 2,
  like: 1,
  dislike: -0.75,
};

export function buildTasteProfile(items: GalleryItem[], reactions: Record<string, Reaction>): TasteProfile {
  const liked = items.filter((item) => reactions[item.id] === 'like' || reactions[item.id] === 'love');
  const disliked = items.filter((item) => reactions[item.id] === 'dislike');
  if (liked.length === 0) {
    return {
      liked,
      disliked,
      reference: null,
      confidence: 'none',
      summary: 'React to a few gallery photos and blur can start reading the optical pattern.',
      sampleSize: 0,
    };
  }

  const weighted = liked.map((item) => {
    const reference = galleryItemToReference(item);
    const equivalent = matchSystem(
      { format: reference.format, focal: reference.focal, aperture: reference.aperture },
      getFormat('ff'),
      { axis: 'h' },
    ).target;
    const weight = REACTION_WEIGHT[reactions[item.id] ?? 'like'] ?? 1;
    return { item, reference, weight, eqFocal: equivalent.focal, eqAperture: equivalent.aperture };
  });

  const totalWeight = weighted.reduce((sum, row) => sum + row.weight, 0) || 1;
  const eqFocal = weighted.reduce((sum, row) => sum + row.eqFocal * row.weight, 0) / totalWeight;
  const eqAperture = weighted.reduce((sum, row) => sum + row.eqAperture * row.weight, 0) / totalWeight;
  const subjectWidthM = weighted.reduce((sum, row) => sum + row.reference.subjectWidthM * row.weight, 0) / totalWeight;

  const reference: ReferenceLook = {
    id: 'taste-profile',
    label: 'Your liked-photo pattern',
    detail: `${liked.length} liked ${liked.length === 1 ? 'photo' : 'photos'} · ${disliked.length} rejected`,
    format: getFormat('ff'),
    focal: roundToUsefulFocal(eqFocal),
    aperture: roundAperture(eqAperture),
    subjectWidthM,
    source: { type: 'taste', photoIds: liked.map((item) => item.id) },
  };

  return {
    liked,
    disliked,
    reference,
    confidence: liked.length >= 3 ? 'useful' : 'thin',
    summary: `You seem to respond to roughly ${Math.round(reference.focal)}mm ƒ/${reference.aperture.toFixed(1)} full-frame looks.`,
    sampleSize: liked.length,
  };
}

export function nextTasteQuizItems(items: GalleryItem[], reactions: Record<string, Reaction>, count = 8): GalleryItem[] {
  return items
    .filter((item) => !reactions[item.id])
    .sort((a, b) => reactionPotential(b) - reactionPotential(a))
    .slice(0, count);
}

function reactionPotential(item: GalleryItem): number {
  return (item.reactionCounts?.love ?? 0) * 3 + (item.reactionCounts?.like ?? 0) - (item.reactionCounts?.dislike ?? 0);
}

function roundToUsefulFocal(value: number): number {
  if (value < 35) return Math.round(value);
  if (value < 120) return Math.round(value / 5) * 5;
  return Math.round(value / 10) * 10;
}

function roundAperture(value: number): number {
  return Math.round(value * 10) / 10;
}
