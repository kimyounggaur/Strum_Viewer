import { useRef } from 'react';
import type { StrumPattern } from '../../data/strumTypes';
import { usePlayheadFrame } from '../../hooks/useTransportClock';
import { engine } from '../../audio/engineInstance';

type StrumSheetProps = {
  pattern: StrumPattern;
};

/**
 * 정적 PNG 위의 "현재 위치" 재생선. 음표별 색 변화는 인쇄된 음표 좌표와 리듬 데이터가
 * 1:1로 맞지 않으므로 KaraokeTrack에서 처리한다.
 *
 * 재생선 위치는 rAF 프레임 콜백에서 ref로 직접 갱신한다(React 리렌더 없음).
 */
export function StrumSheet({ pattern }: StrumSheetProps) {
  const lineRef = useRef<HTMLDivElement | null>(null);
  const rhythm = pattern.rhythm;
  const leftPad = rhythm?.imageLeftPad ?? 0.12;
  const rightPad = rhythm?.imageRightPad ?? 0.92;

  usePlayheadFrame((position) => {
    const line = lineRef.current;
    if (!line) return;
    const visible =
      engine.patternId === pattern.id &&
      (position.status === 'playing' || position.status === 'paused');
    const x = leftPad + (rightPad - leftPad) * position.progress;
    line.style.left = `${x * 100}%`;
    line.style.opacity = visible ? '1' : '0';
  });

  if (!rhythm) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div
        ref={lineRef}
        className="absolute top-[9%] h-[82%] w-[3px] -translate-x-1/2 rounded-full bg-red-500 opacity-0 shadow-[0_0_18px_rgba(239,68,68,0.6)] transition-opacity motion-reduce:shadow-none"
        style={{ left: `${leftPad * 100}%` }}
      />
    </div>
  );
}
