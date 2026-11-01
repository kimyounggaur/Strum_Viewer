import { describe, expect, it } from 'vitest';
import { strumPatterns } from '../data/patterns';
import { loopBeats, loopDuration } from '../lib/rhythm';
import { buildTimeline } from './timeline';

/**
 * 골든 회귀 테스트.
 *
 * 76개 패턴(735 스트로크)을 추천 BPM에서 어떤 시각에 예약하는지를
 * `__golden__/timeline.golden.json`에 고정한다. 이 파일은 Phase 0에서 옛 엔진
 * (`schedulePattern`)으로 만들었고, Phase 1의 `buildTimeline()`이 같은 파일을 그대로
 * 통과함으로써 두 구현의 타이밍이 동일함을 보장한다.
 *
 * 골든을 의도적으로 바꿀 때만 `npx vitest run -u`로 갱신한다.
 */
export type GoldenEntry = {
  id: string;
  bpm: number;
  loopBeats: number;
  loopDuration: number;
  strokes: Array<{ index: number; step: number; dir: string; t: number }>;
};

export function buildGolden(): GoldenEntry[] {
  return strumPatterns.map((pattern) => {
    const rhythm = pattern.rhythm;
    if (!rhythm) throw new Error(`${pattern.id}: rhythm 없음`);
    const bpm = pattern.recommendedBpm.default;
    return {
      id: pattern.id,
      bpm,
      loopBeats: loopBeats(rhythm),
      loopDuration: Number(loopDuration(rhythm, bpm).toFixed(9)),
      strokes: buildTimeline(rhythm, bpm, 'strum').strokeEvents.map((event) => ({
        index: event.strokeIndex,
        step: event.stroke.step,
        dir: event.stroke.dir,
        t: Number(event.offset.toFixed(9)),
      })),
    };
  });
}

describe('타임라인 골든', () => {
  it('76개 패턴·735개 스트로크의 예약 시각이 골든과 일치한다', async () => {
    const golden = buildGolden();
    expect(golden).toHaveLength(76);
    expect(golden.reduce((sum, entry) => sum + entry.strokes.length, 0)).toBe(735);
    await expect(JSON.stringify(golden, null, 2) + '\n').toMatchFileSnapshot(
      './__golden__/timeline.golden.json',
    );
  });

  it('예약 시각은 루프 길이 안에서 단조 증가한다', () => {
    for (const entry of buildGolden()) {
      let previous = -1;
      for (const stroke of entry.strokes) {
        expect(stroke.t).toBeGreaterThanOrEqual(previous);
        expect(stroke.t).toBeLessThan(entry.loopDuration);
        previous = stroke.t;
      }
    }
  });
});
