import { useMemo } from 'react';
import { categoryById } from '../data/strumCategories';
import type { SortMode, StrumCategoryId, StrumPattern } from '../data/strumTypes';

type FilterArgs = {
  patterns: StrumPattern[];
  searchTerm: string;
  categoryId: StrumCategoryId | 'all';
  sortMode: SortMode;
  favorites: Set<string>;
  recentPatterns: string[];
};

const difficultyRank: Record<StrumPattern['difficulty'], number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

export function useFilteredPatterns({
  patterns,
  searchTerm,
  categoryId,
  sortMode,
  favorites,
  recentPatterns,
}: FilterArgs): StrumPattern[] {
  return useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const recentRank = new Map(recentPatterns.map((id, index) => [id, index]));

    const filtered = patterns.filter((pattern) => {
      if (categoryId !== 'all' && pattern.categoryId !== categoryId) {
        return false;
      }

      if (!query) {
        return true;
      }

      const category = categoryById[pattern.categoryId];
      const searchable = [
        pattern.title,
        pattern.displayNo,
        pattern.timeSignature,
        pattern.feel,
        pattern.originalFileName,
        category.labelKo,
        category.labelEn,
        category.shortLabel,
        ...pattern.tags,
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === 'favorites') {
        const favoriteDiff = Number(favorites.has(b.id)) - Number(favorites.has(a.id));
        return favoriteDiff || a.exerciseNo - b.exerciseNo;
      }

      if (sortMode === 'recent') {
        const aRecent = recentRank.get(a.id) ?? Number.POSITIVE_INFINITY;
        const bRecent = recentRank.get(b.id) ?? Number.POSITIVE_INFINITY;
        return aRecent - bRecent || a.exerciseNo - b.exerciseNo;
      }

      if (sortMode === 'difficulty') {
        return difficultyRank[a.difficulty] - difficultyRank[b.difficulty] || a.exerciseNo - b.exerciseNo;
      }

      return a.exerciseNo - b.exerciseNo;
    });
  }, [categoryId, favorites, patterns, recentPatterns, searchTerm, sortMode]);
}
