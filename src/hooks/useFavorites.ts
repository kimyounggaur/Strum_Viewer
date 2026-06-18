import { useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

const favoriteKey = 'lesson-designer-strum-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<string[]>(favoriteKey, []);
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  function toggleFavorite(patternId: string) {
    setFavorites(
      favoriteSet.has(patternId)
        ? favorites.filter((id) => id !== patternId)
        : [patternId, ...favorites],
    );
  }

  return {
    favorites,
    favoriteSet,
    isFavorite: (patternId: string) => favoriteSet.has(patternId),
    toggleFavorite,
  };
}
