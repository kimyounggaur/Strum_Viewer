import { strumPatternsGenerated } from './strumPatterns.generated';
import { strumRhythms } from './strumRhythms.generated';
import type { StrumCategoryId, StrumPattern } from './strumTypes';

export const strumPatterns: StrumPattern[] = strumPatternsGenerated.map((pattern) => ({
  ...pattern,
  rhythm: strumRhythms[pattern.id],
}));

/** id → 패턴 (O(1) 조회) */
const patternById = new Map(strumPatterns.map((pattern) => [pattern.id, pattern]));

/** 카테고리별 Ex 번호순 목록 (모듈 로드 시 1회 계산) */
const patternsByCategory = new Map<StrumCategoryId, StrumPattern[]>();
for (const pattern of strumPatterns) {
  const list = patternsByCategory.get(pattern.categoryId) ?? [];
  list.push(pattern);
  patternsByCategory.set(pattern.categoryId, list);
}
for (const list of patternsByCategory.values()) {
  list.sort((a, b) => a.exerciseNo - b.exerciseNo);
}

export function getPatternsByCategory(categoryId: StrumCategoryId): StrumPattern[] {
  return patternsByCategory.get(categoryId) ?? [];
}

export function getPatternById(patternId: string | null | undefined): StrumPattern | undefined {
  return patternId ? patternById.get(patternId) : undefined;
}

export function getNeighborPatterns(pattern: StrumPattern): {
  previous?: StrumPattern;
  next?: StrumPattern;
} {
  const list = getPatternsByCategory(pattern.categoryId);
  const index = list.findIndex((item) => item.id === pattern.id);
  return {
    previous: index > 0 ? list[index - 1] : undefined,
    next: index >= 0 && index < list.length - 1 ? list[index + 1] : undefined,
  };
}

/** 카테고리별 패턴 수 (하드코딩 대신 데이터에서 계산) */
export const patternCountByCategory = Object.fromEntries(
  [...patternsByCategory].map(([categoryId, list]) => [categoryId, list.length]),
) as Record<StrumCategoryId, number>;
