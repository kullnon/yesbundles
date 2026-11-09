// app/api/webhook/stripe/route.test.ts
//
// Run with:
//   node --experimental-test-module-mocks --test app/api/webhook/stripe/route.test.ts
// (Node 22.3+; Node 24 strips the types itself). Stripe, Supabase and
// next/server are mocked, so nothing touches the network.

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// `next` has no package exports map, so plain Node ESM cannot resolve the
// extensionless "next/server" that the route imports (Next's bundler can).
registerHooks({
  resolve: (specifier, context, nextResolve) =>
    nextResolve(specifier === "next/server" ? "next/server.js" : specifier, context),
});

let currentEvent: unknown = null;
let createClientCalls = 0;

mock.module("next/server.js", {
  exports: {
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) => Response.json(body, init),
    },
  },
});

mock.module("stripe", {
  exports: {
    default: class FakeStripe {
      webhooks = { constructEvent: () => currentEvent };
    },
  },
});

mock.module("@supabase/supabase-js", {
  exports: {
    createClient: () => {
      createClientCalls += 1;
      throw new Error("database must not be touched in these tests");
    },
  },
});

const { POST } = await import("./route.ts");

function post() {
  return POST(
    new Request("http://localhost/api/webhook/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=fake" },
      body: "{}",
    })
  );
}

beforeEach(() => {
  currentEvent = null;
  createClientCalls = 0;
});

test("checkout.session.completed for another app is ignored with 200", async () => {
  currentEvent = {
    type: "checkout.session.completed",
    data: { object: { id: "cs_1", metadata: { app: "cynthia" } } },
  };
  const res = await post();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ignored: "other app" });
  assert.equal(createClientCalls, 0);
});

test("invoice.paid for another app (subscription_details) is ignored with 200", async () => {
  currentEvent = {
    type: "invoice.paid",
    data: {
      object: { id: "in_1", subscription_details: { metadata: { app: "cynthia" } } },
    },
  };
  const res = await post();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ignored: "other app" });
  assert.equal(createClientCalls, 0);
});

test("invoice.paid for another app (parent.subscription_details) is ignored with 200", async () => {
  currentEvent = {
    type: "invoice.paid",
    data: {
      object: {
        id: "in_2",
        parent: { subscription_details: { metadata: { app: "cynthia" } } },
      },
    },
  };
  const res = await post();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ignored: "other app" });
});

test("own checkout without metadata.app keeps the missing-metadata 400", async () => {
  currentEvent = {
    type: "checkout.session.completed",
    data: { object: { id: "cs_2", metadata: {} } },
  };
  const res = await post();
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "Order metadata incomplete." });
  assert.equal(createClientCalls, 0);
});

test("metadata.app = yesbundles is processed as before", async () => {
  currentEvent = {
    type: "checkout.session.completed",
    data: { object: { id: "cs_3", metadata: { app: "yesbundles" } } },
  };
  const res = await post();
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "Order metadata incomplete." });
});

test("own invoice event without metadata.app keeps today's ignored-type reply", async () => {
  currentEvent = {
    type: "invoice.paid",
    data: { object: { id: "in_3", subscription_details: { metadata: {} } } },
  };
  const res = await post();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { received: true, ignored: "invoice.paid" });
});

test("invoice event reads subscription metadata, not the invoice's own metadata", async () => {
  currentEvent = {
    type: "invoice.paid",
    data: { object: { id: "in_4", metadata: { app: "cynthia" } } },
  };
  const res = await post();
  assert.deepEqual(await res.json(), { received: true, ignored: "invoice.paid" });
});

test("own complete checkout still reaches the database path", async () => {
  currentEvent = {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_4",
        customer_email: "buyer@example.com",
        metadata: { user_id: "u1", product_ids: "p1", total_cents: "900" },
      },
    },
  };
  await assert.rejects(post(), /database must not be touched/);
  assert.equal(createClientCalls, 1);
});
