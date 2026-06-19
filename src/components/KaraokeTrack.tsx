import { ArrowDown, ArrowUp, VolumeX } from 'lucide-react';
import type { StrumPattern } from '../data/strumTypes';
import { cellsInLoop, formatBeatLabels } from '../lib/rhythm';

type KaraokeTrackProps = {
  pattern: StrumPattern;
  progress: number;
  activeStrokeIndex: number;
  isPlaying: boolean;
};

type NoteState = 'upcoming' | 'active' | 'played';

// 스트럼 3단계: 예정(회색) → 지금(노랑) → 지나감(초록)
const chipClass: Record<NoteState, string> = {
  upcoming: 'border-slate-200 bg-white text-slate-400',
  active:
    'border-amber-500 bg-amber-400 text-amber-950 scale-125 ring-2 ring-amber-300 shadow-[0_0_22px_rgba(245,158,11,0.6)]',
  played: 'border-teal-600 bg-teal-500 text-white',
};

function noteState(index: number, activeStrokeIndex: number, isPlaying: boolean): NoteState {
  if (!isPlaying || activeStrokeIndex < 0) return 'upcoming';
  if (index === activeStrokeIndex) return 'active';
  if (index < activeStrokeIndex) return 'played';
  return 'upcoming';
}

// 시간 t(0~1)를 좌우 여백을 둔 가로 위치(%)로 변환
function xAt(t: number): number {
  const pad = 0.035;
  return (pad + (1 - 2 * pad) * Math.min(1, Math.max(0, t))) * 100;
}

export function KaraokeTrack({ pattern, progress, activeStrokeIndex, isPlaying }: KaraokeTrackProps) {
  const rhythm = pattern.rhythm;

  if (!rhythm) {
    return null;
  }

  const cells = cellsInLoop(rhythm);
  const labels = formatBeatLabels(rhythm);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-slate-900">재생 트랙 · 스트럼 모드</h3>
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="inline-flex items-center gap-1 text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden="true" />예정
          </span>
          <span className="inline-flex items-center gap-1 text-amber-600">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />지금
          </span>
          <span className="inline-flex items-center gap-1 text-teal-600">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-500" aria-hidden="true" />지나감
          </span>
        </div>
      </div>

      <div className="strum-scrollbar overflow-x-auto pb-1">
        <div className="relative h-28 w-full" style={{ minWidth: `${cells * 54}px` }}>
          <div className="absolute inset-x-0 top-[38%] h-px bg-slate-100" aria-hidden="true" />

          {Array.from({ length: cells }).map((_, cell) => {
            const isBeat = cell % rhythm.subdivision === 0;
            return (
              <div
                key={`label-${cell}`}
                className="absolute bottom-0 -translate-x-1/2 text-center"
                style={{ left: `${xAt((cell + 0.5) / cells)}%` }}
              >
                <span
                  className={[
                    'text-[11px] font-bold',
                    isBeat ? 'text-slate-500' : 'text-slate-300',
                  ].join(' ')}
                >
                  {labels[cell]}
                </span>
              </div>
            );
          })}

          {rhythm.strokes.map((stroke, index) => {
            const state = noteState(index, activeStrokeIndex, isPlaying);
            const Icon = stroke.dir === 'up' ? ArrowUp : stroke.dir === 'down' ? ArrowDown : VolumeX;

            return (
              <div
                key={index}
                className={[
                  'absolute top-[12%] flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-xl border-2 transition-all duration-100 ease-out',
                  chipClass[state],
                ].join(' ')}
                style={{ left: `${xAt((stroke.step + 0.5) / cells)}%` }}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
                {stroke.accent ? (
                  <span
                    className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-white bg-rose-500"
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            );
          })}

          <div
            className={[
              'absolute top-0 bottom-6 w-[2px] -translate-x-1/2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] transition-opacity',
              isPlaying ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            style={{ left: `${xAt(progress)}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
