import { useEffect, useRef } from 'react';
import { patternCountByCategory, strumPatterns } from '../../data/patterns';
import { strumCategories } from '../../data/strumCategories';
import type { StrumCategoryId } from '../../data/strumTypes';

type CategoryChipsProps = {
  selectedCategoryId: StrumCategoryId | 'all';
  onSelect: (categoryId: StrumCategoryId | 'all') => void;
};

/** 목록 화면용 한 줄 카테고리 선택(가로 스크롤). 큰 카드는 홈에서만 보여준다. */
export function CategoryChips({ selectedCategoryId, onSelect }: CategoryChipsProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // 선택된 칩이 줄 밖에 있으면 가로로만 스크롤한다(페이지 세로 스크롤은 건드리지 않음).
  useEffect(() => {
    const row = rowRef.current;
    const chip = activeRef.current;
    if (!row || !chip) return;
    const left = chip.offsetLeft; // row가 relative라 offsetParent = row
    if (left < row.scrollLeft || left + chip.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = Math.max(0, left - 16);
    }
  }, [selectedCategoryId]);

  const chips: Array<{
    id: StrumCategoryId | 'all';
    label: string;
    count: number;
    color?: string;
  }> = [
    { id: 'all', label: '전체', count: strumPatterns.length },
    ...strumCategories.map((category) => ({
      id: category.id,
      label: category.labelKo,
      count: patternCountByCategory[category.id] ?? 0,
      color: category.color,
    })),
  ];

  return (
    <nav aria-label="스트럼 카테고리" className="-mx-4 sm:mx-0">
      <div
        ref={rowRef}
        className="strum-scrollbar relative flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0"
      >
        {chips.map((chip) => {
          const active = chip.id === selectedCategoryId;
          return (
            <button
              key={chip.id}
              ref={active ? activeRef : undefined}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(chip.id)}
              className={[
                'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition',
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
              ].join(' ')}
            >
              {chip.color ? (
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: chip.color }}
                  aria-hidden="true"
                />
              ) : null}
              {chip.label}
              <span className={active ? 'text-slate-300' : 'text-slate-500'}>{chip.count}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
