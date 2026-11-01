import { describe, expect, it } from 'vitest';
import type { StrumRhythm } from '../data/strumTypes';
import {
  barCount,
  barDuration,
  cellsInBar,
  cellsInLoop,
  formatBeatLabels,
  loopBeats,
  loopDuration,
  progressToStep,
  secPerBeat,
  stepToTime,
  strokeXNorm,
} from './rhythm';

// scripts/testRhythm.mjs(삭제됨)의 검증을 Vitest로 이식한 것.

const bpm = 90; // 한 박 = 0.6667초

const twoBarWaltz: StrumRhythm = {
  timeSignature: [3, 4],
  pulseNote: 'quarter',
  beatsPerBar: 3,
  subdivision: 2,
  bars: 2,
  feelTiming: 'straight',
  imageLeftPad: 0.2,
  imageRightPad: 0.88,
  strokes: [
    { step: 0, dir: 'down' },
    { step: 6, dir: 'down' },
    { step: 10, dir: 'up' },
  ],
};

const tripletWaltz: StrumRhythm = {
  timeSignature: [3, 4],
  pulseNote: 'quarter',
  beatsPerBar: 3,
  subdivision: 3,
  bars: 1,
  feelTiming: 'triplet',
  imageLeftPad: 0.17,
  imageRightPad: 0.9,
  strokes: [],
};

const sixteenth: StrumRhythm = {
  timeSignature: [4, 4],
  pulseNote: 'quarter',
  beatsPerBar: 4,
  subdivision: 4,
  bars: 1,
  feelTiming: 'straight',
  strokes: [],
};

const swing: StrumRhythm = {
  timeSignature: [4, 4],
  pulseNote: 'quarter',
  beatsPerBar: 4,
  subdivision: 2,
  bars: 1,
  feelTiming: 'swing',
  swing: 0.65,
  strokes: [],
};

const compoundSix: StrumRhythm = {
  timeSignature: [6, 8],
  pulseNote: 'dotted-quarter',
  beatsPerBar: 2,
  subdivision: 6,
  bars: 1,
  feelTiming: 'compound',
  strokes: [],
};

describe('기본 시간 계산', () => {
  it('secPerBeat', () => {
    expect(secPerBeat(60)).toBe(1);
    expect(secPerBeat(120)).toBe(0.5);
  });

  it('6/8 76BPM 한 마디는 점4분 2박 = 1.5789초', () => {
    const rhythm: StrumRhythm = { ...compoundSix, subdivision: 3 };
    expect(barDuration(rhythm, 76)).toBeCloseTo(1.5789, 3);
  });
});

describe('2마디 3/4 (8분음표 그리드)', () => {
  it('루프 박·길이·칸 수', () => {
    expect(loopBeats(twoBarWaltz)).toBe(6);
    expect(loopDuration(twoBarWaltz, bpm)).toBeCloseTo(6 * (60 / 90), 9);
    expect(cellsInLoop(twoBarWaltz)).toBe(12);
  });

  it('step 6은 둘째 마디 첫 박', () => {
    expect(stepToTime(6, twoBarWaltz, bpm)).toBeCloseTo(3 * (60 / 90), 9);
  });

  it('strokeXNorm은 pads 사이를 step 비율로 보간', () => {
    expect(strokeXNorm({ step: 10, dir: 'up' }, twoBarWaltz)).toBeCloseTo(
      0.2 + (0.88 - 0.2) * (10 / 11),
      9,
    );
  });

  it('박 라벨은 마디마다 1부터 다시 센다', () => {
    const labels = formatBeatLabels(twoBarWaltz);
    expect(labels).toHaveLength(12);
    expect(labels.filter((label) => label === '1')).toHaveLength(2);
    expect(labels.slice(0, 6)).toEqual(['1', '&', '2', '&', '3', '&']);
  });
});

describe('1마디 셋잇단 3/4', () => {
  it('루프 박·칸 수·길이', () => {
    expect(loopBeats(tripletWaltz)).toBe(3);
    expect(cellsInLoop(tripletWaltz)).toBe(9);
    expect(loopDuration(tripletWaltz, bpm)).toBeCloseTo(3 * (60 / 90), 9);
  });

  it('라벨은 1 & a', () => {
    expect(formatBeatLabels(tripletWaltz).slice(0, 3)).toEqual(['1', '&', 'a']);
  });
});

describe('bars 생략(레거시 1마디) 호환', () => {
  it('barCount 기본 1, loop == bar', () => {
    const legacy = { ...sixteenth, bars: undefined } as unknown as StrumRhythm;
    expect(barCount(legacy)).toBe(1);
    expect(loopBeats(legacy)).toBe(4);
    expect(loopDuration(legacy, bpm)).toBeCloseTo(barDuration(legacy, bpm), 9);
    expect(cellsInLoop(legacy)).toBe(cellsInBar(legacy));
  });
});

describe('스윙 타이밍', () => {
  it('오프비트는 swing 비율만큼 늦고 온비트는 정박', () => {
    expect(stepToTime(1, swing, bpm)).toBeCloseTo((60 / 90) * 0.65, 9);
    expect(stepToTime(2, swing, bpm)).toBeCloseTo(60 / 90, 9);
  });

  it('swing 값은 0.5~0.75로 clamp', () => {
    expect(stepToTime(1, { ...swing, swing: 0.9 }, bpm)).toBeCloseTo((60 / 90) * 0.75, 9);
    expect(stepToTime(1, { ...swing, swing: 0.1 }, bpm)).toBeCloseTo((60 / 90) * 0.5, 9);
  });
});

describe('겹박자 16분 그리드(6/8, subdivision 6)', () => {
  it('라벨은 8분음표 펄스(짝수 칸)에만 표시', () => {
    expect(formatBeatLabels(compoundSix)).toEqual([
      '1',
      '',
      '&',
      '',
      'a',
      '',
      '2',
      '',
      '&',
      '',
      'a',
      '',
    ]);
  });

  it('stepToTime은 균등 분할', () => {
    expect(stepToTime(3, compoundSix, 60)).toBeCloseTo(0.5, 9);
  });
});

describe('progressToStep', () => {
  it('진행도 0은 step 0, 진행도 1은 마지막 칸', () => {
    expect(progressToStep(0, sixteenth)).toBe(0);
    expect(progressToStep(1, sixteenth)).toBe(15);
    expect(progressToStep(0.5, sixteenth)).toBe(8);
  });
});
