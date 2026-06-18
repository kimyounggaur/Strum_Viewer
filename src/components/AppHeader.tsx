import { Search, X } from 'lucide-react';

type AppHeaderProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onHome: () => void;
};

export function AppHeader({ searchTerm, onSearchTermChange, onHome }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <button
          type="button"
          onClick={onHome}
          className="flex min-w-fit items-center gap-3 text-left"
          aria-label="홈으로 이동"
        >
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-rose-100 text-lg font-black text-rose-500 shadow-sm">
            LD
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-500">Lesson Designer</span>
            <span className="block text-xl font-black tracking-normal text-ink">Strum Viewer</span>
          </span>
        </button>

        <div className="relative w-full lg:max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="카테고리, Ex 번호, 박자, feel, 태그 검색"
            className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-12 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
            type="search"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => onSearchTermChange('')}
              className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="검색어 지우기"
              title="검색어 지우기"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
