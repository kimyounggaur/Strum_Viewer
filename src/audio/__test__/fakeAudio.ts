import { vi } from 'vitest';
import type { Instrument, Stroke, StrumPattern, StrumRhythm } from '../../data/strumTypes';
import type { Voices } from '../AudioEngine';

/** 시각을 수동으로 올리는 가짜 AudioParam / GainNode / AudioContext. */
class FakeParam {
  value = 1;
  readonly calls: Array<{ method: string; value?: number; time: number }> = [];
  cancelScheduledValues(time: number) {
    this.calls.push({ method: 'cancel', time });
    return this;
  }
  setValueAtTime(value: number, time: number) {
    this.value = value;
    this.calls.push({ method: 'set', value, time });
    return this;
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.calls.push({ method: 'ramp', value, time });
    return this;
  }
  setTargetAtTime(value: number, time: number) {
    this.value = value;
    this.calls.push({ method: 'target', value, time });
    return this;
  }
}

class FakeGain {
  readonly gain = new FakeParam();
  connect<T>(destination: T) {
    return destination;
  }
  disconnect() {}
}

export class FakeAudioContext {
  currentTime = 0;
  state: AudioContextState = 'suspended';
  readonly destination = {};
  readonly gains: FakeGain[] = [];
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  suspend = vi.fn(() => {
    this.state = 'suspended';
    return Promise.resolve();
  });
  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
}

export type FakeNode = { stop: ReturnType<typeof vi.fn>; onended: (() => void) | null };

export type VoiceCall =
  | { kind: 'strum'; time: number; dir: Stroke['dir']; instrument: Instrument; node: FakeNode }
  | { kind: 'click'; time: number; accent: boolean; node: FakeNode };

export function createRecordingVoices() {
  const calls: VoiceCall[] = [];
  const makeNode = (): FakeNode => ({ stop: vi.fn(), onended: null });
  const voices: Voices = {
    strum: (_context, time, stroke, instrument) => {
      if (stroke.tie || stroke.dir === 'rest') return [];
      const node = makeNode();
      calls.push({ kind: 'strum', time, dir: stroke.dir, instrument, node });
      return [node as unknown as AudioScheduledSourceNode];
    },
    click: (_context, time, accent) => {
      const node = makeNode();
      calls.push({ kind: 'click', time, accent, node });
      return [node as unknown as AudioScheduledSourceNode];
    },
  };
  return {
    voices,
    calls,
    strums: () => calls.filter((call) => call.kind === 'strum'),
    clicks: () => calls.filter((call) => call.kind === 'click'),
  };
}

/** 오디오 클럭과 JS 타이머를 함께 5ms씩 진행한다(suspended면 오디오 클럭은 멈춘다). */
export function advance(context: FakeAudioContext, seconds: number) {
  const steps = Math.round(seconds / 0.005);
  for (let i = 0; i < steps; i += 1) {
    if (context.state === 'running') {
      context.currentTime = Number((context.currentTime + 0.005).toFixed(6));
    }
    vi.advanceTimersByTime(5);
  }
}

export function makePattern(
  rhythm: StrumRhythm | undefined,
  overrides: Partial<StrumPattern> = {},
) {
  return {
    id: 'test_ex01',
    categoryId: 'shuffle',
    title: 'Test',
    titleKo: '테스트',
    exerciseNo: 1,
    displayNo: 'Ex01',
    originalFileName: 'test.png',
    imageSrc: '/test.png',
    thumbSrc: '/test.png',
    width: 100,
    height: 20,
    timeSignature: '4/4',
    countingFeel: 'straight-8',
    difficulty: 'beginner',
    difficultySource: 'auto',
    recommendedBpm: { min: 40, max: 200, default: 60 },
    tags: [],
    rhythm,
    ...overrides,
  } satisfies StrumPattern as StrumPattern;
}

/** 4/4, 8분 그리드, 매 박 다운 4개 → 60BPM에서 루프 4초, 스트로크 offset 0·1·2·3초 */
export const quarterDowns: StrumRhythm = {
  timeSignature: [4, 4],
  pulseNote: 'quarter',
  beatsPerBar: 4,
  subdivision: 2,
  bars: 1,
  feelTiming: 'straight',
  strokes: [
    { step: 0, dir: 'down', accent: true },
    { step: 2, dir: 'down' },
    { step: 4, dir: 'down' },
    { step: 6, dir: 'down' },
  ],
};
