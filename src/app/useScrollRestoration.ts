import { useEffect, useLayoutEffect, useRef } from 'react';
import { getLastNavigationType } from './useHashRoute';

/** 화면(라우트)별 스크롤 위치. 새로고침 후에도 복원되도록 sessionStorage에 둔다. */
const storageKey = 'strum-viewer:scroll';
const positions = new Map<string, number>(readStored());

function readStored(): Array<[string, number]> {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Array<[string, number]>) : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify([...positions]));
  } catch {
    // 저장소 사용 불가
  }
}

/**
 * - 새 화면으로 이동(push/replace): 맨 위에서 시작
 * - 뒤로/앞으로(pop): 그 화면을 떠날 때의 위치로 복원
 */
export function useScrollRestoration(screenKey: string): void {
  const keyRef = useRef(screenKey);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        positions.set(keyRef.current, window.scrollY);
        persist();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useLayoutEffect(() => {
    keyRef.current = screenKey;
    const y = getLastNavigationType() === 'pop' ? (positions.get(screenKey) ?? 0) : 0;
    window.scrollTo(0, y);
  }, [screenKey]);
}
