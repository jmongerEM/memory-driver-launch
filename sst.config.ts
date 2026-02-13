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
          profile: "memorydriver-dev"
        }
      }
    };
  },
  async run() {
    // This global transform intercepts all Function creations (including the TanStack server)
    // It bypasses the strict TypeScript interfaces of the high-level components.
    // 1. Force the creation of the Function URL on all functions
    $transform(sst.aws.Function, (args) => {
      args.url = true;
    });

    // 2. Intercept the Permission resource to add the missing InvokeFunction statement
    // This fixes the 403 Forbidden by allowing public access to the function code itself.
    $transform(aws.lambda.Permission, (args, opts, name) => {
      // SST names the URL permission resource containing "URLInvokePermission"
      if (name.includes("URLInvokePermission")) {
        new aws.lambda.Permission(`${name}InvokeFunction`, {
          action: "lambda:InvokeFunction",
          function: args.function,
          principal: "*",
          functionUrlAuthType: "NONE",
        }, { parent: opts.parent });
      }
    });

    // 1. Create the DynamoDB Table (composite key: pk + sk; TTL for rate-limit cleanup)
    const table = new sst.aws.Dynamo("FormData", {
      fields: {
        pk: "string",
        sk: "string",
      },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
      ttl: "expireAt",
    });

    // 2. Setup SES Email with Import to avoid AlreadyExistsException
    const email = new sst.aws.Email("MyEmail", {
      sender: "jmonger@evonmedics.org",
      transform: {
        identity: (_, opts) => {
          opts.import = "jmonger@evonmedics.org";
        },
      },
    });

    // 3. Deploy the TanStack Start application (served under base path /mdlaunch)
    // App is built with Vite base + TanStack Router basepath = /mdlaunch. CloudFront behavior
    // must route /mdlaunch* to this origin; no rewrites strip the prefix — prefix preserved.
    const site = new sst.aws.TanStackStart("MyWeb", {

      link: [table, email],
      // Set to 'none' to allow public access via CloudFront/Function URL
      environment: {
        // This forces SST to see a 'change' and re-run the build callback
        DEPLOY_TIMESTAMP: Date.now().toString(),
      },
      protection: "none",
      transform: {
        cdn: (args) => {
          // AWS Managed Policy: AllViewerExceptHostHeader (ID: b689...)
          // This prevents the 403 error by ensuring Lambda doesn't see the CloudFront Host header
          if (args.defaultCacheBehavior && typeof args.defaultCacheBehavior === "object") {
            (args.defaultCacheBehavior as any).originRequestPolicyId =
              "b689b0a8-53d0-40ab-baf2-68738e2966ac";
          }
        },
      },
    });

    return {
      tableName: table.name,
      siteUrl: site.url,
    };
  },
});
