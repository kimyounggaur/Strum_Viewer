import rawCategories from './categories.json';
import type { CountingFeel, StrumCategory, StrumCategoryId, TimeSignature } from './strumTypes';

/**
 * 카테고리 정의의 원본은 `categories.json` 하나다(빌드 스크립트와 공용).
 * JSON은 타입이 넓게 추론되므로 앱 로드 시 한 번 검증해 좁힌다.
 */
const categoryIds = new Set<StrumCategoryId>([
  'sixteen-beat-variation',
  'three-four',
  'twelve-eight',
  'six-eight',
  'shuffle',
  'slow-gogo',
  'slow-rock',
  'calypso',
  'country',
]);
const timeSignatures = new Set<TimeSignature>(['4/4', '3/4', '12/8', '6/8']);
const countingFeels = new Set<CountingFeel>([
  'straight-8',
  'straight-16',
  'swing',
  'triplet',
  'compound',
]);

function toCategory(raw: (typeof rawCategories)[number]): StrumCategory {
  if (!categoryIds.has(raw.id as StrumCategoryId)) {
    throw new Error(
      `categories.json: 알 수 없는 id "${raw.id}" (strumTypes.ts의 StrumCategoryId에 추가)`,
    );
  }
  if (!timeSignatures.has(raw.timeSignature as TimeSignature)) {
    throw new Error(`categories.json: ${raw.id} 박자표 "${raw.timeSignature}"`);
  }
  if (!countingFeels.has(raw.countingFeel as CountingFeel)) {
    throw new Error(`categories.json: ${raw.id} countingFeel "${raw.countingFeel}"`);
  }
  if (raw.grid.pulseNote !== 'quarter' && raw.grid.pulseNote !== 'dotted-quarter') {
    throw new Error(`categories.json: ${raw.id} pulseNote "${raw.grid.pulseNote}"`);
  }
  return {
    ...raw,
    id: raw.id as StrumCategoryId,
    timeSignature: raw.timeSignature as TimeSignature,
    countingFeel: raw.countingFeel as CountingFeel,
    grid: { beatsPerBar: raw.grid.beatsPerBar, pulseNote: raw.grid.pulseNote },
  };
}

export const strumCategories: StrumCategory[] = rawCategories.map(toCategory);

export const categoryById = Object.fromEntries(
  strumCategories.map((category) => [category.id, category]),
) as Record<StrumCategoryId, StrumCategory>;
