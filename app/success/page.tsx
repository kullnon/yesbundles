import Link from "next/link";
import { redirect } from "next/navigation";
import { ClearBundleOnMount } from "@/components/clear-bundle-on-mount";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ session_id?: string }>;

type DownloadItem = {
  productId: string;
  title: string;
  signedUrl: string | null;
  expiresAt: string;
  isBonus: boolean;
};

async function loadOrderForSession(sessionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "auth" as const };
  }

  // Use admin client for the order lookup — page verifies user_id ownership manually below.
  // Avoids RLS race conditions on just-written rows from the Stripe webhook.
  const adminSupabase = createAdminClient();

  const { data: order, error: orderError } = await adminSupabase
    .from("orders")
    .select("id, total_cents, customer_email, paid_at, user_id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (orderError) {
    console.error("Order lookup error:", orderError);
    return { error: "lookup" as const };
  }

  if (!order) {
    // Webhook may not have processed yet — let user retry
    return { error: "pending" as const };
  }

  if (order.user_id !== user.id) {
    return { error: "forbidden" as const };
  }

  // Fetch order_items joined with products for title + file_path
  const { data: items, error: itemsError } = await adminSupabase
    .from("order_items")
    .select(
      `
      product_id,
      unit_price_cents,
      products:products (
        id,
        title,
        file_path
      )
    `
    )
    .eq("order_id", order.id);

  if (itemsError || !items) {
    console.error("Items lookup error:", itemsError);
    return { error: "items" as const };
  }

  // Fetch the download tokens for this order
  const { data: tokens } = await adminSupabase
    .from("download_tokens")
    .select("product_id, expires_at")
    .eq("order_id", order.id);

  const tokenByProduct = new Map(
    (tokens ?? []).map((t) => [t.product_id, t.expires_at])
  );

  // Generate signed URLs for each product file
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-files";
  const downloads: DownloadItem[] = await Promise.all(
    items.map(async (item) => {
      const product = Array.isArray(item.products)
        ? item.products[0]
        : item.products;
      const filePath = product?.file_path;
      const expiresAt = tokenByProduct.get(item.product_id) ?? "";

      let signedUrl: string | null = null;
      if (filePath) {
        const { data: signed } = await adminSupabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 60 * 60 * 24); // 24 hours
        signedUrl = signed?.signedUrl ?? null;
      }

      return {
        productId: item.product_id,
        title: product?.title ?? "Untitled product",
        signedUrl,
        expiresAt,
        // Items granted by the webhook bonus block have unit_price_cents = 0.
        // No real product is sold for $0, so this is a safe & clean marker.
        isBonus: item.unit_price_cents === 0,
      };
    })
  );

  // Sort: paid items first, bonus items at the end (visual priority)
  downloads.sort((a, b) => {
    if (a.isBonus === b.isBonus) return 0;
    return a.isBonus ? 1 : -1;
  });

  return { order, downloads };
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sessionId = params.session_id;

  if (!sessionId) {
    redirect("/");
  }

  const result = await loadOrderForSession(sessionId);

  if ("error" in result) {
    if (result.error === "auth") {
      redirect(`/login?next=/success?session_id=${sessionId}`);
    }

    if (result.error === "pending") {
      return (
        <main className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-xl text-center">
            <div className="bg-white rounded-2xl border border-navy-100 p-10 shadow-sm">
              <h1 className="text-3xl font-bold text-navy-900 mb-3">
                Processing your order…
              </h1>
              <p className="text-navy-600 mb-6">
                Stripe is finalizing your payment. This usually takes a few
                seconds. Refresh the page in a moment.
              </p>
              <Link
                href={`/success?session_id=${sessionId}`}
                className="shrink-0 bg-navy-900 text-bone-50 font-semibold py-2 px-4 rounded-lg hover:bg-navy-800 transition"
              >
                Refresh
              </Link>
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl text-center">
          <div className="bg-white rounded-2xl border border-navy-100 p-10 shadow-sm">
            <h1 className="text-3xl font-bold text-navy-900 mb-3">
              We couldn&apos;t load your order
            </h1>
            <p className="text-navy-600 mb-6">
              Your payment may have succeeded. Check your account page for your
              downloads.
            </p>
            <Link
              href="/account"
              className="inline-block bg-navy-900 text-bone-50 font-semibold py-3 px-6 rounded-lg hover:bg-navy-800 transition"
            >
              Go to my account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { order, downloads } = result;
  const totalDollars = (order.total_cents / 100).toFixed(2);

  return (
    <main className="min-h-[calc(100vh-200px)] px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-navy-100 p-8 sm:p-10 shadow-sm">
          <div className="mb-8">
            <ClearBundleOnMount />
            <p className="text-electric-600 font-semibold text-sm uppercase tracking-wide mb-2">
              Payment successful
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-3">
              Thanks for your order
            </h1>
            <p className="text-navy-600">
              We sent a receipt to{" "}
              <strong className="text-navy-900">{order.customer_email}</strong>.
              Your downloads are below — links are valid for 24 hours. You can
              re-download anytime from{" "}
              <Link href="/account" className="text-electric-600 font-semibold hover:underline">
                your account
              </Link>
              .
            </p>
          </div>

          <div className="border-t border-navy-100 pt-6 mb-8">
            <div className="flex justify-between text-sm text-navy-600 mb-2">
              <span>Order total</span>
              <span className="font-semibold text-navy-900">${totalDollars}</span>
            </div>
            <div className="flex justify-between text-sm text-navy-600">
              <span>Items</span>
              <span className="font-semibold text-navy-900">
                {downloads.length}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-navy-900 mb-2">
              Your downloads
            </h2>
            {downloads.map((d) => (
              <div
                key={d.productId}
                className={
                  d.isBonus
                    ? "flex items-center justify-between gap-4 p-4 rounded-lg border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-bone-50 relative"
                    : "flex items-center justify-between gap-4 p-4 rounded-lg border border-navy-100 bg-bone-50"
                }
              >
                <div className="min-w-0">
                  {d.isBonus && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        🎁 Free bonus
                      </span>
                    </div>
                  )}
                  <p className="font-semibold text-navy-900 truncate">
                    {d.title}
                  </p>
                  {d.isBonus && (
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Included free with your 7-item bundle
                    </p>
                  )}
                </div>
                {d.signedUrl ? (
                  <a
                    href={d.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      d.isBonus
                        ? "shrink-0 bg-emerald-600 text-bone-50 font-semibold py-2 px-4 rounded-lg hover:bg-emerald-700 transition"
                        : "shrink-0 bg-navy-900 text-bone-50 font-semibold py-2 px-4 rounded-lg hover:bg-navy-800 transition"
                    }
                  >
                    Download
                  </a>
                ) : (
                  <span className="shrink-0 text-sm text-navy-500 italic">
                    Unavailable
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-navy-100">
            <Link
              href="/"
              className="text-electric-600 font-semibold hover:underline"
            >
              ← Back to marketplace
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
