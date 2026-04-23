'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BundleItem } from '@/lib/types/product';

type BundleState = {
  items: BundleItem[];
  isOpen: boolean;
  add: (item: BundleItem) => void;
  remove: (productId: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  has: (productId: string) => boolean;
  count: () => number;
};

export const useBundleStore = create<BundleState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      add: (item) => {
        if (get().has(item.product_id)) return;
        set((state) => ({ items: [...state.items, item] }));
      },
      remove: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.product_id !== productId),
        })),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      has: (productId) => get().items.some((i) => i.product_id === productId),
      count: () => get().items.length,
    }),
    {
      name: 'maestro-bundle',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
