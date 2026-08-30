/**
 * Real-browser regression for the AI Consultation infinite-loop bug
 * (P1, reported live by Siam 2026-08-30 against production).
 *
 * ROOT CAUSE (confirmed via direct reproduction against the real broken
 * production conversation, chat_id 5c42cdd6-ab1c-427f-a239-4f0a26242414):
 * lib/ai-consultation/chat-engine.ts asked Claude to format its reply as
 * JSON via a plain prompt instruction, with no structural enforcement. On
 * that real conversation, replaying the exact same turn 5 times, the model
 * ignored the JSON instruction and replied in plain prose 4/5 times — every
 * one of those falls into a catch block that returns `gathered` completely
 * unchanged and, once every REQUIRED field already happened to be filled,
 * a dead-end generic message ("Thanks — could you tell me a bit more about
 * what you're looking for?") with no path back to progress, for good.
 *
 * FIX: lib/ai/anthropic-provider.ts now forces a tool_choice (structured
 * output guaranteed by the API, not requested by the prompt) for the
 * consultation turn; lib/ai-consultation/chat-engine.ts also asks the model
 * to self-report which field (`askingAbout`) its reply targets, and
 * deterministically overrides a redundant question with the actual next
 * missing field — independent of whether the model's own text-matching
 * logic is right. See tests/unit/ai-consultation-chat-engine.test.ts for
 * the mocked/deterministic half of this coverage (guard logic, fallback
 * selection, style validation) — THIS script is the real-browser,
 * real-Claude-API half: an actual multi-turn conversation typed through the
 * live /portal/[studio]/consultation UI against PRODUCTION.
 *
 * Disposable, self-cleaning, QA-tagged fixture — no real studio/client/
 * artist data touched. No DB migration, no Stripe config change.
 *
 * Run with: node scripts/verify-consultation-anti-loop.mjs
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const BASE_URL = process.env.QA_BASE_URL ?? "https://www.inkbook.tech";
const sb = createClient(SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const stamp = Date.now();
const TAG = `QA-CONSULT-LOOP-${stamp}`;
const PW = "QaConsultLoop2026!";

let failures = 0;
const PASS = (msg) => console.log("  PASS:", msg);
const FAIL = (msg) => { console.log("  FAIL:", msg); failures++; };
const HEAD = (msg) => console.log("\n" + msg + "\n" + "=".repeat(msg.length));

const created = { authUsers: [], studioId: null };

async function cleanup() {
  HEAD("CLEANUP");
  if (created.studioId) {
    await sb.from("ai_chat_messages").delete().in(
      "chat_id",
      (await sb.from("ai_chats").select("id").eq("studio_id", created.studioId)).data?.map((r) => r.id) ?? []
    );
    await sb.from("ai_chats").delete().eq("studio_id", created.studioId);
    await sb.from("consultations").delete().eq("studio_id", created.studioId);
    await sb.from("artists").delete().eq("studio_id", created.studioId);
    const { error: studioDelErr } = await sb.from("studios").delete().eq("id", created.studioId);
    if (studioDelErr) console.log("  studio delete error:", studioDelErr.message);
  }
  for (const id of created.authUsers) await sb.auth.admin.deleteUser(id).catch(() => {});
  const { data: remaining } = await sb.from("studios").select("id").eq("id", created.studioId ?? "");
  console.log(`Cleanup done — studio gone: ${!(remaining ?? []).length}, ${created.authUsers.length} auth user(s) removed.`);
}

function cookieLogin(browserCtx, session) {
  const projectRef = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1];
  const cookieValue = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  return browserCtx.addCookies([{
    name: `sb-${projectRef}-auth-token`, value: cookieValue,
    domain: new URL(BASE_URL).hostname, path: "/", httpOnly: false, secure: BASE_URL.startsWith("https"), sameSite: "Lax",
  }]);
}

async function makeSession(email) {
  const { data: authUser, error } = await sb.auth.admin.createUser({ email, email_confirm: true, password: PW });
  if (error) throw new Error(`createUser(${email}) failed: ${error.message}`);
  created.authUsers.push(authUser.user.id);
  const otpHelper = createClient(SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: linkData } = await sb.auth.admin.generateLink({ type: "magiclink", email });
  const { data: verifyData } = await otpHelper.auth.verifyOtp({ email, token: linkData.properties.email_otp, type: "email" });
  return { authUserId: authUser.user.id, session: verifyData.session };
}

async function sendAndWaitForReply(page, text, { screenshotOnFail = false } = {}) {
  const before = await page.locator('[data-testid="chat-message"][data-role="assistant"]').count();
  await page.getByPlaceholder("Type your message…").fill(text);
  await page.getByRole("button", { name: /send/i }).click();
  try {
    await page.waitForFunction(
      (n) => document.querySelectorAll('[data-testid="chat-message"][data-role="assistant"]').length > n,
      before,
      { timeout: 30000 }
    );
  } catch (e) {
    if (screenshotOnFail) await page.screenshot({ path: `scripts/.qa-consult-loop-fail-${Date.now()}.png` }).catch(() => {});
    throw e;
  }
  await page.waitForTimeout(400); // let the DOM settle after the state update
  const bubbles = page.locator('[data-testid="chat-message"][data-role="assistant"]');
  const count = await bubbles.count();
  return (await bubbles.nth(count - 1).innerText()).trim();
}

(async () => {
  HEAD("0 — Provision disposable studio + owner");
  const ownerEmail = `${TAG.toLowerCase()}-owner@inkbook-qa.test`;
  const { authUserId: ownerId } = await makeSession(ownerEmail);
  const { data: studio, error: studioErr } = await sb.from("studios").insert({
    name: `[${TAG}] Loop Regression Studio`, subdomain: TAG.toLowerCase(), owner_id: ownerId, plan: "studio",
  }).select().single();
  if (studioErr) throw new Error("studio insert failed: " + studioErr.message);
  created.studioId = studio.id;
  PASS(`studio ${studio.id} created`);

  const clientEmail = `${TAG.toLowerCase()}-client@inkbook-qa.test`;
  const { session: clientSession } = await makeSession(clientEmail);

  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];
  const failedRequests = [];

  HEAD("1 — Load consultation page as a fresh client (real browser)");
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 } });
  await cookieLogin(ctx, clientSession);
  const page = await ctx.newPage();
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("requestfailed", (req) => failedRequests.push(req.url()));

  await page.goto(`${BASE_URL}/portal/${TAG.toLowerCase()}/consultation`, { waitUntil: "load" });
  const greetingVisible = await page.locator('[data-testid="chat-message"][data-role="assistant"]').first().isVisible({ timeout: 10000 }).catch(() => false);
  if (greetingVisible) PASS("seeded greeting message rendered"); else FAIL("no greeting message rendered");

  // ═══════════════════════════════════════════════════════════
  // 2 — Normal progression: name, phone
  // ═══════════════════════════════════════════════════════════
  HEAD("2 — Normal progression (name, phone)");
  let reply = await sendAndWaitForReply(page, "hi, i want to get a tattoo done");
  console.log("  AI:", reply.slice(0, 90));
  reply = await sendAndWaitForReply(page, "My name is Jordan QA");
  if (/phone|number|reach/i.test(reply)) PASS("asked for phone after name given"); else FAIL(`expected to ask for phone, got: "${reply}"`);
  reply = await sendAndWaitForReply(page, "555-0142");

  // ═══════════════════════════════════════════════════════════
  // 3 — Multiple fields in one message
  // ═══════════════════════════════════════════════════════════
  HEAD("3 — Multiple fields in one message");
  reply = await sendAndWaitForReply(page, "I want a lion face tattoo on my left arm, roughly half sleeve size");

  // ═══════════════════════════════════════════════════════════
  // 4 — Vague answer, then a real one
  // ═══════════════════════════════════════════════════════════
  HEAD("4 — Vague answer");
  reply = await sendAndWaitForReply(page, "not sure, whatever looks good honestly");
  console.log("  AI (after vague answer):", reply.slice(0, 90));
  reply = await sendAndWaitForReply(page, "traditional style then");

  reply = await sendAndWaitForReply(page, "black and grey");

  // ═══════════════════════════════════════════════════════════
  // 5 — Frustrated reply mid-flow (Siam's exact real wording)
  // ═══════════════════════════════════════════════════════════
  HEAD("5 — Frustrated reply does not reset the flow");
  reply = await sendAndWaitForReply(page, "$200");
  const beforeFrustration = await page.locator('[data-testid="chat-message"]').count();
  reply = await sendAndWaitForReply(page, "are you going mad? i already told you everything");
  console.log("  AI (after frustrated reply):", reply.slice(0, 90));
  const afterFrustration = await page.locator('[data-testid="chat-message"]').count();
  if (afterFrustration > beforeFrustration) PASS("conversation continued (message count grew) instead of resetting");
  else FAIL("message count did not grow after frustrated reply — flow may have reset or hung");

  // ═══════════════════════════════════════════════════════════
  // 6 — Repeated-question prevention (mid-refresh)
  // ═══════════════════════════════════════════════════════════
  HEAD("6 — Refresh mid-conversation (persistence)");
  const beforeRefreshText = await page.locator('[data-testid="chat-message"]').last().innerText();
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-testid="chat-message"]', { timeout: 15000 });
  const afterRefreshCount = await page.locator('[data-testid="chat-message"]').count();
  const afterRefreshText = await page.locator('[data-testid="chat-message"]').last().innerText();
  if (afterRefreshCount >= afterFrustration) PASS(`message history persisted across refresh (${afterRefreshCount} messages)`);
  else FAIL(`message count dropped after refresh: ${afterFrustration} -> ${afterRefreshCount}`);
  if (afterRefreshText === beforeRefreshText) PASS("last message content matches pre-refresh (no state corruption)");
  else FAIL(`last message changed across refresh: "${beforeRefreshText}" -> "${afterRefreshText}"`);

  // ═══════════════════════════════════════════════════════════
  // 7 — Finish optional fields -> completion
  // ═══════════════════════════════════════════════════════════
  HEAD("7 — Complete the consultation");
  reply = await sendAndWaitForReply(page, "no preference on the artist");
  reply = await sendAndWaitForReply(page, "flexible on dates");
  reply = await sendAndWaitForReply(page, "no medical conditions");
  await page.getByPlaceholder("Type your message…").fill("that's everything, thanks!");
  await page.getByRole("button", { name: /send/i }).click();
  const completed = await page.locator('[data-testid="consultation-success"]').isVisible({ timeout: 30000 }).catch(() => false);
  if (completed) PASS("consultation reached the success screen (complete=true)");
  else FAIL("consultation did not complete after all fields were provided");

  // ═══════════════════════════════════════════════════════════
  // 8 — Conversation history integrity + anti-loop verification (DB)
  // ═══════════════════════════════════════════════════════════
  HEAD("8 — Conversation history integrity + anti-loop check (DB)");
  const { data: chatRow } = await sb.from("ai_chats").select("id, status, consultation_id, gathered").eq("studio_id", studio.id).single();
  if (chatRow?.status === "submitted" && chatRow.consultation_id) PASS(`ai_chats correctly marked submitted, linked to consultation ${chatRow.consultation_id}`);
  else FAIL(`ai_chats.status="${chatRow?.status}" consultation_id=${chatRow?.consultation_id} — expected submitted + linked`);

  const { data: allMsgs } = await sb.from("ai_chat_messages").select("role, content, created_at").eq("chat_id", chatRow.id).order("created_at", { ascending: true });
  const roles = allMsgs.map((m) => m.role);
  let alternatesCorrectly = true;
  for (let i = 1; i < roles.length; i++) if (roles[i] === roles[i - 1]) alternatesCorrectly = false;
  if (alternatesCorrectly) PASS(`message history strictly alternates user/assistant (${allMsgs.length} messages, no gaps/dupes)`);
  else FAIL("message history has consecutive same-role messages — history integrity broken");

  const assistantTexts = allMsgs.filter((m) => m.role === "assistant").map((m) => m.content);
  let exactRepeats = 0;
  for (let i = 1; i < assistantTexts.length; i++) if (assistantTexts[i] === assistantTexts[i - 1] && assistantTexts[i].length > 0) exactRepeats++;
  if (exactRepeats === 0) PASS("no two consecutive assistant messages are verbatim-identical — the exact loop symptom did not recur");
  else FAIL(`${exactRepeats} instance(s) of consecutive verbatim-identical assistant replies — the loop reproduced`);

  const genericDeadEnd = assistantTexts.filter((t) => t === "Thanks — could you tell me a bit more about what you're looking for?").length;
  if (genericDeadEnd === 0) PASS("the old dead-end generic fallback message never appeared");
  else FAIL(`the old dead-end fallback message appeared ${genericDeadEnd} time(s)`);

  console.log(`  Final gathered state: ${JSON.stringify(chatRow.gathered)}`);
  const requiredFilled = ["name", "phone", "description", "placement", "size", "style", "color", "budget"].every((f) => chatRow.gathered?.[f]);
  if (requiredFilled) PASS("all 8 required fields present in final gathered state");
  else FAIL("one or more required fields missing from final gathered state");

  // ═══════════════════════════════════════════════════════════
  // 9 — Owner receives the final collected consultation
  // ═══════════════════════════════════════════════════════════
  HEAD("9 — Owner sees the submitted consultation");
  // Owner already has an auth user (ownerId) — mint a fresh session for it directly.
  const otpHelper2 = createClient(SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: ownerLinkData } = await sb.auth.admin.generateLink({ type: "magiclink", email: ownerEmail });
  const { data: ownerVerify } = await otpHelper2.auth.verifyOtp({ email: ownerEmail, token: ownerLinkData.properties.email_otp, type: "email" });

  const ownerCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await cookieLogin(ownerCtx, ownerVerify.session);
  const ownerPage = await ownerCtx.newPage();
  await ownerPage.goto(`${BASE_URL}/owner/consultations/${chatRow.consultation_id}`, { waitUntil: "load" });
  const ownerBody = await ownerPage.locator("body").innerText();
  const hasName = ownerBody.includes("Jordan QA");
  const hasPlacement = /left arm/i.test(ownerBody);
  const hasDescription = /lion/i.test(ownerBody);
  if (hasName && hasPlacement && hasDescription) PASS("owner's consultation detail page shows the client's name, placement, and description correctly");
  else FAIL(`owner detail page missing expected content — name=${hasName} placement=${hasPlacement} description=${hasDescription}`);

  const { data: consultRow } = await sb.from("consultations").select("client_name, client_phone, placement, tattoo_description, budget_range, status").eq("id", chatRow.consultation_id).single();
  if (consultRow?.client_name === "Jordan QA" && consultRow.client_phone === "555-0142" && /left arm/i.test(consultRow.placement ?? "")) {
    PASS("consultations row has correct client_name/client_phone/placement");
  } else {
    FAIL(`consultations row mismatch: ${JSON.stringify(consultRow)}`);
  }

  // ═══════════════════════════════════════════════════════════
  // Console/network hygiene
  // ═══════════════════════════════════════════════════════════
  const BENIGN_CONSOLE = [/Failed to fetch RSC payload/i];
  const BENIGN_NETWORK = [/[?&]_rsc=/, /\/monitoring\?/];
  const realConsoleErrors = consoleErrors.filter((e) => !BENIGN_CONSOLE.some((re) => re.test(e)));
  const realFailedRequests = failedRequests.filter((u) => !BENIGN_NETWORK.some((re) => re.test(u)));
  if (realConsoleErrors.length === 0 && realFailedRequests.length === 0) PASS("no console errors or failed requests throughout the whole flow");
  else FAIL(`console errors: ${JSON.stringify(realConsoleErrors.slice(0, 3))}, failed requests: ${JSON.stringify(realFailedRequests.slice(0, 3))}`);

  await browser.close();
  if (failures > 0 && process.env.QA_KEEP_ON_FAIL === "1") {
    console.log(`\n\nSkipping cleanup (QA_KEEP_ON_FAIL=1) — studio ${studio.id}, chat ${chatRow?.id}, consultation ${chatRow?.consultation_id ?? "none"} left in place for inspection.`);
  } else {
    await cleanup();
  }

  console.log(`\n\n=== CONSULTATION ANTI-LOOP REGRESSION COMPLETE — ${failures} failure(s) ===\n`);
  process.exit(failures > 0 ? 1 : 0);
})().catch(async (err) => {
  console.error("FATAL:", err);
  await cleanup().catch(() => {});
  process.exit(1);
});
