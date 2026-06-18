import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine } from './audio/AudioEngine';
import { AppHeader } from './components/AppHeader';
import { CategorySelector } from './components/CategorySelector';
import { EmptyState } from './components/EmptyState';
import { FilterBar } from './components/FilterBar';
import { PatternDetail } from './components/PatternDetail';
import { PatternGallery } from './components/PatternGallery';
import { strumCategories } from './data/strumCategories';
import { getPatternById, strumPatterns } from './data/patterns';
import type { SortMode, StrumCategoryId, StrumPattern, ViewMode } from './data/strumTypes';
import { useFavorites } from './hooks/useFavorites';
import { useFilteredPatterns } from './hooks/useFilteredPatterns';
import { useRecentPatterns } from './hooks/useRecentPatterns';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [selectedCategoryId, setSelectedCategoryId] = useState<StrumCategoryId | 'all'>('all');
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('exercise');
  const { favoriteSet, isFavorite, toggleFavorite } = useFavorites();
  const { recentPatterns, rememberPattern } = useRecentPatterns();
  const previewEngineRef = useRef<AudioEngine | null>(null);

  const selectedPattern = getPatternById(selectedPatternId);
  const activeCategoryId = viewMode === 'home' && searchTerm ? 'all' : selectedCategoryId;
  const filteredPatterns = useFilteredPatterns({
    patterns: strumPatterns,
    searchTerm,
    categoryId: activeCategoryId,
    sortMode,
    favorites: favoriteSet,
    recentPatterns,
  });

  const recentPatternItems = useMemo(
    () =>
      recentPatterns
        .map((patternId) => getPatternById(patternId))
        .filter((pattern): pattern is StrumPattern => Boolean(pattern))
        .slice(0, 8),
    [recentPatterns],
  );

  const favoritePatternItems = useMemo(
    () => strumPatterns.filter((pattern) => favoriteSet.has(pattern.id)).slice(0, 8),
    [favoriteSet],
  );

  const openHome = useCallback(() => {
    setViewMode('home');
    setSelectedCategoryId('all');
    setSelectedPatternId(null);
  }, []);

  const openCategory = useCallback((categoryId: StrumCategoryId) => {
    setSelectedCategoryId(categoryId);
    setSelectedPatternId(null);
    setViewMode('category');
  }, []);

  const openPattern = useCallback(
    (patternId: string) => {
      const pattern = getPatternById(patternId);
      if (!pattern) return;
      setSelectedCategoryId(pattern.categoryId);
      setSelectedPatternId(patternId);
      rememberPattern(patternId);
      setViewMode('detail');
    },
    [rememberPattern],
  );

  const previewPattern = useCallback(async (pattern: StrumPattern) => {
    if (!pattern.rhythm) return;
    previewEngineRef.current?.stop();
    const engine = previewEngineRef.current ?? new AudioEngine();
    previewEngineRef.current = engine;
    engine.load(pattern, pattern.recommendedBpm.default, 'guitar');
    await engine.start({ loop: false, countIn: false, metronome: false });
  }, []);

  useEffect(
    () => () => {
      previewEngineRef.current?.dispose();
    },
    [],
  );

  const categoryTitle = useMemo(() => {
    if (selectedCategoryId === 'all') return '전체 패턴';
    return strumCategories.find((category) => category.id === selectedCategoryId)?.labelKo ?? '패턴';
  }, [selectedCategoryId]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader searchTerm={searchTerm} onSearchTermChange={setSearchTerm} onHome={openHome} />

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        {viewMode === 'detail' && selectedPattern ? (
          <PatternDetail
            pattern={selectedPattern}
            isFavorite={isFavorite(selectedPattern.id)}
            onToggleFavorite={toggleFavorite}
            onBack={() => setViewMode('category')}
            onOpenPattern={openPattern}
          />
        ) : (
          <>
            <CategorySelector selectedCategoryId={selectedCategoryId} onSelect={openCategory} />

            {viewMode === 'home' && !searchTerm ? (
              <HomeSections
                recentPatterns={recentPatternItems}
                favoritePatterns={favoritePatternItems}
                favoriteSet={favoriteSet}
                onOpen={openPattern}
                onToggleFavorite={toggleFavorite}
                onPreview={previewPattern}
              />
            ) : null}

            <section className="space-y-4" aria-labelledby="gallery-heading">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="gallery-heading" className="text-xl font-black text-slate-950 sm:text-2xl">
                    {searchTerm ? '검색 결과' : categoryTitle}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    원본 PNG 비율을 유지한 갤러리입니다.
                  </p>
                </div>
              </div>
              <FilterBar sortMode={sortMode} onSortModeChange={setSortMode} resultCount={filteredPatterns.length} />
              <PatternGallery
                patterns={filteredPatterns}
                favorites={favoriteSet}
                onToggleFavorite={toggleFavorite}
                onOpen={openPattern}
                onPreview={previewPattern}
              />
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
  favoriteSet: Set<string>;
  onOpen: (patternId: string) => void;
  onToggleFavorite: (patternId: string) => void;
  onPreview: (pattern: StrumPattern) => void;
};

function HomeSections({
  recentPatterns,
  favoritePatterns,
  favoriteSet,
  onOpen,
  onToggleFavorite,
  onPreview,
}: HomeSectionsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="space-y-3" aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="text-xl font-black text-slate-950">
          최근 본 패턴
        </h2>
        {recentPatterns.length > 0 ? (
          <PatternGallery
            patterns={recentPatterns}
            favorites={favoriteSet}
            onToggleFavorite={onToggleFavorite}
            onOpen={onOpen}
            onPreview={onPreview}
          />
        ) : (
          <EmptyState title="아직 최근 본 패턴이 없습니다" description="카테고리에서 패턴을 열면 이곳에 빠르게 모입니다." />
        )}
      </section>

      <section className="space-y-3" aria-labelledby="favorite-heading">
        <h2 id="favorite-heading" className="text-xl font-black text-slate-950">
          즐겨찾기
        </h2>
        {favoritePatterns.length > 0 ? (
          <PatternGallery
            patterns={favoritePatterns}
            favorites={favoriteSet}
            onToggleFavorite={onToggleFavorite}
            onOpen={onOpen}
            onPreview={onPreview}
          />
        ) : (
          <EmptyState title="즐겨찾기를 추가해 보세요" description="자주 연습할 패턴에 하트를 눌러 모아둘 수 있습니다." />
        )}
      </section>
    </div>
  );
}

export default App;
