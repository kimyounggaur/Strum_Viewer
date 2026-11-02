import {
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  Scan,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconButton } from '../../components/ui/IconButton';
import type { StrumPattern } from '../../data/strumTypes';
import { StrumSheet } from './StrumSheet';
import {
  anchoredScroll,
  clampDisplay,
  displayFor,
  displayLimits,
  fitScale,
  leftOffset,
  scaleFor,
  VIEWPORT_PAD,
  type ZoomState,
} from './zoomMath';

type PatternImageViewerProps = {
  pattern: StrumPattern;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
};

const prefsKey = 'strum-viewer:viewer';
const ZOOM_STEP = 1.25;
const PLACEHOLDER = '/strums/placeholders/pattern-placeholder.svg';

/** 세션 동안 보기 설정(맞춤 모드·배율)을 유지한다. */
function loadZoom(): ZoomState {
  try {
    const raw = window.sessionStorage.getItem(prefsKey);
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (value && typeof value === 'object') {
      const { mode, display } = value as Record<string, unknown>;
      if (
        (mode === 'fit' || mode === 'actual' || mode === 'custom') &&
        typeof display === 'number' &&
        display > 0
      ) {
        return { mode, display };
      }
    }
  } catch {
    // 저장소 사용 불가
  }
  return { mode: 'fit', display: 1 };
}

function setFullscreenFlag(on: boolean) {
  // PatternDetail 키보드 처리(ESC=뒤로, ←/→)가 전체화면 중에는 양보하도록 표시
  if (on) document.documentElement.dataset.viewerFullscreen = '1';
  else delete document.documentElement.dataset.viewerFullscreen;
}

type Gesture =
  | { type: 'pan'; lastX: number; lastY: number; moved: number }
  | {
      type: 'pinch';
      startDistance: number;
      startDisplay: number;
      lastMidX: number;
      lastMidY: number;
    };

