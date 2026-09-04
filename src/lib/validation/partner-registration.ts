import { z } from "zod";

export const partnerTypeSchema = z.enum(["referral", "white_label"]);

export const partnerRegisterSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your first and last name")
      .max(120, "Name is too long"),
    agencyName: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : v),
      z.string().max(160, "Name is too long").optional().nullable()
    ),
    telegram: z
      .string()
      .trim()
      .min(2, "Enter your Telegram")
      .max(64, "Telegram is too long")
      .regex(
        /^(?:@)?[A-Za-z0-9_]{4,32}$|^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/[A-Za-z0-9_]{4,32}\/?$/i,
        "Enter @username or t.me/username"
      ),
    email: z
      .string()
      .trim()
      .max(255)
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email")
      .transform((v) => v.toLowerCase()),
    websiteUrl: z.preprocess(
      (v) => {
        if (v == null || v === "") return null;
        if (typeof v !== "string") return v;
        const trimmed = v.trim();
        return trimmed.length > 0 ? trimmed : null;
      },
      z
        .string()
        .max(500)
        .nullable()
        .refine((v) => v === null || /^https?:\/\//i.test(v) || /^[\w.-]+\.[\w.-]+/.test(v), {
          message: "Enter a valid URL",
        })
    ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long"),
    confirmPassword: z.string().min(8, "Confirm your password").max(128),
    partnerType: partnerTypeSchema,
    acceptTerms: z.boolean().refine((v) => v === true, {
      message: "You must accept the terms and privacy policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type PartnerRegisterInput = z.infer<typeof partnerRegisterSchema>;

export const adminPartnerApplicationUpdateSchema = z.object({
  status: z.enum(["pending", "active", "rejected", "suspended", "inactive", "blocked"]).optional(),
  partnerType: partnerTypeSchema.optional().nullable(),
  commissionPercentOverride: z.number().min(0).max(100).nullable().optional(),
  assignedManagerId: z.string().uuid().nullable().optional(),
  partnershipNotes: z.string().max(2000).nullable().optional(),
  rejectionReason: z.string().max(1000).nullable().optional(),
});

export type AdminPartnerApplicationUpdateInput = z.infer<typeof adminPartnerApplicationUpdateSchema>;
