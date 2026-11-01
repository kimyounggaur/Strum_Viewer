// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { strumPatterns } from '../data/patterns';
import type { SortMode, StrumCategoryId } from '../data/strumTypes';
import { useFilteredPatterns } from './useFilteredPatterns';

/**
 * 검색·정렬 동작을 고정한다. Phase 4에서 검색을 토큰 방식(`src/lib/search.ts`)으로
 * 바꿀 때 이 기대값 중 "현재 동작의 결함"으로 표시한 항목은 바뀌어야 한다.
 */
function run(
  options: Partial<{
    searchTerm: string;
    categoryId: StrumCategoryId | 'all';
    sortMode: SortMode;
    favorites: string[];
    recentPatterns: string[];
  }> = {},
) {
  const { result } = renderHook(() =>
    useFilteredPatterns({
      patterns: strumPatterns,
      searchTerm: options.searchTerm ?? '',
      categoryId: options.categoryId ?? 'all',
      sortMode: options.sortMode ?? 'exercise',
      favorites: new Set(options.favorites ?? []),
      recentPatterns: options.recentPatterns ?? [],
    }),
  );
  return result.current;
}

describe('useFilteredPatterns — 필터', () => {
  it('카테고리 all + 빈 검색어 = 전체 76개', () => {
    expect(run()).toHaveLength(76);
  });

  it('카테고리 제한', () => {
    const result = run({ categoryId: 'shuffle' });
    expect(result).toHaveLength(6);
    expect(result.every((pattern) => pattern.categoryId === 'shuffle')).toBe(true);
  });

  it('displayNo로 검색 (ex03)', () => {
    const ids = run({ searchTerm: 'ex03' }).map((pattern) => pattern.id);
    expect(ids).toEqual(expect.arrayContaining(['shuffle_ex03', 'slow-rock_ex03']));
    expect(ids.every((id) => id.endsWith('_ex03'))).toBe(true);
  });

  it('박자표로 검색 (3/4)', () => {
    const result = run({ searchTerm: '3/4' });
    expect(result.every((pattern) => pattern.timeSignature === '3/4')).toBe(true);
    expect(result).toHaveLength(13);
  });

  it('카테고리 영문 라벨로 검색 (shuffle)', () => {
    expect(run({ searchTerm: 'Shuffle' })).toHaveLength(6);
  });

  it('카테고리 한글 라벨로 검색 (슬로우 락)', () => {
    expect(run({ searchTerm: '슬로우 락' })).toHaveLength(12);
  });

  it('현재 동작의 결함: "1"은 원본 파일명 때문에 거의 전부 매칭된다 (Phase 4에서 수정)', () => {
    expect(run({ searchTerm: '1' }).length).toBeGreaterThan(60);
  });
});

describe('useFilteredPatterns — 정렬', () => {
  it('exercise: 카테고리 내 Ex 번호 오름차순', () => {
    const numbers = run({ categoryId: 'twelve-eight' }).map((pattern) => pattern.exerciseNo);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });

  it('favorites: 즐겨찾기가 앞에, 나머지는 Ex 순', () => {
    const result = run({
      categoryId: 'shuffle',
      sortMode: 'favorites',
      favorites: ['shuffle_ex05'],
    });
    expect(result[0].id).toBe('shuffle_ex05');
    expect(result.slice(1).map((pattern) => pattern.exerciseNo)).toEqual([1, 2, 3, 4, 6]);
  });

  it('recent: 최근 본 순서가 앞에', () => {
    const result = run({
      categoryId: 'shuffle',
      sortMode: 'recent',
      recentPatterns: ['shuffle_ex04', 'shuffle_ex02'],
    });
    expect(result.slice(0, 2).map((pattern) => pattern.id)).toEqual([
      'shuffle_ex04',
      'shuffle_ex02',
    ]);
  });

  it('difficulty: beginner → intermediate → advanced', () => {
    const rank = { beginner: 0, intermediate: 1, advanced: 2 };
    const ranks = run({ sortMode: 'difficulty' }).map((pattern) => rank[pattern.difficulty]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
});
