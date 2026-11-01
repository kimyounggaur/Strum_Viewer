import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { strumCategories } from '../data/strumCategories';
import { getPatternById } from '../data/patterns';
import type { StrumCategoryId } from '../data/strumTypes';
import { buildHash, parseHash, type Query, type Route, type RouteValidators } from './routes';

/**
 * 의존성 없는 해시 라우터.
 * - 이동은 history.pushState/replaceState로 하고, 같은 탭 구독자에게는 커스텀 이벤트로 알린다
 *   (`location.hash = …` 대입은 hashchange가 비동기로 한 번 더 와서 쓰지 않는다).
 * - history.state.depth로 "앱 안에서 쌓인 기록"을 센다. 외부 링크로 상세에 바로 들어온
 *   경우 depth가 0이라 뒤로가기는 사이트 밖이 아니라 fallback 화면으로 간다.
 */
const NAVIGATE_EVENT = 'strum-viewer:navigate';

export type NavigationType = 'push' | 'replace' | 'pop';
let lastNavigationType: NavigationType = 'pop';

const categoryIds = new Set<string>(strumCategories.map((category) => category.id));
const validators: RouteValidators = {
  isCategoryId: (id): id is StrumCategoryId => categoryIds.has(id),
  isPatternId: (id) => Boolean(getPatternById(id)),
};

function subscribe(callback: () => void) {
  const onPop = () => {
    lastNavigationType = 'pop';
    callback();
  };
  window.addEventListener('popstate', onPop);
  window.addEventListener('hashchange', onPop);
  window.addEventListener(NAVIGATE_EVENT, callback);
  return () => {
    window.removeEventListener('popstate', onPop);
    window.removeEventListener('hashchange', onPop);
    window.removeEventListener(NAVIGATE_EVENT, callback);
  };
}

const getHash = () => window.location.hash;

function currentDepth(): number {
  const state: unknown = window.history.state;
  if (state && typeof state === 'object' && 'depth' in state) {
    const depth = state.depth;
    return typeof depth === 'number' ? depth : 0;
  }
  return 0;
}

function go(hash: string, mode: 'push' | 'replace') {
  if (hash === window.location.hash && mode === 'push') return;
  const depth = currentDepth();
  if (mode === 'push') {
    window.history.pushState({ depth: depth + 1 }, '', hash);
  } else {
    window.history.replaceState({ depth }, '', hash);
  }
  lastNavigationType = mode;
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

export function getLastNavigationType(): NavigationType {
  return lastNavigationType;
}

export function useHashRoute() {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  const { route, query } = useMemo(() => parseHash(hash, validators), [hash]);

  const navigate = useCallback(
    (next: Route, nextQuery: Query = {}, options: { replace?: boolean } = {}) => {
      go(buildHash(next, nextQuery), options.replace ? 'replace' : 'push');
    },
    [],
  );

  /** 검색어·정렬만 바꾼다(기록을 쌓지 않음). */
  const setQuery = useCallback(
    (patch: Partial<Query>) => {
      go(buildHash(route, { ...query, ...patch }), 'replace');
    },
    [query, route],
  );

  /** 앱 안 기록이 있으면 브라우저 뒤로가기, 없으면 fallback으로 교체 이동. */
  const back = useCallback((fallback: Route, fallbackQuery: Query = {}) => {
    if (currentDepth() > 0) {
      window.history.back();
    } else {
      go(buildHash(fallback, fallbackQuery), 'replace');
    }
  }, []);

  return { route, query, navigate, setQuery, back };
}
