import type { StrumPattern } from '../data/strumTypes';
import { strokeXNorm } from '../lib/rhythm';

type StrumSheetProps = {
  pattern: StrumPattern;
  progress: number;
  activeStrokeIndex: number;
  isPlaying: boolean;
};

export function StrumSheet({ pattern, progress, activeStrokeIndex, isPlaying }: StrumSheetProps) {
  const rhythm = pattern.rhythm;

  if (!rhythm) {
    return null;
  }

  const leftPad = rhythm.imageLeftPad ?? 0.12;
  const rightPad = rhythm.imageRightPad ?? 0.92;
  const playhead = leftPad + (rightPad - leftPad) * Math.min(1, Math.max(0, progress));
  const activeStroke = activeStrokeIndex >= 0 ? rhythm.strokes[activeStrokeIndex] : undefined;
  const activeX = activeStroke ? strokeXNorm(activeStroke, rhythm) : playhead;

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div
        className={[
          'absolute top-[9%] h-[82%] w-[3px] -translate-x-1/2 rounded-full bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.6)] transition-opacity',
          isPlaying ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        style={{ left: `${playhead * 100}%` }}
      />
      {isPlaying && activeStroke ? (
        <div
          className="absolute top-[42%] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300 bg-amber-300/30 shadow-[0_0_24px_rgba(245,158,11,0.4)]"
          style={{ left: `${activeX * 100}%` }}
        />
      ) : null}
    </div>
  );
}
