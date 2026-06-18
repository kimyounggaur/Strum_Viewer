import { strumCategories } from '../data/strumCategories';
import type { StrumCategoryId } from '../data/strumTypes';
import { CategoryCard } from './CategoryCard';

type CategorySelectorProps = {
  selectedCategoryId: StrumCategoryId | 'all';
  onSelect: (categoryId: StrumCategoryId) => void;
};

export function CategorySelector({ selectedCategoryId, onSelect }: CategorySelectorProps) {
  return (
    <section aria-labelledby="category-heading" className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 id="category-heading" className="text-2xl font-black text-ink sm:text-3xl">
            스트럼 카테고리
          </h1>
          <p className="mt-1 text-sm text-slate-500">9개 유형, 76개 원본 PNG 패턴</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {strumCategories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            active={selectedCategoryId === category.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
