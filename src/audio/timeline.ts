import type { Stroke, StrumRhythm } from '../data/strumTypes';
import { loopBeats, loopDuration, secPerBeat, strokeTimeInBar } from '../lib/rhythm';

/** 무엇을 소리낼지. 클릭(메트로놈)과 스트럼을 따로 켜고 끈다. */
export type Mix = 'both' | 'strum' | 'click';

export type TimelineEvent =
  /** 사이클(루프 1바퀴) 시작. 이벤트가 하나도 없어도 루프가 전진하도록 항상 offset 0에 둔다. */
  | { kind: 'marker'; offset: 0 }
  /** `strokeIndex`는 `rhythm.strokes`의 원본 인덱스. 하이라이트가 정렬 순서에 의존하지 않는다. */
  | { kind: 'stroke'; offset: number; strokeIndex: number; stroke: Stroke }
  | { kind: 'click'; offset: number; beat: number; accent: boolean };

export type StrokeEvent = Extract<TimelineEvent, { kind: 'stroke' }>;

export type Timeline = {
  /** 루프 1바퀴 길이(초). */
  loopDuration: number;
  secPerBeat: number;
  /** offset 오름차순. 같은 offset이면 marker → click → stroke 순. */
  events: TimelineEvent[];
  /**
   * 모든 스트로크(offset 오름차순). 하이라이트 계산용이라 믹스와 무관하게 항상 채운다.
   * ("클릭만" 모드에서도 학생은 하이라이트를 보며 직접 친다.)
   */
  strokeEvents: StrokeEvent[];
};

const kindRank: Record<TimelineEvent['kind'], number> = { marker: 0, click: 1, stroke: 2 };

/**
 * 리듬 + BPM + 믹스를 "루프 시작 기준 몇 초에 무엇을 소리낼지" 목록으로 바꾼다.
 * 순수 함수. 스트로크 offset은 기존 `strokeTimeInBar()`와 동일한 값을 낸다(골든 테스트로 고정).
 */
export function buildTimeline(rhythm: StrumRhythm, bpm: number, mix: Mix): Timeline {
  const spb = secPerBeat(bpm);
  const events: TimelineEvent[] = [{ kind: 'marker', offset: 0 }];

  if (mix !== 'strum') {
    const beats = loopBeats(rhythm);
    for (let beat = 0; beat < beats; beat += 1) {
      events.push({
        kind: 'click',
        offset: beat * spb,
        beat,
        accent: beat % rhythm.beatsPerBar === 0,
      });
    }
  }

  const strokeEvents: StrokeEvent[] = rhythm.strokes
    .map((stroke, strokeIndex) => ({
      kind: 'stroke' as const,
      offset: strokeTimeInBar(stroke, rhythm, bpm),
      strokeIndex,
      stroke,
    }))
    .sort((a, b) => a.offset - b.offset);

  if (mix !== 'click') {
    events.push(...strokeEvents);
  }

  events.sort((a, b) => a.offset - b.offset || kindRank[a.kind] - kindRank[b.kind]);

  return {
    loopDuration: loopDuration(rhythm, bpm),
    secPerBeat: spb,
    events,
    strokeEvents,
  };
}

/** 루프 안 시각 `offsetInLoop`(초)에 "마지막으로 지난" 스트로크의 원본 인덱스. 없으면 -1. */
export function activeStrokeAt(timeline: Timeline, offsetInLoop: number): number {
  let active = -1;
  for (const event of timeline.strokeEvents) {
    if (event.offset <= offsetInLoop) {
      active = event.strokeIndex;
    } else {
      break;
    }
  }
  return active;
}
