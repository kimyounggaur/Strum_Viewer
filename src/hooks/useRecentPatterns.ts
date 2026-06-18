import { useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

const recentKey = 'lesson-designer-strum-recent';
const recentLimit = 12;

export function useRecentPatterns() {
  const [recentPatterns, setRecentPatterns] = useLocalStorage<string[]>(recentKey, []);
  const recentSet = useMemo(() => new Set(recentPatterns), [recentPatterns]);

  function rememberPattern(patternId: string) {
    setRecentPatterns([patternId, ...recentPatterns.filter((id) => id !== patternId)].slice(0, recentLimit));
  }

  return {
    recentPatterns,
    recentSet,
    rememberPattern,
  };
}
