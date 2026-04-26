'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BundleButton } from './bundle-button';

export function Header() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (active) {
        setEmail(user?.email ?? null);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

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

        <div className="flex items-center gap-3 sm:gap-4">
          {!loading && email ? (
            <>
              <Link
                href="/account"
                className="hidden text-sm font-medium text-navy-700 hover:text-navy-900 hover:underline sm:inline-block"
              >
                Account
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-navy-600 hover:text-navy-900 hover:underline"
              >
                Sign out
              </button>
            </>
          ) : !loading ? (
            <Link
              href="/login"
              className="text-sm font-medium text-navy-700 hover:text-navy-900 hover:underline"
            >
              Sign in
            </Link>
          ) : null}

          <BundleButton />
        </div>
      </div>
    </header>
  );
}
