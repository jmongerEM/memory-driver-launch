# Memory Driver Launch — Remediation Summary

This document summarizes the production-readiness remediation applied to the codebase: schema changes, validation, abuse protection, SES handling, dead code removal, and migration notes.

---

## 1. DynamoDB schema change (HIGH)

### Before
- **Table:** Single primary key `email` (string).
- **Risk:** Multiple flows (registration, ambassador, contact) wrote to the same table; same email caused overwrites and data loss.

### After
- **Table:** Composite primary key:
  - `pk` (string) — partition key, e.g. `USER#<email>` or `RATELIMIT#<ip>`
  - `sk` (string) — sort key, e.g. `FORM#<type>#<timestamp>` or minute window for rate limit
  - `expireAt` (number) — optional; used for TTL (rate-limit cleanup)
- **TTL:** Enabled on `expireAt` for automatic deletion of rate-limit records.
- **Writes:** Each submission gets a unique `pk`/`sk`; no overwrites. Same user can have both `app_user` and `ambassador_registration` records.

### Migration notes
- **New table:** SST will create a new DynamoDB table with the new key schema. The old table (if it existed) is not modified.
- **Backward compatibility:** Existing data in the old table is not migrated. If you had production data under the old schema:
  - Export from the old table (keyed by `email`).
  - Re-import into the new table using:
    - `pk = USER#<email>`
    - `sk = FORM#<type>#<createdAt>` (use existing `createdAt` or a new ISO string).
- **No automatic migration script** is included; run a one-off ETL if you need to move old data.

---

## 2. Server-side validation (HIGH)

### Before
- `inputValidator` was a pass-through: `(data) => data`. No server-side validation.

### After
- **Zod** is used for all form payloads.
- **Registration:** `name` (min 2 chars), `email` (valid format), `country`/`state` required; `phone`/`referralSource` optional; `isAmbassador` boolean.
- **Ambassador:** Same required step-1 fields; optional URL fields (social links, etc.) must be empty or a valid URL.
- Invalid payloads cause validation to throw; the framework returns an error to the client (no DB write, no SES).

### Files
- `src/lib/validation.ts` — Zod schemas: `registrationFormSchema`, `ambassadorFormSchema`, `optionalUrlSchema`.
- `src/api.form.ts` — All handlers use `.inputValidator((arg) => schema.parse(unwrapData(arg)))`.

---

## 3. Ambassador step-2 validation gap (MEDIUM)

### Before
- User could open `/ambassador/register?step=2` and submit with empty step-1 fields; server accepted.

### After
- **Server:** Ambassador handler validates all required fields (name, email, country, state) via Zod before any DB/SES.
- **Client:** Before calling `submitAmbassadorRegistrationForm`, step-1 is re-validated; if invalid, a popup is shown and submit is blocked.

### Files
- `src/routes/ambassador.register.tsx` — `submitRegistration()` now runs `validateStep1()` first and blocks submit when invalid.

---

## 4. SES + DynamoDB partial failure (MEDIUM)

### Before
- Flow: DB write → SES send. If SES threw, the client saw an error but the record was already stored.

### After
- **Order:** Validate → Write to DB → Attempt SES.
- **If SES fails:** Error is logged; handler still returns success; optional `emailStatus: 'failed'` is written (via `UpdateCommand` on the same item).
- **Response:** `{ success: true, emailSent: boolean, warning?: string }` when email fails.

### Files
- `src/api.form.ts` — `sendSesSafe()`, DB write first, then SES; on SES failure, `UpdateCommand` sets `emailStatus: 'failed'` and response includes `warning`.

---

## 5. Abuse protection (MEDIUM)

### Before
- Lambda URL was public (`principal: "*"`, `functionUrlAuthType: "NONE"`) with no rate limiting.

### After
- **Rate limit:** Up to 5 submissions per IP per minute (per minute window).
- **Storage:** Same DynamoDB table; keys `pk = RATELIMIT#<ip>`, `sk = <minute_window>`, `count` (incremented), `expireAt` (TTL).
- **When exceeded:** `ConditionalCheckFailedException` → handler throws with message “Too many submissions. Please try again in a minute.” and logs `[abuse] Rate limit exceeded`.
- **IP source:** Tries `globalThis.__webRequest.headers.get('x-forwarded-for')` and `x-real-ip`. If unavailable, uses `'unknown'` (all requests share one bucket).

### Optional hardening
- To use real client IP behind CloudFront/API Gateway, set `__webRequest` (or equivalent) in middleware from the incoming request so `getClientIp()` can read `x-forwarded-for` / `x-real-ip`.

---

