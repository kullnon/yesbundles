'use client';

import Link from 'next/link';
import { BundleButton } from './bundle-button';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-bone-50/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="YesBundles home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="YesBundles"
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        <BundleButton />
      </div>
    </header>
  );
}
