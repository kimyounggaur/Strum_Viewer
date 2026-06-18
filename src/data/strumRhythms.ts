import type { Stroke, StrokeDir, StrumRhythm } from './strumTypes';

const straightFourPads = { imageLeftPad: 0.14, imageRightPad: 0.91 };
const widePads = { imageLeftPad: 0.09, imageRightPad: 0.95 };
const compactPads = { imageLeftPad: 0.17, imageRightPad: 0.9 };

// 인쇄된 음표 좌표에 맞춘 재생선 패드 (각 카테고리 PNG의 그리드 기준).
const sixteenPads = { imageLeftPad: 0.222, imageRightPad: 0.951 };
const countryPads = { imageLeftPad: 0.228, imageRightPad: 0.954 };
const slowGogoPads = { imageLeftPad: 0.228, imageRightPad: 0.954 };
const sixEightPads = { imageLeftPad: 0.205, imageRightPad: 0.953 };

// spec 토큰 = "<step><d|u>" (예: "4d" = 4번 스텝 다운, "7u" = 업 스트로크).
// 각 패턴의 스트로크는 해당 악보 PNG의 픽셀 분석으로 추출했다.
function parseSpec(spec: string): Stroke[] {
  return spec
    .trim()
    .split(/\s+/)
    .map((token) => ({
      step: Number(token.slice(0, -1)),
      dir: (token.endsWith('u') ? 'up' : 'down') as StrokeDir,
    }));
}

// 4/4, 16분음표 그리드(straight). 16칸.
function straight16(spec: string, pads = sixteenPads): StrumRhythm {
  return {
    timeSignature: [4, 4],
    pulseNote: 'quarter',
    beatsPerBar: 4,
    subdivision: 4,
    bars: 1,
    feelTiming: 'straight',
    ...pads,
    strokes: parseSpec(spec),
  };
}

// 6/8, 컴파운드(점4분음표 2박 × 16분음표 6분할 = 12칸).
function sixEight(spec: string): StrumRhythm {
  return {
    timeSignature: [6, 8],
    pulseNote: 'dotted-quarter',
    beatsPerBar: 2,
    subdivision: 6,
    bars: 1,
    feelTiming: 'compound',
    ...sixEightPads,
    strokes: parseSpec(spec),
  };
}

