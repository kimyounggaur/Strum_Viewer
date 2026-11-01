import { ArrowDown, ArrowUp, VolumeX } from 'lucide-react';
import { memo, useRef } from 'react';
import { engine } from '../../audio/engineInstance';
import type { Stroke, StrumPattern } from '../../data/strumTypes';
import { usePlayheadFrame, useTransportSnapshot } from '../../hooks/useTransportClock';
import { cellsInLoop, formatBeatLabels } from '../../lib/rhythm';

type KaraokeTrackProps = {
  pattern: StrumPattern;
};

type NoteState = 'upcoming' | 'active' | 'played';

// 스트럼 3단계: 예정(회색) → 지금(노랑) → 지나감(초록)
const chipClass: Record<NoteState, string> = {
  upcoming: 'border-slate-200 bg-white text-slate-500',
  active:
    'border-amber-500 bg-amber-400 text-amber-950 scale-110 ring-2 ring-amber-300 shadow-[0_0_22px_rgba(245,158,11,0.6)] motion-reduce:scale-100',
  played: 'border-teal-600 bg-teal-500 text-white',
};

// 시간 t(0~1)를 좌우 여백을 둔 가로 위치(%)로 변환
const PAD = 0.035;
function xAt(t: number): number {
  return (PAD + (1 - 2 * PAD) * Math.min(1, Math.max(0, t))) * 100;
}

