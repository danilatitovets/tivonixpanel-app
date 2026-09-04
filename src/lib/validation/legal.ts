import { z } from "zod";

const MIN_AGE = 16;

export const legalOnboardingSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  city: z.string().trim().max(120).optional().nullable(),
  country: z.string().trim().min(2).max(120),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  unp: z.string().max(32).optional().nullable(),
  organizationName: z.string().max(200).optional().nullable(),
  payoutPreference: z.enum(["card", "bank", "usdt", "other"]).optional().nullable(),
  preferredCurrency: z.string().max(8).default("USD"),
  acceptTerms: z.literal(true),
  acceptPrivacy: z.literal(true),
  acceptPersonalData: z.literal(true),
  acceptPartnerAgreement: z.literal(true),
  acceptCommissionRules: z.literal(true),
  acceptCookies: z.literal(true),
});

export function calculateAge(dateOfBirth: string): number {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const dob = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function validateLegalAge(dateOfBirth: string): boolean {
  return calculateAge(dateOfBirth) >= MIN_AGE;
}

export type LegalOnboardingInput = z.infer<typeof legalOnboardingSchema>;
