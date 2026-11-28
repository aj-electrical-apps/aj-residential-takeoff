// Test copy safety check (Jonathan 2026-11-24: "Previews must NEVER touch real data or real logins").
// Every Vercel preview link (one per pull request) is a TEST copy. It must use the "aj-residential-takeoff-TEST-only"
// Blob store and its own sign-in secret. middleware.js runs this before every page and api call; if a preview
// ever points at the live store, or has the live sign-in secret, or has no secret at all (which would open it to
// everyone as Admin), the preview turns itself off and shows why. The live app (Production) is never checked or blocked.
// Edge-safe: no Node imports.

// The LIVE Blob store, aj-residential-takeoff-blob (Production only).
export const LIVE_STORE = "KZzJmk3N30GxhmZn";
// A test copy's SESSION_SECRET must start with this. The live secret doesn't, so the two can't be the same.
const LIVE = LIVE_STORE.toLowerCase();
export const TEST_SECRET_START = "TEST-only-";

const env = k => String(process.env[k] || "").trim();
const storeOf = id => id.replace(/^store_/, "").toLowerCase();
// VERCEL_ENV is set by Vercel on every deployment ("production" or "preview"). If it's ever missing, a deployment
// still counts as live when it runs on the live store with a non-test secret, so the live app can never be turned off by this.
export const isLive = () => env("VERCEL_ENV") === "production" ||
  (!env("VERCEL_ENV") && storeOf(env("BLOB_STORE_ID")) === LIVE && !env("SESSION_SECRET").startsWith(TEST_SECRET_START));
export const isTest = () => !isLive();
const storeOfToken = t => (t.split("_")[3] || "").toLowerCase(); // vercel_blob_rw_<store>_<random>

// null when safe, otherwise the reason the test copy is turned off
export function testCopyProblem() {
  if (isLive()) return null;
  const sid = storeOf(env("BLOB_STORE_ID")), tok = env("BLOB_READ_WRITE_TOKEN"), tsid = tok ? storeOfToken(tok) : "";
  if (sid === LIVE || tsid === LIVE || tok.toLowerCase().includes(LIVE)) return "it points at the LIVE data store";
  if (!sid && !tok) return "the TEST-only data store isn't connected to Preview yet";
  if (sid && tsid && sid !== tsid) return "its two data store settings name different stores";
  const testSid = storeOf(env("TEST_BLOB_STORE_ID")); // set by the TEST-only store's connection (prefix TEST_BLOB)
  if (testSid && sid && sid !== testSid) return "its data store isn't the TEST-only store";
  const key = env("SESSION_SECRET");
  if (!key) return "it has no sign-in secret of its own (it would let anyone in as Admin)";
  if (!key.startsWith(TEST_SECRET_START)) return "its sign-in secret isn't a TEST-only one (it may be the live secret)";
  if (env("APP_PASSWORD") || env("FIELD_PASSWORD")) return "it has a shared app password set (those belong to the live app)";
  return null;
}

export function offPage(why) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Test copy turned off</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;padding:40px 16px;background:#fff7ed;color:#1c2233}main{max-width:560px;margin:auto}h1{color:#c2410c;font-size:22px}code{background:#fed7aa;padding:1px 5px;border-radius:4px}</style></head>
<body><main><h1>This test copy is turned off</h1><p>This is a <b>preview (test) link</b>, and it was turned off because ${why}.</p>
<p>Nothing was read or changed. The live app is not affected.</p><p>Ask Claude to fix the test copy's Preview settings in Vercel.</p></main></body></html>`;
  return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
