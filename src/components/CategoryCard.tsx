import type { StrumCategory } from '../data/strumTypes';

type CategoryCardProps = {
  category: StrumCategory;
  active: boolean;
  onSelect: (categoryId: StrumCategory['id']) => void;
};

export function CategoryCard({ category, active, onSelect }: CategoryCardProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(category.id)}
      className={[
        'group min-h-44 rounded-lg border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft',
        active ? 'border-transparent' : 'border-slate-200',
      ].join(' ')}
      style={
        active
          ? {
              borderColor: category.color,
              boxShadow: `0 0 0 3px ${category.color}24, 0 12px 35px rgba(15, 23, 42, 0.08)`,
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-500">{category.labelKo}</div>
          <div className="mt-1 text-2xl font-black text-slate-950">{category.shortLabel}</div>
        </div>
        <span
          className="rounded-lg px-3 py-1 text-sm font-black text-white shadow-sm"
          style={{ backgroundColor: category.color }}
        >
          {category.patternCount}
        </span>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">{category.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
          {category.timeSignature}
        </span>
        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
          {category.recommendedBpm.default} BPM
        </span>
        <span
          className="rounded-lg px-2.5 py-1 text-xs font-bold text-white"
          style={{ backgroundColor: category.accentColor }}
        >
          {category.feel}
        </span>
      </div>
    </button>
  );
}
