import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { calculateBundlePrice } from "@/lib/bundle/calculate-price";
import type { BundleRule, BundleItem } from "@/lib/types/product";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to check out." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const productIds: string[] = body.productIds || [];

    if (productIds.length === 0) {
      return NextResponse.json(
        { error: "Your bundle is empty." },
        { status: 400 }
      );
    }

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, slug, title, price_cents, preview_url, is_active")
      .in("id", productIds)
      .eq("is_active", true);

    if (productsError || !products || products.length !== productIds.length) {
      return NextResponse.json(
        { error: "One or more products are unavailable." },
        { status: 400 }
      );
    }

    const { data: bundleRule } = await supabase
      .from("bundle_rules")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(1)
      .single<BundleRule>();

    const items: BundleItem[] = products.map((p) => ({
      product_id: p.id,
      slug: p.slug,
      title: p.title,
      price_cents: p.price_cents,
      preview_image_url: p.preview_url ?? null,
    }));

    const priceResult = calculateBundlePrice(items, bundleRule ?? null);
    const totalCents = priceResult.final_price_cents;
    const subtotalCents = priceResult.subtotal_cents;
    const discountCents = priceResult.discount_cents;
    const bundleRuleId = priceResult.applied_tier ? bundleRule?.id ?? null : null;

    const itemCount = items.length;
    const productNames = items.map((i) => i.title).join(", ");
    const description =
      itemCount === 1
        ? items[0].title
        : `Bundle of ${itemCount} items: ${productNames.slice(0, 200)}${
            productNames.length > 200 ? "..." : ""
          }`;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: totalCents,
          product_data: {
            name:
              itemCount === 1
                ? items[0].title
                : `YesBundles — ${itemCount} items`,
            description,
          },
        },
      },
    ];

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        product_ids: productIds.join(","),
        item_count: String(itemCount),
        subtotal_cents: String(subtotalCents),
        discount_cents: String(discountCents),
        total_cents: String(totalCents),
        bundle_rule_id: bundleRuleId ?? "",
      },
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
