import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function ProductNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <SearchX className="mb-4 h-16 w-16 text-navy-300" strokeWidth={1.5} />
      <h1 className="mb-2 text-2xl font-bold text-navy-900">Product not found</h1>
      <p className="mb-6 text-navy-600">
        This product may have been removed or the link is incorrect.
      </p>
      <Link
        href="/"
        className="rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-bone-50 hover:bg-navy-800"
      >
        Browse all products
      </Link>
    </div>
  );
}
