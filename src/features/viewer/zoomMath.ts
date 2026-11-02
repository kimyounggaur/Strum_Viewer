/**
 * 뷰어 줌 계산 (순수 함수).
 *
 * - scale: CSS px / 이미지 px (렌더링 배율)
 * - display: 사용자에게 보이는 배율. "폭 맞춤 = 100%" 기준.
 *   553px 이미지든 2,372px 이미지든 100%는 항상 "화면 폭에 맞춤"이다.
 */
export const VIEWPORT_PAD = 16;
export const DISPLAY_MIN = 0.5;
export const DISPLAY_MAX = 4;

export type FitMode = 'fit' | 'actual' | 'custom';
export type ZoomState = { mode: FitMode; display: number };

/** 폭(전체화면이면 높이도) 맞춤 배율 */
export function fitScale(
  viewportWidth: number,
  imageWidth: number,
  viewportHeight?: number,
  imageHeight?: number,
): number {
  if (viewportWidth <= 0 || imageWidth <= 0) return 1;
  const byWidth = Math.max(0.01, (viewportWidth - VIEWPORT_PAD * 2) / imageWidth);
  if (viewportHeight && imageHeight && viewportHeight > 0 && imageHeight > 0) {
    const byHeight = Math.max(0.01, (viewportHeight - VIEWPORT_PAD * 2) / imageHeight);
    return Math.min(byWidth, byHeight);
  }
  return byWidth;
}

/** display 범위. "실제 크기"(scale 1)가 항상 범위 안에 들어오도록 넓힌다. */
export function displayLimits(fit: number): { min: number; max: number } {
  const actualDisplay = 1 / fit;
  return {
    min: Math.min(DISPLAY_MIN, actualDisplay),
    max: Math.max(DISPLAY_MAX, actualDisplay),
  };
}

export function clampDisplay(display: number, fit: number): number {
  const { min, max } = displayLimits(fit);
  return Math.min(max, Math.max(min, display));
}

/** 상태 → 렌더링 배율 */
export function scaleFor(state: ZoomState, fit: number): number {
  if (state.mode === 'fit') return fit;
  if (state.mode === 'actual') return 1;
  return clampDisplay(state.display, fit) * fit;
}

/** 상태 → 화면 표시용 배율(1 = 100%) */
export function displayFor(state: ZoomState, fit: number): number {
  return scaleFor(state, fit) / fit;
}

/** 이미지를 가운데 둘 때 왼쪽 여백(px) */
export function leftOffset(viewportWidth: number, contentWidth: number): number {
  return Math.max(VIEWPORT_PAD, (viewportWidth - contentWidth) / 2);
}

/**
 * 앵커 줌: 뷰포트 안 (cx, cy) 지점 아래의 이미지 좌표가 확대/축소 후에도 같은 자리에 오도록
 * 새 스크롤 위치를 계산한다.
 */
export function anchoredScroll(args: {
  scrollLeft: number;
  scrollTop: number;
  cx: number;
  cy: number;
  viewportWidth: number;
  imageWidth: number;
  prevScale: number;
  nextScale: number;
}): { scrollLeft: number; scrollTop: number } {
  const { scrollLeft, scrollTop, cx, cy, viewportWidth, imageWidth, prevScale, nextScale } = args;
  const prevLeft = leftOffset(viewportWidth, imageWidth * prevScale);
  const nextLeft = leftOffset(viewportWidth, imageWidth * nextScale);
  const imageX = (scrollLeft + cx - prevLeft) / prevScale;
  const imageY = (scrollTop + cy - VIEWPORT_PAD) / prevScale;
  return {
    scrollLeft: Math.max(0, imageX * nextScale + nextLeft - cx),
    scrollTop: Math.max(0, imageY * nextScale + VIEWPORT_PAD - cy),
  };
}
