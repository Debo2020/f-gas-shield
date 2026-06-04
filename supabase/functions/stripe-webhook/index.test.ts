// Smoke tests for stripe-webhook edge function.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/stripe-webhook`;

Deno.test("Rejects non-POST methods with 405", async () => {
  const res = await fetch(ENDPOINT, { method: "GET" });
  await res.text();
  assertEquals(res.status, 405);
});

Deno.test("Rejects POST without valid Stripe signature", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "ping" }),
  });
  await res.text();
  // Should fail signature verification (400) — not succeed.
  if (res.status === 200) {
    throw new Error("Webhook accepted unsigned payload");
  }
});