export const strumRhythms: Record<string, StrumRhythm> = {
  // 16비트 변형 (ex01~ex12) — 악보 PNG 픽셀 분석으로 전사
  'sixteen-beat-variation_ex01': straight16('0d 4d 7u 9u 10d 12d 14d 15u'),
  'sixteen-beat-variation_ex02': straight16('0d 4d 7u 9u 10d 11u 12d 14d 15u'),
  'sixteen-beat-variation_ex03': straight16('0d 2d 4d 6d 7u 9u 10d 12d 14d 15u'),
  'sixteen-beat-variation_ex04': straight16('0d 2d 4d 6d 7u 9u 10d 11u 12d 14d 15u'),
  'sixteen-beat-variation_ex05': straight16('0d 2d 4d 6d 7u 9u 10d 12d 13u 14d 15u'),
  'sixteen-beat-variation_ex06': straight16('0d 2d 4d 6d 7u 9u 10d 12d 13u 15u'),
  'sixteen-beat-variation_ex07': straight16('0d 3u 4d 5u 6d 9u 10d 12d 14d 15u'),
  'sixteen-beat-variation_ex08': straight16('0d 3u 4d 5u 6d 9u 10d 11u 12d 14d 15u'),
  'sixteen-beat-variation_ex09': straight16('0d 2d 3u 4d 5u 6d 9u 10d 12d 14u 15u'),
  'sixteen-beat-variation_ex10': straight16('0d 2d 3u 4d 5u 6d 9u 10d 12d 13u 15u'),
  'sixteen-beat-variation_ex11': straight16('0d 3u 5u 6d 9u 11u 12d 14d 15u'),
  'sixteen-beat-variation_ex12': straight16('0d 3u 6d 9u 12d 14u 15u'),

  // 칼립소 (ex01~ex03) — 전사 (4/4 16분 그리드)
  'calypso_ex01': straight16('0d 4d 6u 10u 12d'),
  'calypso_ex02': straight16('0d 4d 6u 10u 12d 14u'),
  'calypso_ex03': straight16('0d 2u 4d 6u 10u 12d 14u'),

  // 컨트리 (ex01~ex03) — 전사 (4/4 16분 그리드)
  'country_ex01': straight16('0d 2d 3u 4d 5u 6d 8d 10d 11u 12d 13u 14d', countryPads),
  'country_ex02': straight16('0d 2d 3u 4d 5u 6d 7u 8d 10d 11u 12d 13u 14d 15u', countryPads),
  'country_ex03': straight16('0d 2d 4d 6d 7u 8d 10d 12d 14d 15u', countryPads),

  // 슬로우 고고 (ex01~ex02) — 전사. ex03은 레이아웃/높이가 달라 보류.
  'slow-gogo_ex01': straight16('0d 2d 4u 6d 8d 10d 12u 14d', slowGogoPads),
  'slow-gogo_ex02': straight16('0d 2d 4u 6d 7d 8d 10d 12u 14d', slowGogoPads),

  // 8분의 6박 (ex01~ex08) — 전사 (컴파운드 12칸)
  'six-eight_ex01': sixEight('0d 2d 4d 6d 8d 10d'),
  'six-eight_ex02': sixEight('0d 1u 2d 4d 6d 8d 10d'),
  'six-eight_ex03': sixEight('0d 2d 3u 4d 6d 8d 10d'),
  'six-eight_ex04': sixEight('0d 2d 4d 5u 6d 8d 10d'),
  'six-eight_ex05': sixEight('0d 2d 4d 6d 7u 8d 10d'),
  'six-eight_ex06': sixEight('0d 2d 4d 6d 8d 9u 10d'),
  'six-eight_ex07': sixEight('0d 2d 4d 6d 8d 10d 11u'),
  'six-eight_ex08': sixEight('0d 1u 2d 4d 6d 7u 8d 10d'),

  // --- 아래 4개 카테고리는 아직 임시(placeholder) 리듬. 트리플렛/스윙/2마디 구조라
  //     선형 픽셀 스냅으로는 부정확하여 정밀 전사 대기 중(ex01만 데모용). ---
  'three-four_ex01': {
    timeSignature: [3, 4],
    pulseNote: 'quarter',
    beatsPerBar: 3,
    subdivision: 2,
    bars: 1,
    feelTiming: 'straight',
    ...straightFourPads,
    strokes: [
      { step: 0, dir: 'down', accent: true },
      { step: 2, dir: 'down' },
      { step: 3, dir: 'up' },
      { step: 4, dir: 'down' },
      { step: 5, dir: 'up' },
    ],
  },
  'twelve-eight_ex01': {
    timeSignature: [12, 8],
    pulseNote: 'dotted-quarter',
    beatsPerBar: 4,
    subdivision: 3,
    bars: 1,
    feelTiming: 'compound',
    ...compactPads,
    strokes: Array.from({ length: 12 }, (_, index) => ({
      step: index,
      dir: 'down' as const,
      accent: index % 3 === 0,
    })),
  },
  'shuffle_ex01': {
    timeSignature: [4, 4],
    pulseNote: 'quarter',
    beatsPerBar: 4,
    subdivision: 2,
    bars: 1,
    feelTiming: 'swing',
    swing: 0.65,
    ...widePads,
    strokes: [
      { step: 0, dir: 'down', accent: true },
      { step: 2, dir: 'down' },
      { step: 3, dir: 'up' },
      { step: 4, dir: 'down', accent: true },
      { step: 5, dir: 'up' },
      { step: 6, dir: 'down' },
      { step: 7, dir: 'up' },
    ],
  },
  'slow-rock_ex01': {
    timeSignature: [4, 4],
    pulseNote: 'quarter',
    beatsPerBar: 4,
    subdivision: 3,
    bars: 1,
    feelTiming: 'triplet',
    ...widePads,
    strokes: Array.from({ length: 12 }, (_, index) => ({
      step: index,
      dir: 'down' as const,
      accent: index % 3 === 0,
    })),
  },
};
