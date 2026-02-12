import { createServerFn } from '@tanstack/react-start';
import { Resource } from 'sst';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESClient({});

interface ContactFormInput {
  name: string;
  email: string;
  message: string;
}

export const submitContactForm = createServerFn({ method: 'POST' })
  // Use inputValidator to clear the "Property validator does not exist" error
  .inputValidator((data: ContactFormInput) => data)
  .handler(async ({ data }) => {
    // 1. Save to DynamoDB
    await db.send(new PutCommand({
      TableName: Resource.FormData.name,
      Item: {
        email: data.email,
        name: data.name,
        message: data.message,
        createdAt: new Date().toISOString(),
      },
    }));

    // 2. Send Confirmation Email
    await ses.send(new SendEmailCommand({
      Source: Resource.MyEmail.sender,
      Destination: { ToAddresses: [data.email] },
      Message: {
        Subject: { Data: "Form Received" },
        Body: { Text: { Data: `Hi ${data.name}, we received your message.` } },
      },
    }));

    return { success: true };
  });