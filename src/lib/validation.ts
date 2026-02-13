import { z } from 'zod';

const emailSchema = z.string().min(1, 'Email is required.').email('Please enter a valid email address.');
const nameMin = z.string().trim().min(2, 'Name must be at least 2 characters.');
const requiredString = (msg = 'This field is required.') => z.string().trim().min(1, msg);

/** Optional URL: empty string or valid URL */
export const optionalUrlSchema = z
  .string()
  .transform((s) => (typeof s === 'string' ? s.trim() : ''))
  .refine((s) => s === '' || isValidUrl(s), { message: 'Must be a valid URL or empty.' });

function isValidUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

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
