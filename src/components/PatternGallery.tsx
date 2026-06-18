import type { StrumPattern } from '../data/strumTypes';
import { EmptyState } from './EmptyState';
import { PatternCard } from './PatternCard';

type PatternGalleryProps = {
  patterns: StrumPattern[];
  favorites: Set<string>;
  onToggleFavorite: (patternId: string) => void;
  onOpen: (patternId: string) => void;
  onPreview?: (pattern: StrumPattern) => void;
};

export function PatternGallery({
  patterns,
  favorites,
  onToggleFavorite,
  onOpen,
  onPreview,
}: PatternGalleryProps) {
  if (patterns.length === 0) {
    return <EmptyState title="검색 결과가 없습니다" description="카테고리나 검색어를 바꿔 다른 스트럼 패턴을 찾아보세요." />;
  }

  return (
    <section aria-label="스트럼 패턴 갤러리" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {patterns.map((pattern) => (
        <PatternCard
          key={pattern.id}
          pattern={pattern}
          isFavorite={favorites.has(pattern.id)}
          onToggleFavorite={onToggleFavorite}
          onOpen={onOpen}
          onPreview={onPreview}
        />
      ))}
    </section>
  );
}
