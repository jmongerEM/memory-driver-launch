/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "memory-driver-launch",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          profile: "memorydriver-dev",
          region: "us-east-1"
        }
      }
    };
  },
  async run() {
    const { execSync } = await import("node:child_process");
    // Resolve assets bucket domain so /mdlaunch/assets/* can be routed to S3 (avoids referencing site before init in cdn transform).
    let assetsBucketDomain: string | null = null;
    try {
      const out = execSync(
        `aws s3api list-buckets --query "Buckets[?starts_with(Name, 'memory-driver-launch-') && contains(Name, 'mywebassetsbucket')].Name" --output text`,
        { encoding: "utf-8", env: { ...process.env, AWS_PROFILE: "memorydriver-dev" } }
      );
      const name = out.trim().split(/\s+/)[0];
      if (name) assetsBucketDomain = `${name}.s3.us-east-1.amazonaws.com`;
    } catch {
      // First deploy or bucket not created yet; next deploy will add S3 origin.
    }

    const table = new sst.aws.Dynamo("FormData", {
      fields: { pk: "string", sk: "string" },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
      ttl: "expireAt",
    });

    const email = new sst.aws.Email("MyEmail", {
      sender: "jmonger@evonmedics.org",
      transform: {
        identity: (_, opts) => { opts.import = "jmonger@evonmedics.org"; },
      },
    });

    // Origin Access Control so CloudFront can access the assets S3 bucket.
    const assetsOac = new aws.cloudfront.OriginAccessControl("MyWebAssetsOAC", {
      name: "MyWebAssetsOAC",
      originAccessControlOriginType: "s3",
      signingBehavior: "always",
      signingProtocol: "sigv4",
    });

    const site = new sst.aws.TanStackStart("MyWeb", {
      link: [table, email],
      environment: { DEPLOY_TIMESTAMP: Date.now().toString() },
      protection: "none",
      transform: {
        server: (args) => {
          args.url = { authorization: "none" };
        },
        cdn: (args) => {
          if (args.defaultCacheBehavior) {
            (args.defaultCacheBehavior as any).originRequestPolicyId = "b689b0a8-53d0-40ab-baf2-68738e2966ac";
          }
          if (!assetsBucketDomain || !(args as any).origins) return;
          const existingOrigins = Array.isArray((args as any).origins) ? (args as any).origins : [(args as any).origins];
          (args as any).origins = [
            ...existingOrigins,
            {
              domainName: assetsBucketDomain,
              originAccessControlId: assetsOac.id,
              originId: "MyWebAssets",
            },
          ];
          const existingBehaviors = (args as any).orderedCacheBehaviors ?? [];
          const s3Behavior = (pathPattern: string) => ({
            pathPattern,
            targetOriginId: "MyWebAssets",
            allowedMethods: ["GET", "HEAD", "OPTIONS"],
            cachedMethods: ["GET", "HEAD"],
            compress: true,
            viewerProtocolPolicy: "redirect-to-https",
            cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
          });
          (args as any).orderedCacheBehaviors = [
            s3Behavior("/logo.svg"),
            s3Behavior("/logo.png"),
            s3Behavior("/vite.svg"),
            s3Behavior("/ambassador_card_image.png"),
            s3Behavior("/premier_card_image.png"),
            s3Behavior("/assets/*"),
            ...existingBehaviors,
          ];
        },
      },
      edge: {
        viewerRequest: {
          injection: [
            `if (event.request.uri && event.request.uri.startsWith("/mdlaunch/assets/")) { event.request.uri = "/assets/" + event.request.uri.slice("/mdlaunch/assets/".length); }`,
            `if (event.request.uri === "/mdlaunch/logo.svg") { event.request.uri = "/logo.svg"; }`,
            `if (event.request.uri === "/mdlaunch/logo.png") { event.request.uri = "/logo.png"; }`,
            `if (event.request.uri === "/mdlaunch/vite.svg") { event.request.uri = "/vite.svg"; }`,
            `if (event.request.uri === "/mdlaunch/ambassador_card_image.png") { event.request.uri = "/ambassador_card_image.png"; }`,
            `if (event.request.uri === "/mdlaunch/premier_card_image.png") { event.request.uri = "/premier_card_image.png"; }`,
          ].join(" "),
        },
      },
    });

    // Keep InvokeFunctionUrl permission as-is; only ensure principal is public when auth is NONE.
    $transform(aws.lambda.Permission, (args) => {
      if (args.functionUrlAuthType === "NONE" && args.action === "lambda:InvokeFunctionUrl") {
        args.principal = "*";
      }
    });

    // AWS requires BOTH lambda:InvokeFunctionUrl AND lambda:InvokeFunction (with InvokedViaFunctionUrl)
    // for Function URLs since Oct 2025. The component only creates InvokeFunctionUrl; add the second.
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

    // FIX FOR TS 2339: Access the property safely via .apply() if needed for logging
    // However, for the return block, it is best to keep it simple.
    return {
      tableName: table.name,
      siteUrl: site.url, // This is the CloudFront URL
    };
  },
});