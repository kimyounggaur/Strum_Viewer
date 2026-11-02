import { describe, expect, it } from 'vitest';
import rhythmSource from '../rhythms.source.json';
import { extractExerciseNo, parsePngHeader } from './png.mjs';
import * as meta from './rhythmMeta.mjs';

type Rhythm = {
  id: string;
  subdivision: number;
  feelTiming: string;
  bars?: number;
  strokes: Array<{ step: number; dir: string; tie?: boolean }>;
  confidence?: string;
};

const {
  countingFeelOf,
  difficultyFromScore,
  difficultyScore,
  normalizeConfidence,
}: {
  countingFeelOf: (rhythm: Rhythm | null) => string | null;
  difficultyFromScore: (score: number) => string;
  difficultyScore: (rhythm: Rhythm, beatsPerBar: number) => number;
  normalizeConfidence: (raw: unknown) => { confidence: string; source: string };
} = meta;

describe('extractExerciseNo', () => {
  it.each([
    ['16Beat Variation Strum Pattern Ex 1~4(POD&전자책용)EX01.png', 1],
    ['16Beat Variation Strum Pattern Ex 9~12(POD&전자책용)EX12.png', 12],
    ['4분의 3박 스트럼 1(Remake)[POD&전자책]Ex07.png', 7],
    ['슬로우 고고(Slow GoGo) 주법EX03.png', 3],
    ['new pattern Ex-5.png', 5],
  ])('%s → %i', (name, expected) => {
    expect(extractExerciseNo(name)).toBe(expected);
  });

  it('번호가 없으면 오류', () => {
    expect(() => extractExerciseNo('no-number.png')).toThrow();
  });
});

describe('parsePngHeader', () => {
  it('IHDR 폭·높이', () => {
    const buffer = Buffer.alloc(24);
    Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer, 0);
    buffer.writeUInt32BE(2372, 16);
    buffer.writeUInt32BE(577, 20);
    expect(parsePngHeader(buffer)).toEqual({ width: 2372, height: 577 });
  });

  it('PNG가 아니면 오류', () => {
    expect(() => parsePngHeader(Buffer.alloc(24))).toThrow();
  });
});

describe('countingFeelOf', () => {
  it.each([
    [{ feelTiming: 'straight', subdivision: 4 }, 'straight-16'],
    [{ feelTiming: 'straight', subdivision: 2 }, 'straight-8'],
    [{ feelTiming: 'swing', subdivision: 2 }, 'swing'],
    [{ feelTiming: 'triplet', subdivision: 3 }, 'triplet'],
    [{ feelTiming: 'compound', subdivision: 6 }, 'compound'],
  ])('%o → %s', (rhythm, expected) => {
    expect(countingFeelOf({ id: 'x', strokes: [], ...rhythm })).toBe(expected);
  });
});

const source = rhythmSource as Rhythm[];

describe('난이도 자동 점수 — 실제 76개 데이터', () => {
  const beats: Record<string, number> = {
    'sixteen-beat-variation': 4,
    'three-four': 3,
    'twelve-eight': 4,
    'six-eight': 2,
    shuffle: 4,
    'slow-gogo': 4,
    'slow-rock': 4,
    calypso: 4,
    country: 4,
  };
  const levelOf = (id: string) => {
    const rhythm = source.find((entry) => entry.id === id)!;
    return difficultyFromScore(difficultyScore(rhythm, beats[id.replace(/_ex\d+$/, '')]));
  };

  it('Ex 번호와 무관하게 리듬 복잡도로 판정한다', () => {
    // 옛 규칙(Ex≤3 기초)과 반대 사례들
    expect(levelOf('six-eight_ex08')).toBe('beginner'); // 옛 규칙: 중급
    expect(levelOf('shuffle_ex04')).toBe('beginner'); // 4분 다운만, 옛 규칙: 중급
    expect(levelOf('twelve-eight_ex12')).toBe('beginner'); // 옛 규칙: 응용
    expect(levelOf('shuffle_ex03')).toBe('advanced'); // 붙임줄 + 업 비중, 옛 규칙: 기초
  });

  it('분포가 한쪽으로 쏠리지 않는다(각 등급 최소 5개)', () => {
    const counts: Record<string, number> = {};
    for (const rhythm of source) {
      const level = levelOf(rhythm.id);
      counts[level] = (counts[level] ?? 0) + 1;
    }
    expect(counts.beginner).toBeGreaterThanOrEqual(5);
    expect(counts.intermediate).toBeGreaterThanOrEqual(5);
    expect(counts.advanced).toBeGreaterThanOrEqual(5);
  });
});

describe('normalizeConfidence', () => {
  it.each([
    ['verified', { confidence: 'verified', source: 'local' }],
    ['verified-remote', { confidence: 'verified', source: 'remote' }],
    ['low-approx', { confidence: 'approx', source: 'local' }],
    [undefined, { confidence: 'approx', source: 'local' }],
  ])('%s', (raw, expected) => {
    expect(normalizeConfidence(raw)).toEqual(expected);
  });
});
