import type { StrumPattern } from '../data/strumTypes';

type StrumSheetProps = {
  pattern: StrumPattern;
  progress: number;
  activeStrokeIndex: number;
  isPlaying: boolean;
};

// 정적 PNG 위에는 "현재 위치" 재생선만 표시한다. 음표별 색 변화는
// 인쇄된 음표 좌표와 리듬 데이터가 1:1로 맞지 않으므로 KaraokeTrack에서 처리한다.
export function StrumSheet({ pattern, progress, isPlaying }: StrumSheetProps) {
  const rhythm = pattern.rhythm;

  if (!rhythm) {
    return null;
  }

  const leftPad = rhythm.imageLeftPad ?? 0.12;
  const rightPad = rhythm.imageRightPad ?? 0.92;
  const playhead = leftPad + (rightPad - leftPad) * Math.min(1, Math.max(0, progress));

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div
        className={[
          'absolute top-[9%] h-[82%] w-[3px] -translate-x-1/2 rounded-full bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.6)] transition-opacity',
          isPlaying ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        style={{ left: `${playhead * 100}%` }}
      />
    </div>
  );
}