export function PatternImageViewer({
  pattern,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: PatternImageViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<ZoomState>(loadZoom);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [fullscreen, setFullscreen] = useState<'off' | 'native' | 'css'>('off');
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const isFullscreen = fullscreen !== 'off';
  const fit = fitScale(
    viewport.width,
    pattern.width,
    isFullscreen ? viewport.height : undefined,
    isFullscreen ? pattern.height : undefined,
  );
  const scale = scaleFor(zoom, fit);
  const display = displayFor(zoom, fit);
  const limits = displayLimits(fit);
  const contentWidth = Math.max(1, Math.round(pattern.width * scale));
  const contentHeight = Math.max(1, Math.round(pattern.height * scale));
  const contentLeft = leftOffset(viewport.width, contentWidth);
  const contentTop = isFullscreen
    ? Math.max(VIEWPORT_PAD, (viewport.height - contentHeight) / 2)
    : VIEWPORT_PAD;
  const loaded = loadedSrc === pattern.imageSrc;

  // ── 측정 ──
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setViewport({ width: element.clientWidth, height: element.clientHeight });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // ── 보기 설정 저장 ──
  useEffect(() => {
    try {
      window.sessionStorage.setItem(prefsKey, JSON.stringify(zoom));
    } catch {
      // 저장소 사용 불가
    }
  }, [zoom]);

  // ── 앵커 줌: 렌더 직후 목표 스크롤 적용 ──
  const scaleRef = useRef(scale);
  const pendingScroll = useRef<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    scaleRef.current = scale;
    const element = viewportRef.current;
    const target = pendingScroll.current;
    if (element && target) {
      element.scrollLeft = target.left;
      element.scrollTop = target.top;
      pendingScroll.current = null;
    }
  }, [scale]);

  // 패턴이 바뀌면 처음(왼쪽 위)부터 보여준다.
  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (element) {
      element.scrollLeft = 0;
      element.scrollTop = 0;
    }
    pendingScroll.current = null;
  }, [pattern.id]);

  const zoomTo = useCallback(
    (nextDisplay: number, anchorX?: number, anchorY?: number) => {
      const element = viewportRef.current;
      if (!element) return;
      const clamped = clampDisplay(nextDisplay, fit);
      const nextScale = clamped * fit;
      const base = pendingScroll.current ?? {
        left: element.scrollLeft,
        top: element.scrollTop,
      };
      const next = anchoredScroll({
        scrollLeft: base.left,
        scrollTop: base.top,
        cx: anchorX ?? element.clientWidth / 2,
        cy: anchorY ?? element.clientHeight / 2,
        viewportWidth: element.clientWidth,
        imageWidth: pattern.width,
        prevScale: scaleRef.current,
        nextScale,
      });
      pendingScroll.current = { left: next.scrollLeft, top: next.scrollTop };
      scaleRef.current = nextScale;
      setZoom({ mode: 'custom', display: clamped });
    },
    [fit, pattern.width],
  );

  const fitView = useCallback(() => {
    pendingScroll.current = { left: 0, top: 0 };
    setZoom({ mode: 'fit', display: 1 });
  }, []);

  const actualSize = useCallback(() => {
    const element = viewportRef.current;
    if (element) {
      const next = anchoredScroll({
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop,
        cx: element.clientWidth / 2,
        cy: element.clientHeight / 2,
        viewportWidth: element.clientWidth,
        imageWidth: pattern.width,
        prevScale: scaleRef.current,
        nextScale: 1,
      });
      pendingScroll.current = { left: next.scrollLeft, top: next.scrollTop };
    }
    setZoom({ mode: 'actual', display: 1 / fit });
  }, [fit, pattern.width]);

  const toggleZoomAt = useCallback(
    (clientX: number, clientY: number) => {
      const element = viewportRef.current;
      if (!element) return;
      if (display > 1.01) {
        fitView();
        return;
      }
      const rect = element.getBoundingClientRect();
      zoomTo(2, clientX - rect.left, clientY - rect.top);
    },
    [display, fitView, zoomTo],
  );

  // ── 휠: Ctrl/⌘ + 휠만 확대. React onWheel은 passive라 preventDefault가 안 되므로 직접 등록 ──
  const wheelRef = useRef<(event: WheelEvent) => void>(() => {});
  useEffect(() => {
    wheelRef.current = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return; // 일반 휠은 스크롤
      event.preventDefault();
      const element = viewportRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      zoomTo(
        display * Math.exp(-event.deltaY * 0.0015),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    };
  });
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const handler = (event: WheelEvent) => wheelRef.current(event);
    element.addEventListener('wheel', handler, { passive: false });
    return () => element.removeEventListener('wheel', handler);
  }, []);

  // ── 포인터: 한 손가락/마우스 = 팬, 두 손가락 = 핀치(중점 앵커) ──
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef({ time: 0, x: 0, y: 0 });
  /** 터치 더블탭 뒤 브라우저가 합성하는 dblclick을 무시하기 위한 마지막 터치 시각 */
  const lastTouchTime = useRef(0);

  function relativePoint(clientX: number, clientY: number) {
    const rect = viewportRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function beginPinch() {
    const [a, b] = [...pointers.current.values()];
    const mid = relativePoint((a.x + b.x) / 2, (a.y + b.y) / 2);
    gesture.current = {
      type: 'pinch',
      startDistance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      startDisplay: display,
      lastMidX: mid.x,
      lastMidY: mid.y,
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.pointerType === 'touch') lastTouchTime.current = performance.now();
    const element = viewportRef.current;
    if (!element) return;
    element.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      gesture.current = { type: 'pan', lastX: event.clientX, lastY: event.clientY, moved: 0 };
      setDragging(true);
    } else if (pointers.current.size === 2) {
      beginPinch();
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const element = viewportRef.current;
    const current = gesture.current;
    if (!element || !current || !pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (current.type === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = relativePoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomTo((current.startDisplay * distance) / current.startDistance, mid.x, mid.y);
      // 두 손가락을 함께 움직이면 팬
      if (pendingScroll.current) {
        pendingScroll.current.left -= mid.x - current.lastMidX;
        pendingScroll.current.top -= mid.y - current.lastMidY;
      }
      current.lastMidX = mid.x;
      current.lastMidY = mid.y;
      return;
    }

    if (current.type === 'pan') {
      const dx = event.clientX - current.lastX;
      const dy = event.clientY - current.lastY;
      current.lastX = event.clientX;
      current.lastY = event.clientY;
      current.moved += Math.abs(dx) + Math.abs(dy);
      element.scrollLeft -= dx;
      const beforeTop = element.scrollTop;
      element.scrollTop -= dy;
      // 터치: 뷰어가 더 못 움직이면 남은 세로 이동은 페이지 스크롤로 넘긴다.
      const leftover = -dy - (element.scrollTop - beforeTop);
      if (event.pointerType === 'touch' && Math.abs(leftover) > 0.5) {
        window.scrollBy(0, leftover);
      }
    }
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const element = viewportRef.current;
    if (element?.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    const current = gesture.current;
    pointers.current.delete(event.pointerId);

    if (pointers.current.size === 1) {
      const [rest] = [...pointers.current.values()];
      gesture.current = { type: 'pan', lastX: rest.x, lastY: rest.y, moved: 99 };
      return;
    }
    if (pointers.current.size === 0) {
      gesture.current = null;
      setDragging(false);
      // 터치 더블탭 = 확대/맞춤 토글
      if (
        event.type === 'pointerup' &&
        event.pointerType === 'touch' &&
        current?.type === 'pan' &&
        current.moved < 10
      ) {
        const now = performance.now();
        const near =
          Math.hypot(event.clientX - lastTap.current.x, event.clientY - lastTap.current.y) < 30;
        if (now - lastTap.current.time < 300 && near) {
          toggleZoomAt(event.clientX, event.clientY);
          lastTap.current = { time: 0, x: 0, y: 0 };
        } else {
          lastTap.current = { time: now, x: event.clientX, y: event.clientY };
        }
      }
    }
  }

  // ── 전체화면 (지원하지 않는 iPhone Safari는 CSS 고정 레이아웃으로 대체) ──
  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      setFullscreen('off');
      setFullscreenFlag(false);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
      return;
    }
    const container = containerRef.current;
    if (container?.requestFullscreen && document.fullscreenEnabled) {
      container.requestFullscreen().catch(() => {
        setFullscreen('css');
        setFullscreenFlag(true);
      });
    } else {
      setFullscreen('css');
      setFullscreenFlag(true);
    }
  }, [exitFullscreen, isFullscreen]);

  useEffect(() => {
    const handleChange = () => {
      const on = document.fullscreenElement === containerRef.current;
      setFullscreen(on ? 'native' : 'off');
      setFullscreenFlag(on);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      setFullscreenFlag(false);
    };
  }, []);

  // 전체화면 중 키보드: ←/→ 이동, ESC(CSS 모드) 닫기
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && hasPrevious) onPrevious?.();
      else if (event.key === 'ArrowRight' && hasNext) onNext?.();
      else if (event.key === 'Escape' && fullscreen === 'css') exitFullscreen();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [exitFullscreen, fullscreen, hasNext, hasPrevious, isFullscreen, onNext, onPrevious]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomTo(display * ZOOM_STEP);
    } else if (event.key === '-') {
      event.preventDefault();
      zoomTo(display / ZOOM_STEP);
    } else if (event.key === '0') {
      event.preventDefault();
      fitView();
    } else if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      toggleFullscreen();
    }
  }

  return (
    <div
      ref={containerRef}
      className={[
        'min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm',
        isFullscreen ? 'flex h-full flex-col rounded-none border-0' : '',
        fullscreen === 'css' ? 'fixed inset-0 z-50' : '',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
        <IconButton label="폭 맞춤 (0)" active={zoom.mode === 'fit'} onClick={fitView}>
          <MoveHorizontal className="h-4 w-4" aria-hidden="true" />
        </IconButton>
        <IconButton label="실제 크기" active={zoom.mode === 'actual'} onClick={actualSize}>
          <Scan className="h-4 w-4" aria-hidden="true" />
        </IconButton>
        <IconButton
          label="축소 (−)"
          onClick={() => zoomTo(display / ZOOM_STEP)}
          disabled={display <= limits.min + 1e-6}
        >
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </IconButton>
        <IconButton
          label="확대 (+)"
          onClick={() => zoomTo(display * ZOOM_STEP)}
          disabled={display >= limits.max - 1e-6}
        >
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </IconButton>

        <div className="flex min-w-[140px] flex-1 items-center gap-2 sm:max-w-xs">
          <label className="sr-only" htmlFor="zoom-slider">
            확대 비율 (폭 맞춤 = 100%)
          </label>
          <input
            id="zoom-slider"
            type="range"
            min={limits.min}
            max={limits.max}
            step={0.01}
            value={display}
            onChange={(event) => zoomTo(Number(event.target.value))}
            aria-valuetext={`${Math.round(display * 100)}%`}
            className="min-w-0 flex-1 accent-teal-600"
          />
          <span className="w-12 text-right text-sm font-black tabular-nums text-slate-600">
            {Math.round(display * 100)}%
          </span>
        </div>

        <div className="ml-auto flex gap-2">
          {isFullscreen ? (
            <>
              <IconButton label="이전 패턴 (←)" onClick={onPrevious} disabled={!hasPrevious}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </IconButton>
              <IconButton label="다음 패턴 (→)" onClick={onNext} disabled={!hasNext}>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            </>
          ) : null}
          <IconButton
            label={isFullscreen ? '전체화면 닫기 (Esc)' : '전체화면 (F)'}
            onClick={toggleFullscreen}
            active={isFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            )}
          </IconButton>
        </div>
      </div>

      <div
        ref={viewportRef}
        tabIndex={0}
        role="region"
        aria-label={`${pattern.title} 악보 확대 뷰어. 확대 +, 축소 −, 폭 맞춤 0, 전체화면 F, 더블클릭으로 2배`}
        className={[
          'strum-scrollbar relative touch-none overflow-auto bg-slate-50 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400',
          isFullscreen ? 'min-h-0 flex-1' : 'max-h-[70vh] min-h-[96px]',
          dragging ? 'cursor-grabbing select-none' : 'cursor-grab',
          isFullscreen ? '' : 'rounded-b-lg',
        ].join(' ')}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={(event) => {
          // 터치 더블탭은 pointerup에서 이미 처리했다(합성 dblclick 중복 방지).
          if (performance.now() - lastTouchTime.current < 800) return;
          toggleZoomAt(event.clientX, event.clientY);
        }}
        onKeyDown={handleKeyDown}
        onDragStart={(event) => event.preventDefault()}
      >
        <div
          className="relative"
          style={{
            width: Math.max(viewport.width, contentWidth + contentLeft + VIEWPORT_PAD),
            height: isFullscreen
              ? Math.max(viewport.height, contentHeight + contentTop + VIEWPORT_PAD)
              : contentHeight + VIEWPORT_PAD * 2,
            visibility: viewport.width > 0 ? 'visible' : 'hidden',
          }}
        >
          <div
            className={[
              'absolute overflow-hidden bg-white shadow-sm',
              loaded ? '' : 'animate-pulse bg-slate-200',
            ].join(' ')}
            style={{
              left: contentLeft,
              top: contentTop,
              width: contentWidth,
              height: contentHeight,
            }}
          >
            <img
              key={pattern.imageSrc}
              src={pattern.imageSrc}
              alt={`${pattern.title} 스트럼 패턴 악보`}
              width={pattern.width}
              height={pattern.height}
              draggable={false}
              decoding="async"
              fetchPriority="high"
              className={[
                'h-full w-full select-none object-contain transition-opacity duration-150',
                loaded ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
              onLoad={() => setLoadedSrc(pattern.imageSrc)}
              onError={(event) => {
                if (!event.currentTarget.src.endsWith(PLACEHOLDER)) {
                  event.currentTarget.src = PLACEHOLDER;
                }
                setLoadedSrc(pattern.imageSrc);
              }}
            />
            <StrumSheet pattern={pattern} />
          </div>
        </div>
      </div>
    </div>
  );
}
