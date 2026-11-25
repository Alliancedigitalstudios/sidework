// ---- shared (inlined into each function; source of truth: backend/supabase/functions/_shared.ts) ----
import { createClient } from "npm:@supabase/supabase-js@2";
import { decodeProtectedHeader, importJWK, jwtVerify } from "npm:jose@5";

const PLAID_ENV = Deno.env.get("PLAID_ENV") ?? "sandbox";
const PLAID_BASE = `https://${PLAID_ENV}.plaid.com`;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  (() => { try { return Object.values(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"))[0] as string; } catch { return ""; } })();
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const enc = new TextEncoder();

class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, apikey, x-client-info",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...cors } });
}
function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    try { return await fn(req); }
    catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      // Never log request bodies, tokens or amounts. Error codes only.
      console.error(JSON.stringify({ fn: new URL(req.url).pathname, status, code: (e as Error).message }));
      return json({ error: status === 500 ? "internal_error" : (e as Error).message }, status);
    }
  };
}

async function plaid(path: string, body: Record<string, unknown>) {
  const r = await fetch(PLAID_BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: Deno.env.get("PLAID_CLIENT_ID"), secret: Deno.env.get("PLAID_SECRET"), ...body }),
  });
  const j = await r.json();
  if (!r.ok) throw new HttpError(502, `plaid_${j.error_code ?? r.status}`);
  return j;
}

async function requireUser(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "unauthorized");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "unauthorized");
  await admin.from("users").upsert({ id: data.user.id, last_seen_at: new Date().toISOString() });
  return data.user;
}

async function audit(userId: string | null, event: string) {
  await admin.from("audit_events").insert({ user_id: userId, event });
}

async function sha256Hex(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));
  return [...d].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Envelope-style encryption: per-user AES-256-GCM key derived (HKDF) from TOKEN_ENC_KEY.
async function userKey(userId: string) {
  const raw = Deno.env.get("TOKEN_ENC_KEY");
  if (!raw) throw new HttpError(500, "missing_enc_key");
  const master = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  const base = await crypto.subtle.importKey("raw", master, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode("sidework-plaid-v1"), info: enc.encode(userId) },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
  );
}
const toHex = (b: Uint8Array) => "\\x" + [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (s: string) => Uint8Array.from(s.replace(/^\\x/, "").match(/../g)!.map((x) => parseInt(x, 16)));
async function encryptToken(userId: string, token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(userId) }, await userKey(userId), enc.encode(token)));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return toHex(out);
}
async function decryptToken(userId: string, hex: string) {
  const b = fromHex(hex);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b.slice(0, 12), additionalData: enc.encode(userId) }, await userKey(userId), b.slice(12));
  return new TextDecoder().decode(pt);
}

// Pull new transactions with a cursor; keep DEPOSITS ONLY (Plaid reports money in as negative amounts).
// Merchant names and categories are never stored.
async function syncItem(item: { item_id: string; user_id: string; access_token_enc: string; cursor: string | null }) {
  const accessToken = await decryptToken(item.user_id, item.access_token_enc);
  let cursor = item.cursor ?? undefined;
  let hasMore = true;
  const rows: Record<string, unknown>[] = [];
  const removed: string[] = [];
  const masks: Record<string, string | null> = {};
  while (hasMore) {
    const r = await plaid("/transactions/sync", { access_token: accessToken, cursor, count: 500 });
    for (const a of r.accounts ?? []) masks[a.account_id] = a.mask ?? null;
    for (const t of [...r.added, ...r.modified]) {
      if (t.amount < 0) rows.push({
        user_id: item.user_id, item_id: item.item_id, plaid_txn_id: t.transaction_id,
        date: t.date, amount: Math.abs(t.amount), pending: t.pending, account_mask: masks[t.account_id] ?? null,
      });
    }
    removed.push(...r.removed.map((x: { transaction_id: string }) => x.transaction_id));
    cursor = r.next_cursor; hasMore = r.has_more;
  }
  if (rows.length) await admin.from("synced_deposits").upsert(rows, { onConflict: "plaid_txn_id" });
  if (removed.length) await admin.from("synced_deposits").delete().in("plaid_txn_id", removed);
  const cutoff = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  await admin.from("synced_deposits").delete().eq("item_id", item.item_id).lt("date", cutoff);
  await admin.from("plaid_items").update({ cursor, last_sync_at: new Date().toISOString(), status: "active" }).eq("item_id", item.item_id);
  return rows.length;
}

async function removeItem(item: { item_id: string; user_id: string; access_token_enc: string }, event: string) {
  try { await plaid("/item/remove", { access_token: await decryptToken(item.user_id, item.access_token_enc) }); }
  catch (_) { /* already removed at Plaid; still delete locally */ }
  await admin.from("synced_deposits").delete().eq("item_id", item.item_id);
  await admin.from("plaid_items").delete().eq("item_id", item.item_id);
  await audit(item.user_id, event);
}
// ---- end shared ----

// Plaid -> us. JWT verification is OFF for this function; we verify Plaid's own signature instead.

async function verifyPlaid(req: Request, raw: string) {
  const jwt = req.headers.get("plaid-verification");
  if (!jwt) return false;
  const { kid, alg } = decodeProtectedHeader(jwt);
  if (alg !== "ES256" || !kid) return false;
  const { key } = await plaid("/webhook_verification_key/get", { key_id: kid });
  if (key.expired_at) return false;
  const { alg: _a, created_at: _c, expired_at: _e, ...jwk } = key;
  const { payload } = await jwtVerify(jwt, await importJWK(jwk, "ES256"), { maxTokenAge: "5 min" });
  const bodyHash = await sha256Hex(raw);
  const expected = String(payload.request_body_sha256 ?? "");
  if (bodyHash.length !== expected.length) return false;
  let diff = 0; for (let i = 0; i < bodyHash.length; i++) diff |= bodyHash.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

Deno.serve(handle(async (req) => {
  const raw = await req.text();
  if (!(await verifyPlaid(req, raw).catch(() => false))) throw new HttpError(401, "bad_signature");
  const hook = JSON.parse(raw);
  const { data: item } = await admin.from("plaid_items").select("*").eq("item_id", hook.item_id).maybeSingle();
  if (!item) return json({ ok: true, ignored: true });
  const code = `${hook.webhook_type}:${hook.webhook_code}`;
  if (code === "TRANSACTIONS:SYNC_UPDATES_AVAILABLE") {
    await syncItem(item);
  } else if (code === "ITEM:ERROR" || code === "ITEM:PENDING_EXPIRATION" || code === "ITEM:PENDING_DISCONNECT" || hook.error?.error_code === "ITEM_LOGIN_REQUIRED") {
    await admin.from("plaid_items").update({ status: "relink_required" }).eq("item_id", item.item_id);
    await audit(item.user_id, "relink_required");
  } else if (code === "ITEM:USER_PERMISSION_REVOKED" || code === "ITEM:USER_ACCOUNT_REVOKED") {
    await removeItem(item, "revoked_by_user");
  }
  return json({ ok: true });
}));
