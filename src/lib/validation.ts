import { z } from 'zod';

const emailSchema = z.string().min(1, 'Email is required.').email('Please enter a valid email address.');
const nameMin = z.string().trim().min(2, 'Name must be at least 2 characters.');
const requiredString = (msg = 'This field is required.') => z.string().trim().min(1, msg);

const ALLOWED_SCHEMES = ['http:', 'https:'] as const;

/**
 * Sanitize and validate a URL for safe use.
 * - Trims whitespace.
 * - Empty string returns { ok: true, url: '' } (for optional fields).
 * - Rejects javascript:, data:, and any scheme not in ALLOWED_SCHEMES.
 * - If input has no scheme, prepends https:// (normalization).
 * Returns either a sanitized URL or an error message.
 */
export function sanitizeUrl(input: string): { ok: true; url: string } | { ok: false; error: string } {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (raw === '') return { ok: true, url: '' };
  let toParse = raw;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)) {
    toParse = `https://${raw}`;
  }
  try {
    const url = new URL(toParse);
    const scheme = url.protocol;
    if (!ALLOWED_SCHEMES.includes(scheme as (typeof ALLOWED_SCHEMES)[number])) {
      return { ok: false, error: 'Only http and https URLs are allowed.' };
    }
    return { ok: true, url: url.href };
  } catch {
    return { ok: false, error: 'Please enter a valid URL.' };
  }
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return ALLOWED_SCHEMES.includes(u.protocol as (typeof ALLOWED_SCHEMES)[number]);
  } catch {
    return false;
  }
}

/** Optional URL: empty string or valid http(s) URL (sanitized). */
export const optionalUrlSchema = z
  .string()
  .transform((s) => (typeof s === 'string' ? s.trim() : ''))
  .refine((s) => s === '' || isValidUrl(s) || sanitizeUrl(s).ok, { message: 'Must be a valid URL or empty.' });

export const registrationFormSchema = z.object({
  name: nameMin,
  email: emailSchema,
  country: requiredString('Country is required.'),
  state: requiredString('State is required.'),
  phone: z.string().optional(),
  referralSource: z.string().optional(),
  isAmbassador: z.boolean().default(false),
});

export const ambassadorFormSchema = z.object({
  name: nameMin,
  email: emailSchema,
  country: requiredString('Country is required.'),
  state: requiredString('State is required.'),
  phone: z.string().optional(),
  howDidYouHear: z.string().optional(),
  previousSuccess: z.string().optional(),
  socialInstagram: optionalUrlSchema.optional(),
  socialTwitter: optionalUrlSchema.optional(),
  socialFacebook: optionalUrlSchema.optional(),
  socialYoutube: optionalUrlSchema.optional(),
  socialLinkedIn: optionalUrlSchema.optional(),
  socialOtherUrl: optionalUrlSchema.optional(),
  conflictsOfInterest: z.string().optional(),
});

export type RegistrationFormInput = z.infer<typeof registrationFormSchema>;
export type AmbassadorRegistrationFormInput = z.infer<typeof ambassadorFormSchema>;
