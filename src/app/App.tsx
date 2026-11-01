import { Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
import { getPatternById, strumPatterns } from '../data/patterns';
import { categoryById } from '../data/strumCategories';
import type { SortMode, StrumCategoryId, StrumPattern } from '../data/strumTypes';
import { AppHeader } from '../features/gallery/AppHeader';
import { CategoryChips } from '../features/gallery/CategoryChips';
import { CategorySelector } from '../features/gallery/CategorySelector';
import { EmptyState } from '../features/gallery/EmptyState';
import { FilterBar } from '../features/gallery/FilterBar';
import { PatternGallery } from '../features/gallery/PatternGallery';
import { PatternDetail } from '../features/practice/PatternDetail';
import { useFavorites } from '../hooks/useFavorites';
import { useFilteredPatterns } from '../hooks/useFilteredPatterns';
import { usePreview } from '../hooks/usePreview';
import { useRecentPatterns } from '../hooks/useRecentPatterns';
import { routeKey } from './routes';
import { useHashRoute } from './useHashRoute';
import { useScrollRestoration } from './useScrollRestoration';

const APP_NAME = 'Strum Viewer';
const HOME_SECTION_LIMIT = 8;

/**
 * 화면 상태는 모두 URL(해시)에서 유도한다 → 새로고침·뒤로가기·링크 공유가 동작한다.
 *   #/                 홈       #/c/<id|all>   카테고리      #/p/<patternId>   상세
 *   ?q=검색어&sort=정렬
 */
function App() {
  const { route, query, navigate, setQuery, back } = useHashRoute();
  const { favorites, favoriteSet, isFavorite, toggleFavorite } = useFavorites();
  const { recentPatterns, rememberPattern } = useRecentPatterns();
  const { previewingId, toggle: togglePreview, stop: stopPreview } = usePreview();

  const searchTerm = query.q ?? '';
  const sortMode: SortMode = query.sort ?? 'exercise';
  const selectedPattern = route.name === 'pattern' ? getPatternById(route.patternId) : undefined;
  const listCategoryId: StrumCategoryId | 'all' =
    route.name === 'category' ? route.categoryId : 'all';

  useScrollRestoration(routeKey(route));

  // 상세에 들어오면(링크로 바로 들어온 경우 포함) 최근 본 패턴에 기록, 미리듣기는 정지
  const patternId = selectedPattern?.id;
  useEffect(() => {
    if (!patternId) return;
    rememberPattern(patternId);
    stopPreview();
  }, [patternId, rememberPattern, stopPreview]);

  // 문서 제목
  useEffect(() => {
    if (selectedPattern) {
      document.title = `${selectedPattern.titleKo} · ${APP_NAME}`;
    } else if (route.name === 'category') {
      const label =
        route.categoryId === 'all' ? '전체 패턴' : categoryById[route.categoryId].labelKo;
      document.title = `${label} · ${APP_NAME}`;
    } else {
      document.title = `Lesson Designer ${APP_NAME}`;
    }
  }, [route, selectedPattern]);

  const filteredPatterns = useFilteredPatterns({
    patterns: strumPatterns,
    searchTerm,
    categoryId: listCategoryId,
    sortMode,
    favorites: favoriteSet,
    recentPatterns,
  });

  const recentPatternItems = useMemo(
    () =>
      recentPatterns
        .map((id) => getPatternById(id))
        .filter((pattern): pattern is StrumPattern => Boolean(pattern))
        .slice(0, HOME_SECTION_LIMIT),
    [recentPatterns],
  );

  // 즐겨찾기는 추가한 순서(최근 추가가 앞)
  const favoritePatternItems = useMemo(
    () =>
      favorites
        .map((id) => getPatternById(id))
        .filter((pattern): pattern is StrumPattern => Boolean(pattern)),
    [favorites],
  );

  const openHome = useCallback(() => navigate({ name: 'home' }), [navigate]);

  // 카테고리를 고르면 검색어는 비운다(정렬은 유지)
  const openCategory = useCallback(
    (categoryId: StrumCategoryId | 'all') =>
      navigate({ name: 'category', categoryId }, { sort: query.sort }),
    [navigate, query.sort],
  );

  const openPattern = useCallback(
    (id: string) => navigate({ name: 'pattern', patternId: id }),
    [navigate],
  );

  // 상세에서 이전/다음은 기록을 쌓지 않는다(뒤로가기 한 번에 목록으로)
  const openNeighbor = useCallback(
    (id: string) => navigate({ name: 'pattern', patternId: id }, {}, { replace: true }),
    [navigate],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      if (route.name === 'pattern') {
        // 상세에서 검색을 시작하면 전체 검색 결과로 이동
        navigate({ name: 'category', categoryId: 'all' }, { q: value });
      } else {
        setQuery({ q: value });
      }
    },
    [navigate, route.name, setQuery],
  );

  const previewPattern = useCallback(
    (pattern: StrumPattern) => {
      void togglePreview(pattern);
    },
    [togglePreview],
  );

  const galleryProps = {
    favorites: favoriteSet,
    onToggleFavorite: toggleFavorite,
    onOpen: openPattern,
    onPreview: previewPattern,
    previewingId,
  };

  const scopeLabel = listCategoryId === 'all' ? '전체' : categoryById[listCategoryId].labelKo;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader
        searchTerm={searchTerm}
        onSearchTermChange={handleSearchChange}
        onHome={openHome}
      />

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        {selectedPattern ? (
          <PatternDetail
            pattern={selectedPattern}
            isFavorite={isFavorite(selectedPattern.id)}
            onToggleFavorite={toggleFavorite}
            onBack={() => back({ name: 'category', categoryId: selectedPattern.categoryId })}
            onOpenPattern={openNeighbor}
          />
        ) : route.name === 'home' && !searchTerm ? (
          <>
            <CategorySelector selectedCategoryId="all" onSelect={openCategory} />
            <HomeSections
              recentPatterns={recentPatternItems}
              favoritePatterns={favoritePatternItems.slice(0, HOME_SECTION_LIMIT)}
              favoriteTotal={favoritePatternItems.length}
              onShowAllFavorites={() =>
                navigate({ name: 'category', categoryId: 'all' }, { sort: 'favorites' })
              }
              {...galleryProps}
            />
            <section className="space-y-4" aria-labelledby="all-heading">
              <h2 id="all-heading" className="text-xl font-black text-slate-950 sm:text-2xl">
                전체 패턴
              </h2>
              <FilterBar
                sortMode={sortMode}
                onSortModeChange={(sort) => setQuery({ sort })}
                resultCount={filteredPatterns.length}
              />
              <PatternGallery patterns={filteredPatterns} {...galleryProps} />
            </section>
          </>
        ) : (
          <>
            <CategoryChips selectedCategoryId={listCategoryId} onSelect={openCategory} />

            <section className="space-y-4" aria-labelledby="gallery-heading">
              <div>
                <h1 id="gallery-heading" className="text-xl font-black text-slate-950 sm:text-2xl">
                  {searchTerm
                    ? `${scopeLabel} · ‘${searchTerm}’ 검색 결과`
                    : listCategoryId === 'all'
                      ? '전체 패턴'
                      : categoryById[listCategoryId].labelKo}
                </h1>
                {!searchTerm && listCategoryId !== 'all' ? (
                  <p className="mt-1 text-sm text-slate-500">
                    {categoryById[listCategoryId].description}
                  </p>
                ) : null}
                {searchTerm && listCategoryId !== 'all' ? (
                  <button
                    type="button"
                    onClick={() => navigate({ name: 'category', categoryId: 'all' }, query)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 hover:border-slate-300"
                  >
                    <Search className="h-3.5 w-3.5" aria-hidden="true" />
                    전체 카테고리에서 찾기
                  </button>
                ) : null}
              </div>
              <FilterBar
                sortMode={sortMode}
                onSortModeChange={(sort) => setQuery({ sort })}
                resultCount={filteredPatterns.length}
              />
              {filteredPatterns.length === 0 && searchTerm ? (
                <div className="space-y-3">
                  <EmptyState
                    title={`‘${searchTerm}’에 맞는 패턴이 없습니다`}
                    description="Ex 번호(ex03), 박자(3/4), 느낌(셋잇단·스윙), 카테고리 이름으로 찾아보세요."
                  />
                  <button
                    type="button"
                    onClick={() => setQuery({ q: '' })}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    검색어 지우기
                  </button>
                </div>
              ) : (
                <PatternGallery patterns={filteredPatterns} {...galleryProps} />
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

type HomeSectionsProps = {
  recentPatterns: StrumPattern[];
  favoritePatterns: StrumPattern[];
  favoriteTotal: number;
  onShowAllFavorites: () => void;
  favorites: Set<string>;
  onOpen: (patternId: string) => void;
  onToggleFavorite: (patternId: string) => void;
  onPreview: (pattern: StrumPattern) => void;
  previewingId: string | null;
};

function HomeSections({
  recentPatterns,
  favoritePatterns,
  favoriteTotal,
  onShowAllFavorites,
  ...galleryProps
}: HomeSectionsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="min-w-0 space-y-3" aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="text-xl font-black text-slate-950">
          최근 본 패턴
        </h2>
        {recentPatterns.length > 0 ? (
          <PatternGallery patterns={recentPatterns} {...galleryProps} />
        ) : (
          <EmptyState
            title="아직 최근 본 패턴이 없습니다"
            description="카테고리에서 패턴을 열면 이곳에 빠르게 모입니다."
          />
        )}
      </section>

      <section className="min-w-0 space-y-3" aria-labelledby="favorite-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="favorite-heading" className="text-xl font-black text-slate-950">
            즐겨찾기
          </h2>
          {favoriteTotal > favoritePatterns.length ? (
            <button
              type="button"
              onClick={onShowAllFavorites}
              className="text-sm font-bold text-teal-700 hover:underline"
            >
              전체 보기 ({favoriteTotal})
            </button>
          ) : null}
        </div>
        {favoritePatterns.length > 0 ? (
          <PatternGallery patterns={favoritePatterns} {...galleryProps} />
        ) : (
          <EmptyState
            title="즐겨찾기를 추가해 보세요"
            description="자주 연습할 패턴에 하트를 눌러 모아둘 수 있습니다."
          />
        )}
      </section>
    </div>
  );
}

export default App;
