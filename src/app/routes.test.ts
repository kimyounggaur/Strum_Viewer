import { describe, expect, it } from 'vitest';
import type { StrumCategoryId } from '../data/strumTypes';
import { buildHash, parseHash, type Route } from './routes';

const validators = {
  isCategoryId: (id: string): id is StrumCategoryId => ['shuffle', 'slow-rock'].includes(id),
  isPatternId: (id: string) => ['shuffle_ex03', 'slow-rock_ex01'].includes(id),
};

describe('parseHash', () => {
  it.each([
    ['', { name: 'home' }],
    ['#', { name: 'home' }],
    ['#/', { name: 'home' }],
    ['#/c/all', { name: 'category', categoryId: 'all' }],
    ['#/c/shuffle', { name: 'category', categoryId: 'shuffle' }],
    ['#/p/shuffle_ex03', { name: 'pattern', patternId: 'shuffle_ex03' }],
  ])('%s', (hash, route) => {
    expect(parseHash(hash, validators).route).toEqual(route);
  });

  it('없는 카테고리·패턴은 홈으로', () => {
    expect(parseHash('#/c/nope', validators).route).toEqual({ name: 'home' });
    expect(parseHash('#/p/nope_ex99', validators).route).toEqual({ name: 'home' });
    expect(parseHash('#/x/y', validators).route).toEqual({ name: 'home' });
  });

  it('쿼리: 한글 검색어, 정렬 검증', () => {
    const { query } = parseHash('#/c/all?q=%EC%8A%AC%EB%A1%9C%EC%9A%B0&sort=recent', validators);
    expect(query).toEqual({ q: '슬로우', sort: 'recent' });
    expect(parseHash('#/?sort=bogus', validators).query).toEqual({});
  });

  it('깨진 인코딩에도 죽지 않는다', () => {
    expect(() => parseHash('#/p/%E0%A4%A', validators)).not.toThrow();
  });
});

describe('buildHash', () => {
  it('기본값은 생략', () => {
    expect(buildHash({ name: 'home' })).toBe('#/');
    expect(buildHash({ name: 'home' }, { q: '  ', sort: 'exercise' })).toBe('#/');
  });

  it('왕복(round-trip)', () => {
    const cases: Array<[Route, { q?: string; sort?: 'recent' }]> = [
      [
        { name: 'category', categoryId: 'slow-rock' },
        { q: '슬로우 락', sort: 'recent' },
      ],
      [{ name: 'pattern', patternId: 'shuffle_ex03' }, {}],
      [{ name: 'category', categoryId: 'all' }, { q: 'ex03' }],
    ];
    for (const [route, query] of cases) {
      expect(parseHash(buildHash(route, query), validators)).toEqual({ route, query });
    }
  });
});
