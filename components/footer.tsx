import Link from 'next/link';
import { Mail } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-navy-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Link href="/" className="inline-flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="YesBundles" className="h-8 w-auto" />
            </Link>
            <p className="mt-3 text-sm text-navy-600">
              Hand-crafted templates, trackers, and guides, bundled and instant.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-navy-500">Shop</h4>
            <ul className="space-y-2 text-sm text-navy-700">
              <li><Link href="/" className="hover:text-electric-600">All products</Link></li>
              <li><Link href="/?category=career" className="hover:text-electric-600">Career</Link></li>
              <li><Link href="/?category=finance" className="hover:text-electric-600">Finance</Link></li>
              <li><Link href="/?category=travel" className="hover:text-electric-600">Travel</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-navy-500">Company</h4>
            <ul className="space-y-2 text-sm text-navy-700">
              <li><Link href="/about" className="hover:text-electric-600">About</Link></li>
              <li><Link href="/contact" className="hover:text-electric-600">Contact</Link></li>
              <li><a href="mailto:hello@yesbundles.com" className="inline-flex items-center gap-1.5 hover:text-electric-600"><Mail className="h-3.5 w-3.5" />hello@yesbundles.com</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-navy-500">Legal</h4>
            <ul className="space-y-2 text-sm text-navy-700">
              <li><Link href="/terms" className="hover:text-electric-600">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-electric-600">Privacy Policy</Link></li>
              <li><Link href="/refund-policy" className="hover:text-electric-600">Refund Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-navy-100 pt-6 text-xs text-navy-500 sm:flex-row sm:items-center">
          <p>Copyright {year} YesBundles. A Maestro Media Group platform.</p>
          <p>All sales final. Digital downloads, lifetime access.</p>
        </div>
      </div>
    </footer>
  );
}
