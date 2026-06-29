import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

// Bonus product configuration
// Granted automatically when a buyer purchases 7+ items in a single order.
// Currently is_active=false in the products table, but admin client reads
// bypass that, and download_tokens / order_items don't care about is_active.
const BONUS_PRODUCT_SLUG = "passive-income-engine";
const BONUS_THRESHOLD = 7;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature header." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json(
      { error: `Signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // ──────────────────────────────────────────────────────────────────
  // Branch: Pro mini-app standalone purchase (product_type=app_standalone)
  // Grants an app_entitlements row instead of download tokens. This MUST run
  // before the download-token path below so we never try to read product_ids
  // (apps aren't rows in the `products` table).
  // ──────────────────────────────────────────────────────────────────
  if (session.metadata?.product_type === "app_standalone") {
    return handleAppStandalone(session);
  }

  const userId = session.metadata?.user_id;
  const productIdsRaw = session.metadata?.product_ids;
  const subtotalCentsRaw = session.metadata?.subtotal_cents;
  const discountCentsRaw = session.metadata?.discount_cents;
  const totalCentsRaw = session.metadata?.total_cents;
  const bundleRuleIdRaw = session.metadata?.bundle_rule_id;

  if (!userId || !productIdsRaw || !totalCentsRaw) {
    console.error("Webhook missing required metadata", session.metadata);
    return NextResponse.json(
      { error: "Order metadata incomplete." },
      { status: 400 }
    );
  }

  const productIds = productIdsRaw.split(",").filter(Boolean);
  const subtotalCents = parseInt(subtotalCentsRaw ?? "0", 10);
  const discountCents = parseInt(discountCentsRaw ?? "0", 10);
  const totalCents = parseInt(totalCentsRaw, 10);
  const bundleRuleId = bundleRuleIdRaw && bundleRuleIdRaw.length > 0 ? bundleRuleIdRaw : null;
  const customerEmail =
    session.customer_email ?? session.customer_details?.email ?? null;

  if (!customerEmail) {
    console.error("Webhook missing customer email");
    return NextResponse.json(
      { error: "Customer email is required." },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Idempotency check — has this session already been processed?
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existing) {
    console.log(`Order for session ${session.id} already exists. Skipping.`);
    return NextResponse.json({ received: true, idempotent: true });
  }

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      status: "paid",
      subtotal_cents: subtotalCents,
      discount_cents: discountCents,
      total_cents: totalCents,
      bundle_rule_id: bundleRuleId,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent as string,
      customer_email: customerEmail,
      paid_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("Failed to insert order:", orderError);
    return NextResponse.json(
      { error: "Failed to record order." },
      { status: 500 }
    );
  }

  // Fetch products to populate order_items at unit price
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, price_cents")
    .in("id", productIds);

  if (productsError || !products) {
    console.error("Failed to fetch products for order_items:", productsError);
    return NextResponse.json(
      { error: "Failed to fetch products." },
      { status: 500 }
    );
  }

  // order_items rows
  const orderItemsRows = products.map((p) => ({
    order_id: order.id,
    product_id: p.id,
    unit_price_cents: p.price_cents,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItemsRows);

  if (itemsError) {
    console.error("Failed to insert order_items:", itemsError);
    return NextResponse.json(
      { error: "Failed to record order items." },
      { status: 500 }
    );
  }

  // Generate download tokens (24h expiry)
  // The token IS the row's UUID id — no separate token column
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const downloadTokens = products.map((p) => ({
    order_id: order.id,
    product_id: p.id,
    user_id: userId,
    expires_at: expiresAt,
  }));

  const { error: tokensError } = await supabase
    .from("download_tokens")
    .insert(downloadTokens);

  if (tokensError) {
    console.error("Failed to insert download_tokens:", tokensError);
    // Don't return 500 — order succeeded; tokens can be regenerated from /account
  }

  // ──────────────────────────────────────────────────────────────────
  // Bonus product auto-grant
  // When productIds.length >= BONUS_THRESHOLD, grant the bonus product
  // by inserting a $0 order_items row + a download_tokens row.
  // Failures here are logged but do NOT fail the webhook — the paid
  // order is already recorded successfully.
  // ──────────────────────────────────────────────────────────────────
  if (productIds.length >= BONUS_THRESHOLD) {
    try {
      const { data: bonusProduct, error: bonusFetchError } = await supabase
        .from("products")
        .select("id")
        .eq("slug", BONUS_PRODUCT_SLUG)
        .maybeSingle();

      if (bonusFetchError) {
        console.error("Bonus: failed to fetch bonus product:", bonusFetchError);
      } else if (!bonusProduct) {
        console.error(
          `Bonus: product with slug "${BONUS_PRODUCT_SLUG}" not found. ` +
            `Skipping bonus grant for order ${order.id}.`
        );
      } else {
        // Guard against double-granting (e.g., webhook retry edge case)
        const { data: existingBonusItem } = await supabase
          .from("order_items")
          .select("id")
          .eq("order_id", order.id)
          .eq("product_id", bonusProduct.id)
          .maybeSingle();

        if (existingBonusItem) {
          console.log(
            `Bonus: order ${order.id} already has bonus item. Skipping.`
          );
        } else {
          const { error: bonusItemError } = await supabase
            .from("order_items")
            .insert({
              order_id: order.id,
              product_id: bonusProduct.id,
              unit_price_cents: 0,
            });

          if (bonusItemError) {
            console.error(
              "Bonus: failed to insert bonus order_item:",
              bonusItemError
            );
          } else {
            const { error: bonusTokenError } = await supabase
              .from("download_tokens")
              .insert({
                order_id: order.id,
                product_id: bonusProduct.id,
                user_id: userId,
                expires_at: expiresAt,
              });

            if (bonusTokenError) {
              console.error(
                "Bonus: failed to insert bonus download_token:",
                bonusTokenError
              );
            } else {
              console.log(
                `Bonus: granted "${BONUS_PRODUCT_SLUG}" to order ${order.id} ` +
                  `(${productIds.length} items >= threshold of ${BONUS_THRESHOLD}).`
              );
            }
          }
        }
      }
    } catch (bonusErr) {
      // Catch-all so a bonus failure never poisons a successful order
      console.error("Bonus: unexpected error in bonus grant:", bonusErr);
    }
  }

  console.log(`Order ${order.id} recorded for user ${userId}.`);
  return NextResponse.json({ received: true, orderId: order.id });
}

// ──────────────────────────────────────────────────────────────────────
// Pro mini-app standalone purchase handler.
// Records a paid `orders` row (no order_items / download_tokens — apps aren't
// in the `products` table) and grants an `app_entitlements` row keyed on
// (user_id, app_slug). Idempotent on stripe_session_id.
// ──────────────────────────────────────────────────────────────────────
async function handleAppStandalone(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const appSlug = session.metadata?.app_slug;
  const totalCents = parseInt(session.metadata?.total_cents ?? "0", 10);
  const customerEmail =
    session.customer_email ?? session.customer_details?.email ?? null;

  if (!userId || !appSlug) {
    console.error("App webhook missing metadata", session.metadata);
    return NextResponse.json(
      { error: "App order metadata incomplete." },
      { status: 400 }
    );
  }
  if (!customerEmail) {
    console.error("App webhook missing customer email");
    return NextResponse.json(
      { error: "Customer email is required." },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Idempotency — has this session already been recorded?
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existingOrder) {
    console.log(`App order for session ${session.id} already exists. Skipping.`);
    return NextResponse.json({ received: true, idempotent: true });
  }

  // Record the order (ledger). Apps have no products/order_items rows.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      status: "paid",
      subtotal_cents: totalCents,
      discount_cents: 0,
      total_cents: totalCents,
      bundle_rule_id: null,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent as string,
      customer_email: customerEmail,
      paid_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("Failed to insert app order:", orderError);
    return NextResponse.json(
      { error: "Failed to record app order." },
      { status: 500 }
    );
  }

  // Guard against a double-grant (e.g. a manual replay after the order row
  // was deleted) — entitlement is keyed on (user_id, app_slug).
  const { data: existingEnt } = await supabase
    .from("app_entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("app_slug", appSlug)
    .maybeSingle();

  if (existingEnt) {
    console.log(
      `Entitlement for user ${userId} + ${appSlug} already exists. Order ${order.id} recorded.`
    );
    return NextResponse.json({ received: true, orderId: order.id, idempotent: "entitlement" });
  }

  const { error: entError } = await supabase.from("app_entitlements").insert({
    user_id: userId,
    app_slug: appSlug,
    bundle_type: "standalone",
    order_id: order.id,
  });

  if (entError) {
    console.error("Failed to insert app_entitlements:", entError);
    return NextResponse.json(
      { error: "Failed to grant app entitlement." },
      { status: 500 }
    );
  }

  console.log(
    `App entitlement granted: user ${userId} -> ${appSlug} (order ${order.id}).`
  );
  return NextResponse.json({ received: true, orderId: order.id, entitlement: appSlug });
}
