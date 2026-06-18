import { Heart, Play, Star } from 'lucide-react';
import { categoryById } from '../data/strumCategories';
import type { StrumPattern } from '../data/strumTypes';
import { IconButton } from './IconButton';

type PatternCardProps = {
  pattern: StrumPattern;
  isFavorite: boolean;
  onToggleFavorite: (patternId: string) => void;
  onOpen: (patternId: string) => void;
  onPreview?: (pattern: StrumPattern) => void;
};

const difficultyLabel: Record<StrumPattern['difficulty'], string> = {
  beginner: '기초',
  intermediate: '중급',
  advanced: '응용',
};

export function PatternCard({
  pattern,
  isFavorite,
  onToggleFavorite,
  onOpen,
  onPreview,
}: PatternCardProps) {
  const category = categoryById[pattern.categoryId];

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <button
        type="button"
        onClick={() => onOpen(pattern.id)}
        className="block w-full bg-white p-3 text-left"
        aria-label={`${pattern.title} 상세 보기`}
      >
        <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-white">
          <img
            src={pattern.imageSrc}
            alt={`${pattern.title} 스트럼 패턴 악보`}
            loading="lazy"
            className="max-h-full max-w-full object-contain"
            onError={(event) => {
              event.currentTarget.src = '/strums/placeholders/pattern-placeholder.svg';
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
            <h2 className="mt-1 text-lg font-black text-slate-950">{pattern.displayNo}</h2>
          </div>

          <div className="flex gap-2">
            {pattern.rhythm && onPreview ? (
              <IconButton label={`${pattern.title} 미리듣기`} onClick={() => onPreview(pattern)}>
                <Play className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            ) : null}
            <IconButton
              label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              active={isFavorite}
              onClick={() => onToggleFavorite(pattern.id)}
            >
              <Heart className={['h-4 w-4', isFavorite ? 'fill-current' : ''].join(' ')} aria-hidden="true" />
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
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            {difficultyLabel[pattern.difficulty]}
          </span>
        </div>
      </div>
    </article>
  );
}
