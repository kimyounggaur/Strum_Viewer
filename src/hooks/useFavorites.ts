import { useCallback, useMemo } from 'react';
import { isStringArray, useLocalStorage } from './useLocalStorage';

const favoriteKey = 'lesson-designer-strum-favorites';

/** 즐겨찾기. 배열 순서 = 추가한 순서의 역순(최근 추가가 앞). */
export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<string[]>(favoriteKey, [], isStringArray);
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const toggleFavorite = useCallback(
    (patternId: string) => {
      setFavorites((previous) =>
        previous.includes(patternId)
          ? previous.filter((id) => id !== patternId)
          : [patternId, ...previous],
      );
    },
    [setFavorites],
  );

  const isFavorite = useCallback((patternId: string) => favoriteSet.has(patternId), [favoriteSet]);

  return { favorites, favoriteSet, isFavorite, toggleFavorite };
}
