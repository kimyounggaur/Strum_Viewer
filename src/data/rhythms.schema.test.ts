import { describe, expect, it } from 'vitest';
import { strumPatterns } from './patterns';
import { strumRhythms } from './strumRhythms';
import type { StrumRhythm } from './strumTypes';

/**
 * 리듬 데이터 스키마 검사.
 * `scripts/rhythms.source.json` → `buildRhythms.mjs` → `strumRhythms.ts` 파이프라인이
 * 깨진 데이터를 조용히 통과시키지 않도록 생성물 자체를 검사한다.
 */
const feelTimings = new Set<StrumRhythm['feelTiming']>([
  'straight',
  'swing',
  'triplet',
  'compound',
]);
const subdivisions = new Set([2, 3, 4, 6]);
const strokeDirs = new Set(['down', 'up', 'rest', 'mute']);

const entries = Object.entries(strumRhythms);

describe('리듬 데이터 스키마', () => {
  it('패턴 id 집합과 리듬 id 집합이 같다', () => {
    const patternIds = new Set(strumPatterns.map((pattern) => pattern.id));
    const rhythmIds = new Set(Object.keys(strumRhythms));
    expect([...patternIds].filter((id) => !rhythmIds.has(id))).toEqual([]);
    expect([...rhythmIds].filter((id) => !patternIds.has(id))).toEqual([]);
    expect(patternIds.size).toBe(76);
  });

  it.each(entries)('%s: 기본 필드', (id, rhythm) => {
    expect(feelTimings.has(rhythm.feelTiming), `${id} feelTiming`).toBe(true);
    expect(subdivisions.has(rhythm.subdivision), `${id} subdivision`).toBe(true);
    expect(rhythm.bars, `${id} bars`).toBeGreaterThanOrEqual(1);
    expect(rhythm.beatsPerBar, `${id} beatsPerBar`).toBeGreaterThanOrEqual(1);
    expect(rhythm.strokes.length, `${id} strokes`).toBeGreaterThanOrEqual(1);
  });

  it.each(entries)('%s: feel/subdivision 조합', (id, rhythm) => {
    if (rhythm.feelTiming === 'compound') {
      expect([3, 6], `${id} compound subdivision`).toContain(rhythm.subdivision);
    }
    if (rhythm.feelTiming === 'swing') {
      expect(rhythm.subdivision, `${id} swing subdivision`).toBe(2);
      expect(rhythm.swing, `${id} swing ratio`).toBeGreaterThanOrEqual(0.5);
      expect(rhythm.swing, `${id} swing ratio`).toBeLessThanOrEqual(0.75);
    } else {
      expect(rhythm.swing, `${id} swing만 swing 필드를 가진다`).toBeUndefined();
    }
  });

  it.each(entries)('%s: 스트로크 step 범위·정렬·중복', (id, rhythm) => {
    const cells = rhythm.beatsPerBar * rhythm.bars * rhythm.subdivision;
    const steps = rhythm.strokes.map((stroke) => stroke.step);
    for (const stroke of rhythm.strokes) {
      expect(stroke.step, `${id} step 범위`).toBeGreaterThanOrEqual(0);
      expect(stroke.step, `${id} step 범위 (cells=${cells})`).toBeLessThan(cells);
      expect(strokeDirs.has(stroke.dir), `${id} dir`).toBe(true);
    }
    expect(
      [...steps].sort((a, b) => a - b),
      `${id} 정렬`,
    ).toEqual(steps);
    expect(new Set(steps).size, `${id} 중복 step`).toBe(steps.length);
  });

  it.each(entries)('%s: 이미지 패딩', (id, rhythm) => {
    expect(rhythm.imageLeftPad, `${id} leftPad`).toBeGreaterThan(0);
    expect(rhythm.imageRightPad, `${id} rightPad`).toBeLessThan(1);
    expect(rhythm.imageLeftPad!, `${id} left < right`).toBeLessThan(rhythm.imageRightPad!);
  });

  it.each(entries)('%s: 박자표가 패턴 메타와 일치', (id, rhythm) => {
    const pattern = strumPatterns.find((candidate) => candidate.id === id);
    expect(pattern, `${id} 패턴 존재`).toBeDefined();
    expect(`${rhythm.timeSignature[0]}/${rhythm.timeSignature[1]}`).toBe(pattern!.timeSignature);
  });
});
