"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, CreditCard } from "lucide-react";
import { useBundleStore } from "@/lib/store/bundle-store";
import { BundleSummary } from "@/components/bundle-summary";
import { createClient } from "@/lib/supabase/client";

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = useBundleStore((s) => s.items);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSignedIn(!!user);
      setAuthChecked(true);
    });
  }, [supabase]);

  const handleCheckout = async () => {
    setError(null);
    setLoading(true);

    try {
      const productIds = items.map((i) => i.product_id);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Checkout failed.");
        setLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Could not start checkout.");
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="animate-pulse text-navy-600">Loading your bundle…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Keep shopping
      </Link>

      <h1 className="mb-2 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
        Checkout
      </h1>
      <p className="mb-8 text-navy-600">Review your bundle before payment.</p>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-card">
          <p className="mb-4 text-navy-700">Your bundle is empty.</p>
          <Link
            href="/"
            className="inline-block rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-bone-50 hover:bg-navy-800"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <ul className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
              {items.map((item) => (
                <li
                  key={item.product_id}
                  className="flex items-center justify-between border-b border-navy-100 pb-3 last:border-0 last:pb-0"
                >
                  <span className="font-medium text-navy-900">{item.title}</span>
                  <span className="text-navy-600">
                    ${(item.price_cents / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-2xl bg-white p-5 shadow-card h-fit">
            <BundleSummary />

            {!signedIn && authChecked && (
              <div className="mt-4 rounded-lg bg-electric-50 p-3 text-xs text-navy-700">
                You'll need an account to complete checkout and access your downloads.
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={
                signedIn
                  ? handleCheckout
                  : () => router.push("/login?next=/checkout")
              }
              disabled={loading || !authChecked}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-navy-900 px-5 py-3 text-sm font-semibold text-bone-50 hover:bg-navy-800 disabled:bg-navy-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                "Redirecting to Stripe…"
              ) : signedIn ? (
                <>
                  <CreditCard className="h-4 w-4" />
                  Pay with Card
                </>
              ) : (
                "Sign in to continue"
              )}
            </button>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-navy-500">
              <Lock className="h-3 w-3" />
              Secure checkout powered by Stripe
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}