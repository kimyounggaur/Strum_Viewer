import { ArrowLeft, ArrowRight, ChevronLeft, Heart } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { categoryById } from '../data/strumCategories';
import type { StrumPattern } from '../data/strumTypes';
import { getNeighborPatterns } from '../data/patterns';
import { IconButton } from './IconButton';
import { KaraokeTrack } from './KaraokeTrack';
import { PatternImageViewer } from './PatternImageViewer';
import { PracticePanel } from './PracticePanel';

type PatternDetailProps = {
  pattern: StrumPattern;
  isFavorite: boolean;
  onToggleFavorite: (patternId: string) => void;
  onBack: () => void;
  onOpenPattern: (patternId: string) => void;
};

export function PatternDetail({
  pattern,
  isFavorite,
  onToggleFavorite,
  onBack,
  onOpenPattern,
}: PatternDetailProps) {
  const category = categoryById[pattern.categoryId];
  const neighbors = getNeighborPatterns(pattern);
  const [transportState, setTransportState] = useState({
    isPlaying: false,
    progress: 0,
    activeStrokeIndex: -1,
  });

  const goPrevious = useCallback(() => {
    if (neighbors.previous) {
      onOpenPattern(neighbors.previous.id);
    }
  }, [neighbors.previous, onOpenPattern]);

  const goNext = useCallback(() => {
    if (neighbors.next) {
      onOpenPattern(neighbors.next.id);
    }
  }, [neighbors.next, onOpenPattern]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        return;
      }

      if (event.key === 'Escape') {
        onBack();
      } else if (event.key === 'ArrowLeft') {
        goPrevious();
      } else if (event.key === 'ArrowRight') {
        goNext();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrevious, onBack]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <IconButton label="뒤로" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-lg px-2.5 py-1 text-xs font-black text-white"
                style={{ backgroundColor: category.color }}
              >
                {category.shortLabel}
              </span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {pattern.timeSignature}
              </span>
              {pattern.rhythm ? (
                <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
                  오디오 재생
                </span>
              ) : (
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  메트로놈
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-black text-slate-950">{pattern.title}</h1>
            <p className="mt-1 break-all text-sm text-slate-500">{pattern.originalFileName}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <IconButton label="이전 패턴" onClick={goPrevious} disabled={!neighbors.previous}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton label="다음 패턴" onClick={goNext} disabled={!neighbors.next}>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            active={isFavorite}
            onClick={() => onToggleFavorite(pattern.id)}
          >
            <Heart className={['h-4 w-4', isFavorite ? 'fill-current' : ''].join(' ')} aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      {pattern.rhythm ? (
        <KaraokeTrack
          pattern={pattern}
          progress={transportState.progress}
          activeStrokeIndex={transportState.activeStrokeIndex}
          isPlaying={transportState.isPlaying}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <PatternImageViewer
          pattern={pattern}
          progress={transportState.progress}
          activeStrokeIndex={transportState.activeStrokeIndex}
          isPlaying={transportState.isPlaying}
        />
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <PracticePanel pattern={pattern} onTransportChange={setTransportState} />
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
            <div className="font-black text-slate-900">연습 정보</div>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              <dt className="text-slate-500">추천 BPM</dt>
              <dd className="font-bold text-slate-800">{pattern.recommendedBpm.default}</dd>
              <dt className="text-slate-500">난이도</dt>
              <dd className="font-bold text-slate-800">{pattern.difficulty}</dd>
              <dt className="text-slate-500">크기</dt>
              <dd className="font-bold text-slate-800">
                {pattern.width} x {pattern.height}
              </dd>
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}