## 6. Dead code and routing (MEDIUM)

### Before
- `submitContactForm` existed but was never used.
- `/register` was a placeholder page.

### After
- **Contact form:** Removed `submitContactForm` and `ContactFormInput` from `src/api.form.ts`. No contact route or UI.
- **/register:** Redirects to `/registration` via `beforeLoad` + `redirect({ to: '/registration' })`.

### Files
- `src/api.form.ts` — Contact form handler and types removed.
- `src/routes/register.tsx` — Replaced with redirect; minimal component that returns `null`.

---

## 7. Logo asset (LOW)

### Before
- Pages referenced `/logo.png`, which was not in the repo (broken image).

### After
- **Asset:** `public/logo.svg` added (simple “MD” + “Memory Driver” logo using Evon colors).
- **References:** All `src="/logo.png"` updated to `src="/logo.svg"` in:
  - `src/routes/index.tsx`
  - `src/routes/registration.tsx`
  - `src/routes/ambassador.register.tsx` (3 occurrences)

---

## 8. Optional URL validation (LOW)

- Ambassador social/URL fields are validated with `optionalUrlSchema`: empty allowed; non-empty must be a valid URL.
- Implemented in `src/lib/validation.ts` and used by `ambassadorFormSchema`.

---

## 9. SST resource guards (LOW)

- At the start of each handler (and in `checkRateLimit`), the code checks:
  - `Resource?.FormData?.name`
  - `Resource?.MyEmail?.sender`
- If missing, throws: `"Missing SST resource binding: FormData"` or `"Missing SST resource binding: MyEmail"`.
- Ensures fail-fast with a clear error when bindings are not injected (e.g. wrong environment).

---

## 10. Build setup

- **Script:** `npm run build` runs `tsc -b && vite build` (unchanged).
- **tsconfig.build.json** added as an optional reference config; the build still uses the default project for `tsc -b`.
- `noEmit: true` in tsconfig is intentional; Vite performs the actual emit.

---

## Changed files (concise)

| File | Changes |
|------|--------|
| `sst.config.ts` | DynamoDB: `pk`/`sk`/`expireAt`, composite primary index, TTL. |
| `package.json` | Added `zod`; build script unchanged (tsconfig.build.json not used in script). |
| `src/api.form.ts` | Composite keys, Zod validation, rate limiting, SES-safe flow, Resource guards, contact form removed. |
| `src/lib/validation.ts` | **New.** Zod schemas for registration, ambassador, optional URL. |
| `src/routes/ambassador.register.tsx` | Step-1 re-validation before submit; logo.svg. |
| `src/routes/register.tsx` | Redirect to `/registration`. |
| `src/routes/index.tsx` | logo.svg. |
| `src/routes/registration.tsx` | logo.svg. |
| `public/logo.svg` | **New.** Logo asset. |
| `tsconfig.build.json` | **New.** Optional build config reference. |
| `REMEDIATION_SUMMARY.md` | **New.** This file. |

---

## Risk reduction summary

| Risk | Before | After |
|------|--------|--------|
| Data overwrite | Same email overwrote previous record | Unique pk/sk per submission; no overwrite |
| Invalid data stored | No server validation | Zod validation; invalid requests rejected |
| Ambassador step-2 with empty step-1 | Allowed | Blocked on client and server |
| SES failure after DB write | User saw error; inconsistent state | DB first; SES failure logged, emailStatus stored; success + warning returned |
| Abuse / spam | No limit | 5 per IP per minute; abuse logged |
| Unused contact API | Live but unused | Removed |
| Ambiguous /register | Placeholder | Redirects to /registration |
| Broken logo | 404 | logo.svg in repo and referenced |
| Optional URLs | Not validated | Empty or valid URL only |
| Missing SST bindings | Possible runtime crash | Explicit check and clear error |

---

## Before vs after architecture (high level)

- **Before:** Single-key table, no server validation, single write then SES, no rate limit, contact handler unused, placeholder /register, logo missing.
- **After:** Composite-key table with TTL, Zod validation on all submissions, DB-then-SES with safe failure handling and optional `emailStatus`, DynamoDB-backed rate limit (5/IP/minute), contact removed and /register redirecting, logo asset and references fixed, optional URL validation and SST resource guards.

---

## Constraints respected

- SST deployment: Table and TTL configured in `sst.config.ts`; no breaking changes to SST usage.
- TanStack Start: Routing and server functions unchanged in structure; only validation and handler logic updated.
- DynamoDB + SES: Same AWS services; only key design and flow order changed.
- TypeScript: Strict mode preserved; all touched code type-checks.
- Build: `npm run build` completes successfully.