function strokeLabel(stroke: Stroke, beatLabel: string): string {
  const dir =
    stroke.dir === 'down'
      ? '다운'
      : stroke.dir === 'up'
        ? '업'
        : stroke.dir === 'mute'
          ? '뮤트'
          : '쉼';
  return [
    `${beatLabel} 박`,
    dir,
    stroke.accent ? '악센트' : '',
    stroke.tie ? '붙임줄(치지 않음)' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * 재생 트랙. 칩 상태는 "현재 스트로크가 바뀔 때만" 리렌더되고,
 * 빨간 재생선은 rAF 프레임에서 ref로 직접 움직인다.
 */
export function KaraokeTrack({ pattern }: KaraokeTrackProps) {
  const rhythm = pattern.rhythm;
  const snapshot = useTransportSnapshot();
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  usePlayheadFrame((position) => {
    const line = playheadRef.current;
    if (!line) return;
    const visible =
      engine.patternId === pattern.id &&
      (position.status === 'playing' || position.status === 'paused');
    line.style.left = `${xAt(position.progress)}%`;
    line.style.opacity = visible ? '1' : '0';

    // 좁은 화면에서 트랙이 가로로 넘치면 재생선을 따라간다.
    const scroller = scrollRef.current;
    if (visible && position.status === 'playing' && scroller) {
      const overflow = scroller.scrollWidth - scroller.clientWidth;
      if (overflow > 0) {
        const x = (xAt(position.progress) / 100) * scroller.scrollWidth;
        const viewLeft = scroller.scrollLeft;
        if (
          x < viewLeft + scroller.clientWidth * 0.15 ||
          x > viewLeft + scroller.clientWidth * 0.7
        ) {
          scroller.scrollLeft = Math.min(overflow, Math.max(0, x - scroller.clientWidth * 0.3));
        }
      }
    }
  });

  if (!rhythm) {
    return null;
  }

  const owns = engine.patternId === pattern.id;
  const showing = owns && (snapshot.status === 'playing' || snapshot.status === 'paused');
  const active = showing ? snapshot.activeStrokeIndex : -1;
  const countIn = owns ? snapshot.countIn : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-black text-slate-900">
          재생 트랙 · 스트럼 모드
          {countIn ? (
            <span
              className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 text-amber-800"
              aria-live="assertive"
            >
              카운트 {countIn.beats - countIn.beat + 1}
            </span>
          ) : null}
        </h2>
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="inline-flex items-center gap-1 text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden="true" />
            예정
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />
            지금
          </span>
          <span className="inline-flex items-center gap-1 text-teal-700">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-500" aria-hidden="true" />
            지나감
          </span>
        </div>
      </div>

      <TrackBody
        pattern={pattern}
        activeStrokeIndex={active}
        playheadRef={playheadRef}
        scrollRef={scrollRef}
      />
    </div>
  );
}

type TrackBodyProps = {
  pattern: StrumPattern;
  activeStrokeIndex: number;
  playheadRef: React.RefObject<HTMLDivElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
};

const TrackBody = memo(function TrackBody({
  pattern,
  activeStrokeIndex,
  playheadRef,
  scrollRef,
}: TrackBodyProps) {
  const rhythm = pattern.rhythm!;
  const cells = cellsInLoop(rhythm);
  const labels = formatBeatLabels(rhythm);
  const cellsPerBar = rhythm.beatsPerBar * rhythm.subdivision;

  return (
    <div
      ref={scrollRef}
      tabIndex={0}
      role="region"
      aria-label="재생 트랙 (좁은 화면에서는 가로로 스크롤)"
      className="strum-scrollbar overflow-x-auto pb-1 outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
    >
      <div
        className="relative h-28 w-full min-w-[calc(var(--cells)*40px)] sm:min-w-[calc(var(--cells)*54px)]"
        style={{ '--cells': cells } as React.CSSProperties}
      >
        <div className="absolute inset-x-0 top-[38%] h-px bg-slate-100" aria-hidden="true" />

        {/* 마디 경계선 (2마디 이상) */}
        {Array.from({ length: Math.max(0, Math.round(cells / cellsPerBar) - 1) }).map((_, bar) => (
          <div
            key={`bar-${bar}`}
            className="absolute top-2 bottom-6 w-px bg-slate-300"
            style={{ left: `${xAt(((bar + 1) * cellsPerBar) / cells)}%` }}
            aria-hidden="true"
          />
        ))}

        {Array.from({ length: cells }).map((_, cell) => {
          const isBeat = cell % rhythm.subdivision === 0;
          return (
            <div
              key={`label-${cell}`}
              className="absolute bottom-0 -translate-x-1/2 text-center"
              style={{ left: `${xAt((cell + 0.5) / cells)}%` }}
              aria-hidden="true"
            >
              <span
                className={[
                  'text-[11px] font-bold',
                  isBeat ? 'text-slate-600' : 'text-slate-500',
                ].join(' ')}
              >
                {labels[cell]}
              </span>
            </div>
          );
        })}

        <ol className="contents" aria-label="스트로크 순서">
          {rhythm.strokes.map((stroke, index) => {
            const state: NoteState =
              activeStrokeIndex < 0
                ? 'upcoming'
                : index === activeStrokeIndex
                  ? 'active'
                  : index < activeStrokeIndex
                    ? 'played'
                    : 'upcoming';
            const Icon =
              stroke.dir === 'up' ? ArrowUp : stroke.dir === 'down' ? ArrowDown : VolumeX;
            const beatLabel =
              labels[stroke.step] || String(Math.floor(stroke.step / rhythm.subdivision) + 1);

            return (
              <li
                key={index}
                aria-label={strokeLabel(stroke, beatLabel)}
                aria-current={state === 'active' ? 'true' : undefined}
                title={stroke.tie ? '붙임줄: 앞 소리를 이어서 끌기(치지 않음)' : undefined}
                className={[
                  'absolute top-[12%] flex h-9 w-9 -translate-x-1/2 sm:h-11 sm:w-11 items-center justify-center rounded-xl border-2 transition-[transform,background-color,border-color,color] duration-100 ease-out motion-reduce:transition-none',
                  chipClass[state],
                  stroke.tie ? 'border-dashed opacity-60' : '',
                ].join(' ')}
                style={{ left: `${xAt((stroke.step + 0.5) / cells)}%` }}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                {stroke.tie ? (
                  <span
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-sm font-black leading-none"
                    aria-hidden="true"
                  >
                    ~
                  </span>
                ) : null}
                {stroke.accent ? (
                  <span
                    className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-white bg-rose-500"
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>

        <div
          ref={playheadRef}
          className="absolute top-0 bottom-6 w-[2px] -translate-x-1/2 rounded-full bg-red-500 opacity-0 shadow-[0_0_10px_rgba(239,68,68,0.6)] transition-opacity motion-reduce:shadow-none"
          style={{ left: `${xAt(0)}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
});
