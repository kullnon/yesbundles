'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { Category } from '@/lib/types/product';
import { cn } from '@/lib/utils';

type Props = {
  categories: Category[];
};

const GROUP_ORDER = ['Work', 'Money', 'Life'] as const;
const GROUP_META: Record<string, { emoji: string; label: string }> = {
  Work: { emoji: '💼', label: 'Work' },
  Money: { emoji: '💰', label: 'Money' },
  Life: { emoji: '🧘', label: 'Life' },
};

export function CategoryFilter({ categories }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get('category');

  const setCategory = (slug: string | null) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    if (slug) {
      next.set('category', slug);
    } else {
      next.delete('category');
    }
    const qs = next.toString();
    router.push(qs ? `/?${qs}` : '/');
  };

  // Group categories by group_name
  const grouped = categories.reduce<Record<string, Category[]>>((acc, cat) => {
    const g = cat.group_name ?? 'Other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(cat);
    return acc;
  }, {});

  const sortedGroups = [
    ...GROUP_ORDER.filter((g) => grouped[g]),
    ...Object.keys(grouped).filter((g) => !GROUP_ORDER.includes(g as typeof GROUP_ORDER[number])),
  ];

  return (
    <div className="space-y-4">
      <div>
        <button
          onClick={() => setCategory(null)}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
            !active
              ? 'bg-navy-900 text-bone-50 shadow-card'
              : 'bg-white text-navy-700 hover:bg-navy-50'
          )}
        >
          All
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {sortedGroups.map((groupName) => {
          const meta = GROUP_META[groupName] ?? { emoji: '', label: groupName };
          return (
            <div
              key={groupName}
              className="rounded-2xl border border-navy-100 bg-white/60 p-4 shadow-card"
            >
              <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-electric-700">
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {grouped[groupName]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.slug)}
                      className={cn(
                        'rounded-full px-3.5 py-1.5 text-sm font-medium transition-all',
                        active === cat.slug
                          ? 'bg-navy-900 text-bone-50 shadow-card'
                          : 'bg-white text-navy-700 hover:bg-navy-50 border border-navy-100'
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
