import { describe, expect, it } from 'vitest';
import {
  anchoredScroll,
  clampDisplay,
  displayFor,
  displayLimits,
  fitScale,
  leftOffset,
  scaleFor,
  VIEWPORT_PAD,
} from './zoomMath';

describe('fitScale', () => {
  it('360px 폰에서 2,372px 이미지도 폭에 맞춘다 (옛 minZoom 0.2 버그 회귀 방지)', () => {
    const fit = fitScale(358, 2372);
    expect(fit).toBeCloseTo((358 - VIEWPORT_PAD * 2) / 2372, 6);
    expect(fit).toBeLessThan(0.2);
    expect(2372 * fit + VIEWPORT_PAD * 2).toBeLessThanOrEqual(358 + 1e-9);
  });

  it('전체화면에서는 높이도 고려', () => {
    expect(fitScale(1000, 500, 200, 400)).toBeCloseTo((200 - 32) / 400, 6);
  });

  it('잘못된 입력은 1', () => {
    expect(fitScale(0, 100)).toBe(1);
  });
});

describe('display 범위', () => {
  it('기본 50%~400%', () => {
    expect(displayLimits(1)).toEqual({ min: 0.5, max: 4 });
  });

  it('작은 이미지를 넓은 화면에 띄우면 실제 크기(=47%)까지 내려갈 수 있다', () => {
    const fit = fitScale(1200, 553); // ≈2.11
    expect(displayLimits(fit).min).toBeCloseTo(1 / fit, 6);
    expect(clampDisplay(0.1, fit)).toBeCloseTo(1 / fit, 6);
  });

  it('큰 이미지를 폰에서 보면 실제 크기(≈730%)까지 올라갈 수 있다', () => {
    const fit = fitScale(358, 2372);
    expect(displayLimits(fit).max).toBeCloseTo(1 / fit, 6);
  });
});

describe('scaleFor / displayFor', () => {
  const fit = 0.5;
  it('fit = 100%', () => {
    expect(scaleFor({ mode: 'fit', display: 3 }, fit)).toBe(0.5);
    expect(displayFor({ mode: 'fit', display: 3 }, fit)).toBe(1);
  });
  it('actual = scale 1', () => {
    expect(scaleFor({ mode: 'actual', display: 1 }, fit)).toBe(1);
    expect(displayFor({ mode: 'actual', display: 1 }, fit)).toBe(2);
  });
  it('custom은 범위로 자른다', () => {
    expect(displayFor({ mode: 'custom', display: 10 }, fit)).toBe(4);
  });
});

describe('anchoredScroll', () => {
  it('포인터 아래 이미지 지점이 확대 후에도 같은 화면 위치에 온다', () => {
    const viewportWidth = 800;
    const imageWidth = 2000;
    const prevScale = 0.384; // fit
    const nextScale = 0.768; // 2배
    const cx = 300;
    const cy = 50;
    const next = anchoredScroll({
      scrollLeft: 0,
      scrollTop: 0,
      cx,
      cy,
      viewportWidth,
      imageWidth,
      prevScale,
      nextScale,
    });
    const prevImageX = (0 + cx - leftOffset(viewportWidth, imageWidth * prevScale)) / prevScale;
    const nextImageX =
      (next.scrollLeft + cx - leftOffset(viewportWidth, imageWidth * nextScale)) / nextScale;
    expect(nextImageX).toBeCloseTo(prevImageX, 6);
  });
});
