export type Reaction = 'dislike' | 'like' | 'love';

export interface ReactionCounts {
  dislike: number;
  like: number;
  love: number;
  total: number;
}

export const EMPTY_REACTION_COUNTS: ReactionCounts = {
  dislike: 0,
  like: 0,
  love: 0,
  total: 0,
};

export function emptyReactionCounts(): ReactionCounts {
  return { ...EMPTY_REACTION_COUNTS };
}
