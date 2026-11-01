import type { CountingFeel, Difficulty } from './strumTypes';

/** 화면에 보이는 한국어 라벨. 내부 enum 값을 그대로 노출하지 않는다. */
export const difficultyLabel: Record<Difficulty, string> = {
  beginner: '기초',
  intermediate: '중급',
  advanced: '응용',
};

export const countingFeelLabel: Record<CountingFeel, string> = {
  'straight-8': '8비트',
  'straight-16': '16비트',
  swing: '스윙',
  triplet: '셋잇단',
  compound: '겹박자',
};

export const difficultyRank: Record<Difficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};
