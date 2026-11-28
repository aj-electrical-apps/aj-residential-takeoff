# Testing a change safely (the test copy)

Every change goes on its own branch and pull request (PR). Vercel builds a **test copy** of the app for each PR, the "preview link". Nothing reaches the live app (https://aj-residential-takeoff.vercel.app) until Jonathan says **"dp"**.

## What keeps the test copy apart from the live app

| | Live app (Production) | Test copy (every Preview link) |
|---|---|---|
| Data store | `aj-residential-takeoff-blob` | `aj-residential-takeoff-TEST-only` |
| Sign-in secret | its own `SESSION_SECRET` | its own `SESSION_SECRET` (starts with `TEST-only-`) |
| Logins | your real team | **Test Admin** only (password `TEST_ADMIN_PASSWORD`, Preview env var) |
| Who can open it | anyone with a login | only people signed in to your Vercel team (Vercel Authentication), then Test Admin |
| Offline copy on the device | `aj-page` | `aj-TEST-page` (and a different web address, so the browser keeps them apart anyway) |
| Look | normal | orange line across the top, **TEST COPY** badge, "TEST ·" in the tab name |

**Safety check** (`lib/safety.js`, run by `middleware.js` before every page and request): a preview turns itself off and shows "This test copy is turned off" if it ever
- points at the live data store,
- has no sign-in secret, or a secret that isn't a `TEST-only-` one,
- has the shared `APP_PASSWORD` / `FIELD_PASSWORD`, or
- has no TEST store connected.

The live app is never checked or blocked by it.

## Jonathan's steps for every change

### 1. Open the test link
1. Open the pull request link Claude sends you (it starts with `github.com/aj-electrical-apps/aj-residential-takeoff/pull/`).
2. Scroll down to the comment from **vercel** (a small table). In the **Preview** column, click **Visit Preview**.
3. If Vercel asks you to sign in, click **Continue with GitHub** (or the way you normally sign in to Vercel).
4. The app's sign-in page has an orange **TEST COPY** bar. Name: **Test Admin**. Password: the test password Claude gave you. Click **Sign in**.

### 2. Try the change
1. Check that the orange **TEST COPY** badge is next to "AJ Residential" at the top. If it isn't there, stop: you're on the live app.
2. First time on a new test copy: click **Add sample jobs** in the orange badge. Three SAMPLE jobs appear (about 20 seconds).
3. Try the new feature the way you would on a real job. Make a mess; it's all practice data.
4. Anything wrong? Tell Claude in the thread. Claude fixes it on the same PR, and the same test link updates in a minute or two (reload the page).

### 3. Say "dp"
When it works, type **dp** in the thread. Claude merges the PR, and Vercel puts it on the live app in about a minute. Everyone's app shows "A newer version is ready" within 15 minutes.

### 4. Undo with one click (Instant Rollback)
If the live app has a problem after a "dp":
1. Go to **vercel.com** and sign in.
2. Click the **aj-residential-takeoff** project.
3. Click the **Deployments** tab at the top.
4. Find the deployment just below the newest one marked **Production** (the one that was live before the change; it has a green **Ready** dot). Click the **⋯** (three dots) on the right of that row.
5. Click **Instant Rollback**, then click **Confirm Rollback**.
6. The live app is back to the old version in a few seconds. Tell Claude what went wrong; the PR's code is still in GitHub to fix.

Rollback only changes the app's code. Jobs and logins live in the data store and are not changed by it.

## One-time setup (done 2026-11-24)
- Live store keys (`BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID`) and live `SESSION_SECRET`: Production only.
- `aj-residential-takeoff-TEST-only` is connected to Preview only with the prefix `TEST_BLOB` (the live store's connection still holds the `BLOB_` names). Preview's `BLOB_STORE_ID` is set by hand to the same store id as `TEST_BLOB_STORE_ID`, and the safety check makes sure the two match.
- `SESSION_SECRET` (Preview) starts with `TEST-only-`; `TEST_ADMIN_PASSWORD` (Preview) is the Test Admin password.
- On an empty TEST store, `api/login.js` makes the **Test Admin** login by itself (Preview only).
