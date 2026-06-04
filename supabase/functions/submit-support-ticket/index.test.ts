// Smoke tests for submit-support-ticket edge function.
// Verifies CORS preflight and that unauthenticated requests are rejected.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/submit-support-ticket`;

Deno.test("CORS preflight returns 2xx", async () => {
  const res = await fetch(ENDPOINT, {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:8080" },
  });
  await res.body?.cancel();
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Expected 2xx, got ${res.status}`);
  }
});

Deno.test("Rejects unauthenticated POST with 401", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ issue_type: "Bug" }),
  });
  await res.text();
  assertEquals(res.status, 401);
});
