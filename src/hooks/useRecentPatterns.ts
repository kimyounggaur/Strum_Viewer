import { useCallback } from 'react';
import { isStringArray, useLocalStorage } from './useLocalStorage';

const recentKey = 'lesson-designer-strum-recent';
const recentLimit = 12;

export function useRecentPatterns() {
  const [recentPatterns, setRecentPatterns] = useLocalStorage<string[]>(
    recentKey,
    [],
    isStringArray,
  );

  /** 맨 앞에 기록한다. 이미 맨 앞이면 상태를 바꾸지 않는다(불필요한 렌더 방지). */
  const rememberPattern = useCallback(
    (patternId: string) => {
      setRecentPatterns((previous) =>
        previous[0] === patternId
          ? previous
          : [patternId, ...previous.filter((id) => id !== patternId)].slice(0, recentLimit),
      );
    },
    [setRecentPatterns],
  );

  return { recentPatterns, rememberPattern };
}
