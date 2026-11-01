import { useCallback } from 'react';
import { engine } from '../audio/engineInstance';
import type { StrumPattern } from '../data/strumTypes';
import { useTransportSnapshot } from './useTransportClock';

/**
 * 갤러리 카드 미리듣기. 공유 엔진으로 한 바퀴만(스트럼만) 재생한다.
 * - 같은 카드를 다시 누르면 정지, 다른 카드를 누르면 바꿔서 재생(겹치지 않음).
 * - 재생이 끝나거나 상세 화면이 엔진을 가져가면 자동으로 해제된다.
 */
export function usePreview(): {
  previewingId: string | null;
  toggle: (pattern: StrumPattern) => Promise<void>;
  stop: () => void;
} {
  const snapshot = useTransportSnapshot();
  const previewingId = snapshot.status !== 'idle' ? engine.patternId : null;

  const toggle = useCallback(async (pattern: StrumPattern) => {
    if (engine.isActive && engine.patternId === pattern.id) {
      engine.stop();
      return;
    }
    engine.load(pattern, pattern.recommendedBpm.default);
    await engine.start({ loop: false, countIn: false, mix: 'strum' });
  }, []);

  const stop = useCallback(() => {
    if (engine.isActive) engine.stop();
  }, []);

  return { previewingId, toggle, stop };
}
