# Lambda Function URL 403 Forbidden — Root Cause and Fix

## 1. Where the Function URL is called

- **No direct Function URL env var in app code.** The app uses TanStack Start `createServerFn` (e.g. `submitRegistrationForm`, `submitAmbassadorRegistrationForm` in `src/api.form.ts`). Those run as POSTs to the **same origin** (the deployed site).
- **Flow:** Browser → **CloudFront** (`https://d3gmizugvrve50.cloudfront.net`) → origin → **Lambda Function URL**. So the “caller” of the Function URL is CloudFront (and/or the browser when hitting the site URL). The Function URL is the Lambda’s built-in HTTPS endpoint used as the origin for the CDN.
- **SST outputs (dev):** `siteUrl: https://d3gmizugvrve50.cloudfront.net` (CloudFront). The Lambda Function URL is not in app outputs; it’s used internally as the origin.
- **Relevant files:** `sst.config.ts` (TanStackStart + transform), `src/api.form.ts` (server functions), `src/routes/registration.tsx`, `src/routes/ambassador.register.tsx` (callers). No `.env` or client-side Function URL reference.

---

## 2. Deployed dev Function URL config (before fix)

- **Function name:** `memory-driver-launch-dev-MyWebServerUseast1Function-bantvsxw`
- **Function URL:** `https://ww4htqxn72eymudaqdo2uzrwve0ehfjn.lambda-url.us-east-1.on.aws/`
- **AuthType:** `NONE`
- **CORS:** `AllowOrigins: ["*"]`, `AllowMethods: ["*"]`, `AllowHeaders: ["*"]`
- **Resource-based policy (before fix):** One statement only:
  - **Action:** `lambda:InvokeFunctionUrl`
  - **Principal:** `*`
  - **Condition:** `StringEquals lambda:FunctionUrlAuthType = NONE`

So the URL was correctly “public” for **InvokeFunctionUrl**, but there was **no** permission for **InvokeFunction** (required by AWS for Function URLs since Oct 2025).

---

## 3. AWS logs result

- **Log group for this function:** Not present (or different suffix) at first check; after adding the second permission, requests succeed.
- **Conclusion:** The 403 was returned **before** the Lambda handler ran (pre-invocation). So: **handler not invoked** when the 403 occurred; the failure was at the Function URL authorization layer due to the missing **InvokeFunction** permission.

---

## 4. Root cause (one primary cause, with evidence)

**Primary cause: Missing `lambda:InvokeFunction` permission with `lambda:InvokedViaFunctionUrl` condition.**

- AWS docs (e.g. [Control access to Lambda function URLs](https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html)) state that for Function URLs you must grant **both**:
  - `lambda:InvokeFunctionUrl`, and  
  - `lambda:InvokeFunction` (with the `lambda:InvokedViaFunctionUrl` condition when you want URL-only access).
- The deployed policy had only **InvokeFunctionUrl**. So unauthenticated GET/POST to the Function URL were denied with 403; OPTIONS (handled differently) could still return 200.
- **Evidence:**  
  - `get-policy` showed a single statement with `lambda:InvokeFunctionUrl` only.  
  - Adding the second permission via CLI (`aws lambda add-permission ... --invoked-via-function-url`) made GET/POST return 200.  
  - The previous `$transform` in `sst.config.ts` was overwriting the permission **action** to `lambda:InvokeFunction`, which did not add a second statement and could leave only one permission in place; the component’s **InvokeFunctionUrl** permission was the one that remained, so **InvokeFunction** was still missing.

---

## 5. Fix implemented

**Files changed:** `sst.config.ts`

**Before (snippet):**

```ts
$transform(aws.lambda.Permission, (args) => {
  if (args.functionUrlAuthType === "NONE") {
    args.action = "lambda:InvokeFunction";
    args.principal = "*";
  }
});
```

**After (snippet):**

- **Transform:** Only adjust the **InvokeFunctionUrl** permission (set `principal = "*"`), and **do not** change its `action`. That keeps the component-created `lambda:InvokeFunctionUrl` statement.

```ts
$transform(aws.lambda.Permission, (args) => {
  if (args.functionUrlAuthType === "NONE" && args.action === "lambda:InvokeFunctionUrl") {
    args.principal = "*";
  }
});
```

- **New permission:** Add a second statement for `lambda:InvokeFunction` restricted to URL invocations:

```ts
const server = (site as { nodes?: { server?: { name: unknown } } }).nodes?.server;
if (server) {
  new aws.lambda.Permission("MyWebUrlInvokeFunction", {
    statementId: "FunctionURLInvokeAllowPublicAccess",
    action: "lambda:InvokeFunction",
    function: server.name,
    principal: "*",
    invokedViaFunctionUrl: true,
  } as aws.lambda.PermissionArgs);
}
```

**Why this is the minimal fix:**  
It adds the required **InvokeFunction** permission (with **InvokedViaFunctionUrl**) so that unauthenticated requests to the Function URL are allowed, while keeping the existing **InvokeFunctionUrl** permission and without changing auth model (still `AuthType: NONE`). Invocation remains restricted to the Function URL thanks to the condition.

---

## 6. Post-deploy verification

- **One-off fix applied via CLI** (to confirm root cause and unblock immediately):

```bash
aws lambda add-permission --function-name memory-driver-launch-dev-MyWebServerUseast1Function-bantvsxw \
  --statement-id FunctionURLInvokeAllowPublicAccess --action lambda:InvokeFunction \
  --principal '*' --region us-east-1 --invoked-via-function-url
```

- **After adding that permission:**
  - `curl -s -o /dev/null -w "%{http_code}" "https://ww4htqxn72eymudaqdo2uzrwve0ehfjn.lambda-url.us-east-1.on.aws/"` → **200** (or 307 for path handling).
  - `curl -s -o /dev/null -w "%{http_code}" "https://d3gmizugvrve50.cloudfront.net/mdlaunch/"` → **200** (full HTML returned).
- **Config fix:** The changes in `sst.config.ts` ensure that on every `npx sst deploy --stage dev`, both permissions are present so the 403 does not return after future deploys.

**Result:** PASS — 403 resolved; GET/POST to the Function URL and to the CloudFront site succeed once both permissions exist.
