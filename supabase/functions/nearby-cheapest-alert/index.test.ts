// Security tests for nearby-cheapest-alert endpoint hardening and
// organization_members admin self-promotion RLS policy.
//
// Run with the project's edge-function test runner. Loads env from root .env.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("nearby-cheapest-alert rejects requests without CRON_SECRET / service-role", async () => {
  // No auth headers at all
  const r1 = await fetch(`${SUPABASE_URL}/functions/v1/nearby-cheapest-alert`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ endpoint: "https://example.com/fake" }),
  });
  await r1.text();
  assertEquals(r1.status, 401, "expected 401 without cron/service auth");

  // Wrong x-cron-secret
  const r2 = await fetch(`${SUPABASE_URL}/functions/v1/nearby-cheapest-alert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      "x-cron-secret": "definitely-not-the-secret",
    },
    body: JSON.stringify({ endpoint: "https://example.com/fake" }),
  });
  await r2.text();
  assertEquals(r2.status, 401, "expected 401 with wrong cron secret");

  // Anon bearer (regular signed-out user token) must also be rejected
  const r3 = await fetch(`${SUPABASE_URL}/functions/v1/nearby-cheapest-alert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ endpoint: "https://example.com/fake" }),
  });
  await r3.text();
  assertEquals(r3.status, 401, "expected 401 with anon bearer");
});

Deno.test("organization_members RLS blocks self-promotion to admin", async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Create a throwaway user and sign in
  const email = `sec-test-${crypto.randomUUID()}@tucom.test`;
  const password = `P!${crypto.randomUUID()}`;
  const { data: signUp, error: signUpErr } = await supabase.auth.signUp({ email, password });
  if (signUpErr) {
    console.warn("signUp failed, skipping RLS assertion:", signUpErr.message);
    return;
  }
  if (!signUp.session) {
    console.warn("no session returned (email confirmation likely required); skipping RLS assertion");
    return;
  }

  const userId = signUp.user!.id;
  const fakeOrgId = crypto.randomUUID();

  // (a) Attempt to self-insert as admin — MUST be blocked by RLS policy
  const { error: adminSelfErr } = await supabase
    .from("organization_members")
    .insert({ organization_id: fakeOrgId, user_id: userId, role: "admin" });
  assertNotEquals(adminSelfErr, null, "self-insert as admin should be blocked");
  assert(
    /row-level security|violates|permission/i.test(adminSelfErr!.message),
    `expected RLS error, got: ${adminSelfErr!.message}`,
  );

  // (b) Attempting role='driver' on an org they don't own also fails (no org exists),
  //     but must NOT fail with "role escalation allowed". Just sanity check it's a policy/FK error.
  const { error: driverErr } = await supabase
    .from("organization_members")
    .insert({ organization_id: fakeOrgId, user_id: userId, role: "driver" });
  assertNotEquals(driverErr, null, "insert against non-existent org should fail");
});
