// Smoke tests for accept-invitation edge function (auth + invitation flow).
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/accept-invitation`;

const baseHeaders = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
};

Deno.test("CORS preflight succeeds", async () => {
  const res = await fetch(ENDPOINT, {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:8080" },
  });
  await res.body?.cancel();
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Expected 2xx, got ${res.status}`);
  }
});

Deno.test("Rejects missing password with 400", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ token: "x".repeat(64) }),
  });
  const json = await res.json();
  assertEquals(res.status, 400);
  assertEquals(typeof json.error, "string");
});

Deno.test("Rejects missing token with 400", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ password: "ValidPassword123!" }),
  });
  const json = await res.json();
  assertEquals(res.status, 400);
  assertEquals(typeof json.error, "string");
});

Deno.test("Rejects short password with 400", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ token: "x".repeat(64), password: "short" }),
  });
  const json = await res.json();
  assertEquals(res.status, 400);
  assertEquals(typeof json.error, "string");
});
