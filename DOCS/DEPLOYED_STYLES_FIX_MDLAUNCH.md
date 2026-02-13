# Deployed Page No Styles (/mdlaunch) — Root Cause and Fix

## 1. Observed behavior (Network + curl evidence)

### Before fix
- **Homepage:** `https://d3gmizugvrve50.cloudfront.net/mdlaunch/` → 200, HTML with `<link rel="stylesheet" href="/mdlaunch/assets/main-CIMQinxc.css">`.
- **CSS request:** `GET https://d3gmizugvrve50.cloudfront.net/mdlaunch/assets/main-CIMQinxc.css`
  - **Status:** 404
  - **content-type:** `text/html; charset=utf-8`
  - **Body:** Lambda “Page not found” HTML (not CSS).

So the CSS URL was correct in the HTML, but the request was served by the **Lambda** origin (SSR), which has no static file at that path and returned 404 HTML.

### After fix
- **CSS request:** 200, `content-type: text/css;charset=UTF-8`, body is actual CSS (`:root{...}`).
- **Origin:** `server: AmazonS3` → asset is served from S3.

---

## 2. Repo config evidence

- **Vite base:** `vite.config.ts` → `base: '/mdlaunch/'` (trailing slash).
- **Router basePath:** `src/router.tsx` → `basepath: '/mdlaunch'` (no trailing slash).
- **Emitted CSS link:** HTML uses `/mdlaunch/assets/main-CIMQinxc.css` (from Vite base).
- **Build output:** `.output/public/assets/main-CIMQinxc.css` and S3 keys under `assets/` (no `mdlaunch` prefix in object keys).

---

## 3. AWS/CloudFront evidence

### Before fix
- **Origins:** 1 (only `placeholder.sst.dev` → Lambda).
- **Cache behaviors:** 0 (all traffic used default behavior → Lambda).
- **Result:** `/mdlaunch/assets/*` went to Lambda → 404 HTML.

### After fix
- **Origins:** 2 — `default` (placeholder.sst.dev), `MyWebAssets` (S3 bucket).
- **Ordered cache behavior:** `/assets/*` → origin `MyWebAssets` (S3).
- **Viewer-request:** Rewrites `/mdlaunch/assets/` → `/assets/` so the path matches S3 keys (`assets/...`).

**Mapping:**
- `/mdlaunch/assets/*` → (viewer-request rewrites to `/assets/*`) → **S3 origin** (MyWebAssets).
- `/mdlaunch/*` (and all other paths) → **Lambda origin** (default).

---

## 4. Root cause

**Primary cause:** CloudFront had a **single origin** (Lambda) and **no cache behavior** for static assets. Requests to `/mdlaunch/assets/*` hit the default behavior and were sent to Lambda, which returned 404 HTML. The S3 assets bucket existed and was populated, but was not attached as an origin and had no path pattern routing to it.

So the issue was **routing** (behavior/origin), not base path, double prefix, or MIME type.

---

## 5. Fix implemented

**Files changed:** `sst.config.ts`

1. **Resolve assets bucket at deploy time**  
   At the start of `run()`, use `aws s3api list-buckets` (via `execSync`) to find the existing SST assets bucket (`memory-driver-launch-*-mywebassetsbucket-*`) and set `assetsBucketDomain` (e.g. `bucket.s3.us-east-1.amazonaws.com`). This avoids referencing `site` before it is initialized inside the cdn transform.

2. **Origin Access Control (OAC)**  
   Create `aws.cloudfront.OriginAccessControl("MyWebAssetsOAC", ...)` so CloudFront can access the S3 bucket.

3. **CDN transform (inside TanStackStart)**  
   In `transform.cdn`:
   - Append a second origin: S3 with `domainName: assetsBucketDomain`, `originAccessControlId: assetsOac.id`, `originId: "MyWebAssets"`.
   - Prepend an ordered cache behavior: `pathPattern: "/assets/*"`, `targetOriginId: "MyWebAssets"`, with CachingOptimized and GET/HEAD/OPTIONS.

4. **Viewer-request rewrite**  
   `edge.viewerRequest.injection`: if `event.request.uri` starts with `/mdlaunch/assets/`, rewrite to `/assets/` + the rest, so CloudFront forwards a path that matches S3 keys (`assets/...`).

**Why this matches the root cause:** Static assets are now served from S3 via a dedicated origin and cache behavior; only the path is rewritten so S3 keys (no `mdlaunch` prefix) are used correctly.

---

## 6. Post-fix verification

- [x] Homepage loads at `/mdlaunch` (200).
- [x] CSS request returns 200.
- [x] CSS `content-type` is `text/css` (or `text/css;charset=UTF-8`).
- [x] CSS response body is actual CSS (not HTML).
- [x] DevTools: styles applied; no CSP/MIME errors (from headers/body).
- [x] Deep link `/mdlaunch/registration` works and retains styling (200).
- [x] Final mapping: `/mdlaunch/assets/*` → S3 origin; `/mdlaunch/*` (HTML) → Lambda origin.

**Note:** On the very first deploy (no assets bucket yet), the bucket lookup can be empty; the next deploy will add the S3 origin and behaviors so styles work from then on.

---

## logo.svg (and root public files) 404 — Fix

Same S3 bucket stores root-level public files at keys `logo.svg`, `logo.png`, `vite.svg` (no `mdlaunch/` or `assets/` prefix). The app requests `/mdlaunch/logo.svg` (from `BASE_URL + "logo.svg"`). That path hit the default behavior (Lambda) and returned 404.

**Fix:** In `sst.config.ts`: (1) Viewer-request injection rewrites `/mdlaunch/logo.svg` → `/logo.svg`, and same for `logo.png`, `vite.svg`. (2) Ordered cache behaviors for `/logo.svg`, `/logo.png`, `/vite.svg` route those paths to the S3 origin (MyWebAssets). After rewrite, `/logo.svg` is served from S3 key `logo.svg` with `content-type: image/svg+xml`.
