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

export interface RegistrationFormInput {
  name: string;
  email: string;
  country: string;
  state: string;
  phone?: string;
  referralSource?: string;
  isAmbassador: boolean;
}

export const submitRegistrationForm = createServerFn({ method: 'POST' })
  .inputValidator((data: RegistrationFormInput) => data)
  .handler(async ({ data }) => {
    await db.send(new PutCommand({
      TableName: Resource.FormData.name,
      Item: {
        type: 'app_user',
        email: data.email,
        name: data.name,
        country: data.country,
        state: data.state,
        ...(data.phone != null && data.phone !== '' && { phone: data.phone }),
        ...(data.referralSource != null && data.referralSource !== '' && { referralSource: data.referralSource }),
        isAmbassador: data.isAmbassador ?? false,
        createdAt: new Date().toISOString(),
      },
    }));
    return { success: true };
  });

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