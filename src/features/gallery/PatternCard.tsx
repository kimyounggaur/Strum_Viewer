import { Heart, Play, Square, Star } from 'lucide-react';
import { memo, useState } from 'react';
import { countingFeelLabel, difficultyLabel } from '../../data/labels';
import { categoryById } from '../../data/strumCategories';
import type { StrumPattern } from '../../data/strumTypes';
import { IconButton } from '../../components/ui/IconButton';

type PatternCardProps = {
  pattern: StrumPattern;
  isFavorite: boolean;
  onToggleFavorite: (patternId: string) => void;
  onOpen: (patternId: string) => void;
  onPreview?: (pattern: StrumPattern) => void;
  isPreviewing?: boolean;
  /** 카드 제목 수준 (목록 h1 아래 = 2, 홈 섹션 h2 아래 = 3) */
  headingLevel?: 2 | 3;
};

export const PatternCard = memo(function PatternCard({
  pattern,
  isFavorite,
  onToggleFavorite,
  onOpen,
  onPreview,
  isPreviewing = false,
  headingLevel = 2,
}: PatternCardProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  const category = categoryById[pattern.categoryId];
  const [loaded, setLoaded] = useState(false);

  return (
    <article
      className={[
        'overflow-hidden rounded-lg border bg-white shadow-sm transition hover:shadow-soft motion-safe:hover:-translate-y-0.5',
        isPreviewing ? 'border-teal-500 ring-2 ring-teal-200' : 'border-slate-200',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onOpen(pattern.id)}
        data-open-pattern={pattern.id}
        className="block w-full bg-white p-3 text-left"
        aria-label={`${pattern.title} 상세 보기`}
      >
        <div
          className={[
            'flex h-36 items-center justify-center overflow-hidden rounded-lg border border-slate-100',
            loaded ? 'bg-white' : 'animate-pulse bg-slate-100',
          ].join(' ')}
        >
          <img
            src={pattern.thumbSrc}
            alt={`${pattern.titleKo} 스트럼 패턴 악보`}
            width={pattern.width}
            height={pattern.height}
            loading="lazy"
            decoding="async"
            draggable={false}
            className={[
              'max-h-full max-w-full object-contain transition-opacity duration-150',
              loaded ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            onLoad={() => setLoaded(true)}
            onError={(event) => {
              const placeholder = '/strums/placeholders/pattern-placeholder.svg';
              if (!event.currentTarget.src.endsWith(placeholder)) {
                event.currentTarget.src = placeholder;
              }
              setLoaded(true);
            }}
          />
        </div>
      </button>

      <div className="space-y-3 px-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: category.color }}
                aria-hidden="true"
              />
              <span className="text-xs font-bold uppercase tracking-normal text-slate-500">
                {category.shortLabel}
              </span>
            </div>
            <Heading className="mt-1 text-lg font-black text-slate-950">
              {pattern.displayNo}
            </Heading>
          </div>

          <div className="flex gap-2">
            {pattern.rhythm && onPreview ? (
              <IconButton
                label={
                  isPreviewing ? `${pattern.title} 미리듣기 정지` : `${pattern.title} 미리듣기`
                }
                active={isPreviewing}
                aria-pressed={isPreviewing}
                onClick={() => onPreview(pattern)}
              >
                {isPreviewing ? (
                  <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                ) : (
                  <Play className="h-4 w-4" aria-hidden="true" />
                )}
              </IconButton>
            ) : null}
            <IconButton
              label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              active={isFavorite}
              onClick={() => onToggleFavorite(pattern.id)}
            >
              <Heart
                className={['h-4 w-4', isFavorite ? 'fill-current' : ''].join(' ')}
                aria-hidden="true"
              />
            </IconButton>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
            {pattern.timeSignature}
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
            {pattern.recommendedBpm.default} BPM
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
            {countingFeelLabel[pattern.countingFeel]}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            {difficultyLabel[pattern.difficulty]}
          </span>
        </div>
      </div>
    </article>
  );
});
