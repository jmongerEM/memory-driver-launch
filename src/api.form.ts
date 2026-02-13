import { createServerFn } from '@tanstack/react-start';
import { Resource } from 'sst';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import {
  registrationFormSchema,
  ambassadorFormSchema,
  type RegistrationFormInput,
  type AmbassadorRegistrationFormInput,
} from './lib/validation';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESClient({});

const FORM_TYPES = {
  app_user: 'app_user',
  ambassador_registration: 'ambassador_registration',
} as const;

function ensureResources(): void {
  if (!Resource?.FormData?.name) {
    throw new Error('Missing SST resource binding: FormData');
  }
  if (!Resource?.MyEmail?.sender) {
    throw new Error('Missing SST resource binding: MyEmail');
  }
}

/** Get client IP from request (when available) for rate limiting. */
function getClientIp(): string {
  try {
    const g = globalThis as unknown as { __webRequest?: { headers?: { get?: (name: string) => string | null } } };
    const request = g?.__webRequest;
    const forwarded = request?.headers?.get?.('x-forwarded-for');
    if (forwarded) {
      const first = forwarded.split(',')[0]?.trim();
      if (first) return first;
    }
    const realIp = request?.headers?.get?.('x-real-ip');
    if (realIp) return realIp.trim();
  } catch {
    // Request may not be available in all runtimes
  }
  return 'unknown';
}

const RATE_LIMIT_MAX_PER_MINUTE = 5;

async function checkRateLimit(): Promise<void> {
  ensureResources();
  const ip = getClientIp();
  const now = Date.now();
  const minuteWindow = Math.floor(now / 60_000);
  const ttlSeconds = Math.floor(now / 1000) + 120; // expire in 2 minutes

  const pk = `RATELIMIT#${ip}`;
  const sk = String(minuteWindow);

  try {
    await db.send(
      new UpdateCommand({
        TableName: Resource.FormData.name,
        Key: { pk, sk },
        UpdateExpression:
          'ADD #c :one SET expireAt = :exp',
        ConditionExpression:
          'attribute_not_exists(#c) OR #c < :max',
        ExpressionAttributeNames: { '#c': 'count' },
        ExpressionAttributeValues: {
          ':one': 1,
          ':max': RATE_LIMIT_MAX_PER_MINUTE,
          ':exp': ttlSeconds,
        },
      })
    );
  } catch (err: unknown) {
    const isConditionFailure =
      err &&
      typeof err === 'object' &&
      'name' in err &&
      (err as { name?: string }).name === 'ConditionalCheckFailedException';
    if (isConditionFailure) {
      console.warn('[abuse] Rate limit exceeded', { ip, minuteWindow });
      throw new Error('Too many submissions. Please try again in a minute.');
    }
    throw err;
  }
}

function buildPkSk(
  email: string,
  type: keyof typeof FORM_TYPES,
  createdAt: string
): { pk: string; sk: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const timestamp = createdAt.replace(/[^0-9TZ:-]/g, '');
  return {
    pk: `USER#${normalizedEmail}`,
    sk: `FORM#${type}#${timestamp}`,
  };
}

async function sendSesSafe(
  params: {
    Source: string;
    Destination: { ToAddresses: string[] };
    Message: { Subject: { Data: string }; Body: { Text: { Data: string } } };
  }
): Promise<boolean> {
  try {
    await ses.send(new SendEmailCommand(params));
    return true;
  } catch (err) {
    console.error('[SES] Send failed', { err, to: params.Destination.ToAddresses });
    return false;
  }
}

export type { RegistrationFormInput, AmbassadorRegistrationFormInput };

function unwrapData(arg: unknown): unknown {
  if (arg != null && typeof arg === 'object' && 'data' in arg) {
    return (arg as { data: unknown }).data;
  }
  return arg;
}

