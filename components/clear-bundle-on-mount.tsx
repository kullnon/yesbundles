'use client';

import { useEffect } from 'react';
import { useBundleStore } from '@/lib/store/bundle-store';

export function ClearBundleOnMount() {
  const clear = useBundleStore((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
