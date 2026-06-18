import { Download, Expand, Maximize2, MoveHorizontal, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StrumPattern } from '../data/strumTypes';
import { IconButton } from './IconButton';
import { StrumSheet } from './StrumSheet';

type FitMode = 'fit-width' | 'fit-height' | 'actual' | 'custom';

type PatternImageViewerProps = {
  pattern: StrumPattern;
  progress: number;
  activeStrokeIndex: number;
  isPlaying: boolean;
};

const minZoom = 0.2;
const maxZoom = 3;

export function PatternImageViewer({
  pattern,
  progress,
  activeStrokeIndex,
  isPlaying,
}: PatternImageViewerProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<FitMode>('fit-width');
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const displaySize = useMemo(
    () => ({
      width: Math.max(1, Math.round(pattern.width * zoom)),
      height: Math.max(1, Math.round(pattern.height * zoom)),
    }),
    [pattern.height, pattern.width, zoom],
  );

  const clampZoom = useCallback((value: number) => Math.min(maxZoom, Math.max(minZoom, value)), []);

  const applyFit = useCallback(
    (mode: FitMode) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const widthScale = (viewport.clientWidth - 32) / pattern.width;
      const heightScale = (viewport.clientHeight - 32) / pattern.height;

      if (mode === 'fit-width') {
        setZoom(clampZoom(widthScale));
      } else if (mode === 'fit-height') {
        setZoom(clampZoom(heightScale));
      } else if (mode === 'actual') {
        setZoom(1);
      }

      setFitMode(mode);
    },
    [clampZoom, pattern.height, pattern.width],
  );

  useEffect(() => {
    const id = window.setTimeout(() => applyFit('fit-width'), 0);
    return () => window.clearTimeout(id);
  }, [applyFit, pattern.id]);

  useEffect(() => {
    const handleResize = () => {
      if (fitMode !== 'custom') {
        applyFit(fitMode);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [applyFit, fitMode]);

  function updateZoom(nextZoom: number) {
    setFitMode('custom');
    setZoom(clampZoom(nextZoom));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.setPointerCapture(event.pointerId);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
    setIsDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;
    if (!viewport || !isDragging) return;

    const deltaX = event.clientX - dragRef.current.x;
    const deltaY = event.clientY - dragRef.current.y;
    viewport.scrollLeft = dragRef.current.scrollLeft - deltaX;
    viewport.scrollTop = dragRef.current.scrollTop - deltaY;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    viewportRef.current?.releasePointerCapture(event.pointerId);
    setIsDragging(false);
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && document.activeElement !== viewportRef.current) {
      return;
    }

    event.preventDefault();
    updateZoom(zoom + (event.deltaY < 0 ? 0.08 : -0.08));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      updateZoom(zoom + 0.1);
    } else if (event.key === '-') {
      event.preventDefault();
      updateZoom(zoom - 0.1);
    } else if (event.key === '0') {
      event.preventDefault();
      applyFit('fit-width');
    }
  }

  function openFullscreen() {
    void viewportRef.current?.requestFullscreen();
  }

  function downloadImage() {
    const link = document.createElement('a');
    link.href = pattern.imageSrc;
    link.download = `${pattern.id}.png`;
    link.click();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <IconButton label="폭 맞춤" active={fitMode === 'fit-width'} onClick={() => applyFit('fit-width')}>
            <MoveHorizontal className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton label="높이 맞춤" active={fitMode === 'fit-height'} onClick={() => applyFit('fit-height')}>
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton label="실제 크기" active={fitMode === 'actual'} onClick={() => applyFit('actual')}>
            <Expand className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton label="축소" onClick={() => updateZoom(zoom - 0.1)}>
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton label="확대" onClick={() => updateZoom(zoom + 0.1)}>
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton label="보기 초기화" onClick={() => applyFit('fit-width')}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3 lg:max-w-xs">
          <label className="sr-only" htmlFor="zoom-slider">
            확대 비율
          </label>
          <input
            id="zoom-slider"
            type="range"
            min={minZoom}
            max={maxZoom}
            step={0.05}
            value={zoom}
            onChange={(event) => updateZoom(Number(event.target.value))}
            className="min-w-0 flex-1 accent-teal-600"
          />
          <span className="w-14 text-right text-sm font-black text-slate-600">{Math.round(zoom * 100)}%</span>
          <IconButton label="전체화면" onClick={openFullscreen}>
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton label="이미지 다운로드" onClick={downloadImage}>
            <Download className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div
        ref={viewportRef}
        tabIndex={0}
        role="region"
        aria-label={`${pattern.title} 악보 확대 뷰어`}
        className={[
          'strum-scrollbar h-[54vh] min-h-[320px] overflow-auto bg-slate-50 p-4 outline-none lg:h-[68vh]',
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab',
        ].join(' ')}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      >
        <div
          className="relative mx-auto bg-white shadow-sm"
          style={{
            width: `${displaySize.width}px`,
            height: `${displaySize.height}px`,
          }}
        >
          <img
            src={pattern.imageSrc}
            alt={`${pattern.title} 스트럼 패턴 악보`}
            draggable={false}
            className="h-full w-full select-none object-contain"
            onError={(event) => {
              event.currentTarget.src = '/strums/placeholders/pattern-placeholder.svg';
            }}
          />
          <StrumSheet
            pattern={pattern}
            progress={progress}
            activeStrokeIndex={activeStrokeIndex}
            isPlaying={isPlaying}
          />
        </div>
      </div>
    </div>
  );
}