export const submitRegistrationForm = createServerFn({ method: 'POST' })
  .inputValidator((arg: unknown) =>
    registrationFormSchema.parse(unwrapData(arg))
  )
  .handler(async ({ data }) => {
    ensureResources();
    await checkRateLimit();

    const payload = data as RegistrationFormInput;
    const createdAt = new Date().toISOString();
    const { pk, sk } = buildPkSk(payload.email, FORM_TYPES.app_user, createdAt);

    await db.send(
      new PutCommand({
        TableName: Resource.FormData.name,
        Item: {
          pk,
          sk,
          type: FORM_TYPES.app_user,
          email: payload.email,
          name: payload.name,
          country: payload.country,
          state: payload.state,
          ...(payload.phone != null &&
            payload.phone !== '' && { phone: payload.phone }),
          ...(payload.referralSource != null &&
            payload.referralSource !== '' && {
              referralSource: payload.referralSource,
            }),
          isAmbassador: payload.isAmbassador ?? false,
          createdAt,
        },
      })
    );

    const emailSent = await sendSesSafe({
      Source: Resource.MyEmail.sender,
      Destination: { ToAddresses: [payload.email] },
      Message: {
        Subject: { Data: 'Registration Received' },
        Body: {
          Text: {
            Data: `Hi ${payload.name}, we have received your registration.`,
          },
        },
      },
    });
    if (!emailSent) {
      await db.send(
        new UpdateCommand({
          TableName: Resource.FormData.name,
          Key: { pk, sk },
          UpdateExpression: 'SET emailStatus = :status',
          ExpressionAttributeValues: { ':status': 'failed' },
        })
      );
    }

    return {
      success: true,
      emailSent,
      ...(emailSent ? {} : { warning: 'Confirmation email could not be sent.' }),
    };
  });

export const submitAmbassadorRegistrationForm = createServerFn({ method: 'POST' })
  .inputValidator((arg: unknown) =>
    ambassadorFormSchema.parse(unwrapData(arg))
  )
  .handler(async ({ data }) => {
    ensureResources();
    await checkRateLimit();

    const payload = data as AmbassadorRegistrationFormInput;

    const createdAt = new Date().toISOString();
    const { pk, sk } = buildPkSk(
      payload.email,
      FORM_TYPES.ambassador_registration,
      createdAt
    );

    const item: Record<string, unknown> = {
      pk,
      sk,
      type: FORM_TYPES.ambassador_registration,
      email: payload.email,
      name: payload.name,
      country: payload.country,
      state: payload.state,
      createdAt,
    };
    if (payload.phone != null && payload.phone !== '')
      item.phone = payload.phone;
    if (payload.howDidYouHear != null && payload.howDidYouHear !== '')
      item.howDidYouHear = payload.howDidYouHear;
    if (payload.previousSuccess != null && payload.previousSuccess !== '')
      item.previousSuccess = payload.previousSuccess;
    if (payload.socialInstagram != null && payload.socialInstagram !== '')
      item.socialInstagram = payload.socialInstagram;
    if (payload.socialTwitter != null && payload.socialTwitter !== '')
      item.socialTwitter = payload.socialTwitter;
    if (payload.socialFacebook != null && payload.socialFacebook !== '')
      item.socialFacebook = payload.socialFacebook;
    if (payload.socialYoutube != null && payload.socialYoutube !== '')
      item.socialYoutube = payload.socialYoutube;
    if (payload.socialLinkedIn != null && payload.socialLinkedIn !== '')
      item.socialLinkedIn = payload.socialLinkedIn;
    if (payload.socialOtherUrl != null && payload.socialOtherUrl !== '')
      item.socialOtherUrl = payload.socialOtherUrl;
    if (
      payload.conflictsOfInterest != null &&
      payload.conflictsOfInterest !== ''
    )
      item.conflictsOfInterest = payload.conflictsOfInterest;

    await db.send(
      new PutCommand({
        TableName: Resource.FormData.name,
        Item: item,
      })
    );

    const emailSent = await sendSesSafe({
      Source: Resource.MyEmail.sender,
      Destination: { ToAddresses: [payload.email] },
      Message: {
        Subject: { Data: 'Ambassador Registration Received' },
        Body: {
          Text: {
            Data: `Hi ${payload.name}, we have received your Ambassador Program registration. We will be in touch soon.`,
          },
        },
      },
    });
    if (!emailSent) {
      await db.send(
        new UpdateCommand({
          TableName: Resource.FormData.name,
          Key: { pk, sk },
          UpdateExpression: 'SET emailStatus = :status',
          ExpressionAttributeValues: { ':status': 'failed' },
        })
      );
    }

    return {
      success: true,
      emailSent,
      ...(emailSent ? {} : { warning: 'Confirmation email could not be sent.' }),
    };
  });
