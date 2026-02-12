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
    // 1. Create the DynamoDB Table
    const table = new sst.aws.Dynamo("FormData", {
      fields: { 
        email: "string" 
      },
      primaryIndex: { hashKey: "email" },
    });

    // 2. Setup SES Email
    // Note: You must verify this email in the AWS SES Console
    const email = new sst.aws.Email("MyEmail", {
      sender: "your-verified-email@domain.com", 
    });

    // 3. Deploy the TanStack Start application
    new sst.aws.TanStackStart("MyWeb", {
      link: [table, email],
    });

    return {
      tableName: table.name,
      siteUrl: "Check the output URL after deployment",
    };
  },
});