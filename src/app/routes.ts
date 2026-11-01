import type { SortMode, StrumCategoryId } from '../data/strumTypes';

/**
 * 해시 라우트.
 *   #/                     홈 (최근·즐겨찾기 + 전체 갤러리)
 *   #/c/all | #/c/<id>     카테고리
 *   #/p/<patternId>        상세
 *   ?q=<검색어>&sort=<정렬>
 * 해시 방식이라 정적 호스팅(Vercel 등)에 rewrite 설정 없이 새로고침·링크 공유가 된다.
 */
export type Route =
  | { name: 'home' }
  | { name: 'category'; categoryId: StrumCategoryId | 'all' }
  | { name: 'pattern'; patternId: string };

export type Query = { q?: string; sort?: SortMode };

export type RouteValidators = {
  isCategoryId: (id: string) => id is StrumCategoryId;
  isPatternId: (id: string) => boolean;
};

const sortModes = new Set<SortMode>(['exercise', 'recent', 'favorites', 'difficulty']);

export function parseHash(
  hash: string,
  { isCategoryId, isPatternId }: RouteValidators,
): { route: Route; query: Query } {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const [pathPart = '', queryPart = ''] = raw.split('?', 2);
  const segments = pathPart.split('/').filter(Boolean).map(safeDecode);
  const params = new URLSearchParams(queryPart);

  const query: Query = {};
  const q = params.get('q');
  if (q) query.q = q;
  const sort = params.get('sort');
  if (sort && sortModes.has(sort as SortMode)) query.sort = sort as SortMode;

  let route: Route = { name: 'home' };
  if (segments[0] === 'c' && segments[1]) {
    const id = segments[1];
    if (id === 'all' || isCategoryId(id)) {
      route = { name: 'category', categoryId: id };
    }
  } else if (segments[0] === 'p' && segments[1] && isPatternId(segments[1])) {
    route = { name: 'pattern', patternId: segments[1] };
  }
  return { route, query };
}

export function buildHash(route: Route, query: Query = {}): string {
  let path = '/';
  if (route.name === 'category') path = `/c/${encodeURIComponent(route.categoryId)}`;
  if (route.name === 'pattern') path = `/p/${encodeURIComponent(route.patternId)}`;

  const params = new URLSearchParams();
  if (query.q && query.q.trim()) params.set('q', query.q);
  if (query.sort && query.sort !== 'exercise') params.set('sort', query.sort);
  const search = params.toString();
  return `#${path}${search ? `?${search}` : ''}`;
}

/** 스크롤 위치 저장 등에 쓰는 "화면" 키 (쿼리 제외) */
export function routeKey(route: Route): string {
  return buildHash(route);
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
