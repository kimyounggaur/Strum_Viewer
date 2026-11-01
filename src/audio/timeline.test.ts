import { describe, expect, it } from 'vitest';
import { strumPatterns } from '../data/patterns';
import type { StrumRhythm } from '../data/strumTypes';
import golden from './__golden__/timeline.golden.json';
import { activeStrokeAt, buildTimeline } from './timeline';

type GoldenEntry = {
  id: string;
  bpm: number;
  loopBeats: number;
  loopDuration: number;
  strokes: Array<{ index: number; step: number; dir: string; t: number }>;
};

const goldenById = new Map((golden as GoldenEntry[]).map((entry) => [entry.id, entry]));

describe('buildTimeline — 골든 일치', () => {
  it.each(strumPatterns.map((pattern) => [pattern.id, pattern] as const))('%s', (id, pattern) => {
    const entry = goldenById.get(id)!;
    const timeline = buildTimeline(pattern.rhythm!, entry.bpm, 'strum');
    expect(timeline.loopDuration).toBeCloseTo(entry.loopDuration, 8);
    expect(
      timeline.strokeEvents.map((event) => ({
        index: event.strokeIndex,
        step: event.stroke.step,
        dir: event.stroke.dir,
      })),
    ).toEqual(entry.strokes.map(({ index, step, dir }) => ({ index, step, dir })));
    timeline.strokeEvents.forEach((event, i) => {
      expect(event.offset).toBeCloseTo(entry.strokes[i].t, 8);
    });
  });
});

const waltz: StrumRhythm = {
  timeSignature: [3, 4],
  pulseNote: 'quarter',
  beatsPerBar: 3,
  subdivision: 2,
  bars: 2,
  feelTiming: 'straight',
  strokes: [
    { step: 0, dir: 'down', accent: true },
    { step: 3, dir: 'up' },
    { step: 6, dir: 'down', tie: true },
  ],
};

describe('buildTimeline — 믹스', () => {
  it('marker는 항상 첫 이벤트', () => {
    for (const mix of ['both', 'strum', 'click'] as const) {
      expect(buildTimeline(waltz, 60, mix).events[0]).toEqual({ kind: 'marker', offset: 0 });
    }
  });

  it('both: 클릭 6 + 스트로크 3 + marker 1', () => {
    const timeline = buildTimeline(waltz, 60, 'both');
    expect(timeline.events).toHaveLength(10);
    expect(timeline.events.filter((event) => event.kind === 'click')).toHaveLength(6);
  });

  it('strum: 클릭 없음 / click: 스트로크 없음', () => {
    expect(buildTimeline(waltz, 60, 'strum').events.some((e) => e.kind === 'click')).toBe(false);
    const clickOnly = buildTimeline(waltz, 60, 'click');
    expect(clickOnly.events.some((e) => e.kind === 'stroke')).toBe(false);
    expect(clickOnly.strokeEvents).toHaveLength(0);
  });

  it('클릭 악센트는 마디 첫 박', () => {
    const clicks = buildTimeline(waltz, 60, 'click').events.filter((e) => e.kind === 'click');
    expect(clicks.map((c) => c.kind === 'click' && c.accent)).toEqual([
      true,
      false,
      false,
      true,
      false,
      false,
    ]);
  });

  it('같은 offset이면 click이 stroke보다 먼저', () => {
    const timeline = buildTimeline(waltz, 60, 'both');
    const atZero = timeline.events.filter((event) => event.offset === 0).map((e) => e.kind);
    expect(atZero).toEqual(['marker', 'click', 'stroke']);
  });

  it('tie 스트로크도 이벤트에 포함된다(하이라이트용, 발음 생략은 엔진 몫)', () => {
    expect(buildTimeline(waltz, 60, 'strum').strokeEvents.map((e) => e.strokeIndex)).toEqual([
      0, 1, 2,
    ]);
  });
});

describe('activeStrokeAt', () => {
  const timeline = buildTimeline(waltz, 60, 'both'); // 스트로크 offset: 0, 1.5, 3

  it('경계 포함, 마지막으로 지난 스트로크', () => {
    expect(activeStrokeAt(timeline, -0.01)).toBe(-1);
    expect(activeStrokeAt(timeline, 0)).toBe(0);
    expect(activeStrokeAt(timeline, 1.49)).toBe(0);
    expect(activeStrokeAt(timeline, 1.5)).toBe(1);
    expect(activeStrokeAt(timeline, 5.9)).toBe(2);
  });
});
