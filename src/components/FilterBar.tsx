import type { SortMode } from '../data/strumTypes';

type FilterBarProps = {
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  resultCount: number;
};

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: 'exercise', label: 'Ex 순' },
  { value: 'recent', label: '최근 본 순' },
  { value: 'favorites', label: '즐겨찾기 우선' },
  { value: 'difficulty', label: '난이도순' },
];

export function FilterBar({ sortMode, onSortModeChange, resultCount }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-semibold text-slate-600">패턴 {resultCount}개</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label="정렬 방식">
        {sortOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSortModeChange(option.value)}
            className={[
              'rounded-lg border px-3 py-2 text-sm font-semibold transition',
              sortMode === option.value
                ? 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
            ].join(' ')}
            aria-pressed={sortMode === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
