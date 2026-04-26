import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type OrderItemRow = {
  product_id: string;
  unit_price_cents: number;
  products:
    | {
        id: string;
        title: string;
        slug: string;
        file_path: string | null;
      }
    | { id: string; title: string; slug: string; file_path: string | null }[]
    | null;
};

type OrderRow = {
  id: string;
  total_cents: number;
  paid_at: string | null;
  created_at: string;
  customer_email: string;
  order_items: OrderItemRow[];
};

type OrderForView = {
  id: string;
  totalCents: number;
  paidAt: string;
  items: {
    productId: string;
    title: string;
    slug: string;
    signedUrl: string | null;
    isBonus: boolean;
  }[];
};

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  // Fetch all of this user's orders, joined to order_items + products
  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      total_cents,
      paid_at,
      created_at,
      customer_email,
      order_items (
        product_id,
        unit_price_cents,
        products:products (
          id,
          title,
          slug,
          file_path
        )
      )
    `
    )
    .eq("user_id", user.id)
    .eq("status", "paid")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Account orders fetch failed:", error);
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-files";

  // Generate signed URLs using admin client (bypasses RLS — user already verified above)
  const adminSupabase = createAdminClient();
  // Generate signed URLs for every product file across every order
  const enriched: OrderForView[] = await Promise.all(
    ((orders ?? []) as OrderRow[]).map(async (order) => {
      const itemsWithUrls = await Promise.all(
        order.order_items.map(async (item) => {
          const product = Array.isArray(item.products)
            ? item.products[0]
            : item.products;

          let signedUrl: string | null = null;
          if (product?.file_path) {
            const { data: signed } = await adminSupabase.storage
              .from(bucket)
              .createSignedUrl(product.file_path, 60 * 60 * 24);
            signedUrl = signed?.signedUrl ?? null;
          }

          return {
            productId: item.product_id,
            title: product?.title ?? "Untitled product",
            slug: product?.slug ?? "",
            signedUrl,
            // Bonus items are granted by the webhook with unit_price_cents = 0.
            // No real product is sold for $0, so this is a safe & clean marker.
            isBonus: item.unit_price_cents === 0,
          };
        })
      );

      // Sort: paid items first, bonuses at the end (visual priority)
      itemsWithUrls.sort((a, b) => {
        if (a.isBonus === b.isBonus) return 0;
        return a.isBonus ? 1 : -1;
      });

      return {
        id: order.id,
        totalCents: order.total_cents,
        paidAt: order.paid_at ?? order.created_at,
        items: itemsWithUrls,
      };
    })
  );

  return (
    <main className="min-h-[calc(100vh-200px)] px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-2">
            Your account
          </h1>
          <p className="text-navy-600">
            Signed in as <strong className="text-navy-900">{user.email}</strong>
          </p>
        </div>

        {enriched.length === 0 ? (
          <div className="bg-white rounded-2xl border border-navy-100 p-10 shadow-sm text-center">
            <h2 className="text-xl font-bold text-navy-900 mb-2">
              No orders yet
            </h2>
            <p className="text-navy-600 mb-6">
              When you make a purchase, your downloads will live here.
            </p>
            <Link
              href="/"
              className="inline-block bg-navy-900 text-bone-50 font-semibold py-3 px-6 rounded-lg hover:bg-navy-800 transition"
            >
              Browse the marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {enriched.map((order) => {
              const totalDollars = (order.totalCents / 100).toFixed(2);
              const dateLabel = new Date(order.paidAt).toLocaleDateString(
                "en-US",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              );

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-navy-100 p-6 sm:p-8 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4 pb-4 border-b border-navy-100">
                    <div>
                      <p className="text-sm text-navy-500 uppercase tracking-wide font-semibold">
                        Order
                      </p>
                      <p className="font-semibold text-navy-900">
                        #{order.id.slice(0, 8)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-navy-500">{dateLabel}</p>
                      <p className="font-semibold text-navy-900">
                        ${totalDollars}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.productId}
                        className={
                          item.isBonus
                            ? "flex items-center justify-between gap-4 p-3 rounded-lg border border-emerald-300 bg-gradient-to-r from-emerald-50 to-bone-50"
                            : "flex items-center justify-between gap-4 p-3 rounded-lg bg-bone-50"
                        }
                      >
                        <div className="min-w-0">
                          {item.isBonus && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mb-1">
                              🎁 Free bonus
                            </span>
                          )}
                          <p className="font-medium text-navy-900 truncate">
                            {item.title}
                          </p>
                        </div>
                        {item.signedUrl ? (
                          item.isBonus ? (
                            <a
                              href={item.signedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 bg-emerald-600 text-bone-50 font-semibold py-1.5 px-3 rounded-lg hover:bg-emerald-700 transition text-sm"
                            >
                              Download
                            </a>
                          ) : (
                            <a
                              href={item.signedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-electric-600 font-semibold hover:underline text-sm"
                            >
                              Download
                            </a>
                          )
                        ) : (
                          <span className="shrink-0 text-sm text-navy-500 italic">
                            Unavailable
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-navy-100">
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="text-navy-600 font-semibold hover:text-navy-900 transition"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
