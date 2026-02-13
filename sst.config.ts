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