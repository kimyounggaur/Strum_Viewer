import { strumPatternsGenerated } from './strumPatterns.generated';
import { strumRhythms } from './strumRhythms';
import type { StrumCategoryId, StrumPattern } from './strumTypes';

export const strumPatterns: StrumPattern[] = strumPatternsGenerated.map((pattern) => ({
  ...pattern,
  rhythm: strumRhythms[pattern.id],
}));

export function getPatternsByCategory(categoryId: StrumCategoryId): StrumPattern[] {
  return strumPatterns.filter((pattern) => pattern.categoryId === categoryId);
}

export function getPatternById(patternId: string | null): StrumPattern | undefined {
  if (!patternId) return undefined;
  return strumPatterns.find((pattern) => pattern.id === patternId);
}

export function getNeighborPatterns(pattern: StrumPattern): {
  previous?: StrumPattern;
  next?: StrumPattern;
} {
  const categoryPatterns = getPatternsByCategory(pattern.categoryId).sort(
    (a, b) => a.exerciseNo - b.exerciseNo,
  );
  const index = categoryPatterns.findIndex((item) => item.id === pattern.id);

  return {
    previous: index > 0 ? categoryPatterns[index - 1] : undefined,
    next: index >= 0 && index < categoryPatterns.length - 1 ? categoryPatterns[index + 1] : undefined,
  };
}
