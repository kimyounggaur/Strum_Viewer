import { countingFeelLabel, difficultyLabel } from '../data/labels';
import type { StrumCategory, StrumPattern } from '../data/strumTypes';

/**
 * 토큰 검색.
 * - 검색어를 공백으로 나누고, 모든 토큰이 맞아야 한다(AND).
 * - 각 토큰은 필드의 "단어 시작"과 맞아야 한다(부분 문자열 아님).
 * - Ex 번호: `ex3`, `ex03`, `ex-3`, `3번`은 해당 Ex 번호만. 숫자 하나(`1`)도 Ex 번호로 본다.
 *   두 자리 이상 숫자(`12`, `16`)는 Ex 번호 + 단어 시작(12/8, 16비트 등) 모두.
 * - 원본 파일명은 검색하지 않는다("POD&전자책용", "Ex 1~4" 같은 공통 문자열이 거의 전부와 맞기 때문).
 */
export function normalize(text: string): string {
  return text.normalize('NFC').toLowerCase().trim();
}

export function tokenize(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

const exPattern = /^(?:ex\s*-?\s*0*(\d+)|0*(\d+)번)$/;
const numberPattern = /^\d+$/;

/** 필드 문자열을 단어로 나눈다. `3/4`, `12/8`은 한 단어로 둔다. */
function wordsOf(fields: string[]): string[] {
  return fields.flatMap((field) => normalize(field).split(/[\s,·()[\]_-]+/)).filter(Boolean);
}

export function searchableWords(pattern: StrumPattern, category: StrumCategory): string[] {
  return wordsOf([
    pattern.displayNo,
    pattern.titleKo,
    pattern.title,
    pattern.timeSignature,
    countingFeelLabel[pattern.countingFeel],
    difficultyLabel[pattern.difficulty],
    category.labelKo,
    category.labelEn,
    category.shortLabel,
    ...pattern.tags,
  ]);
}

function tokenMatches(token: string, pattern: StrumPattern, words: string[]): boolean {
  const ex = exPattern.exec(token);
  if (ex) {
    return pattern.exerciseNo === Number(ex[1] ?? ex[2]);
  }
  if (numberPattern.test(token)) {
    if (pattern.exerciseNo === Number(token)) return true;
    if (token.length < 2) return false;
  }
  return words.some((word) => word.startsWith(token));
}

export function matchesQuery(
  pattern: StrumPattern,
  category: StrumCategory,
  tokens: string[],
): boolean {
  if (tokens.length === 0) return true;
  const words = searchableWords(pattern, category);
  return tokens.every((token) => tokenMatches(token, pattern, words));
}
