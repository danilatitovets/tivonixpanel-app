import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";

const FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  email: "Email",
  telegram: "Telegram",
  phone: "Phone",
  password: "Password",
  confirmPassword: "Confirm password",
  partnerType: "Partnership type",
  acceptTerms: "Terms acceptance",
  agencyName: "Agency",
  websiteUrl: "Website",
};

function translateIssueMessage(message: string): string {
  const exact: Record<string, string> = {
    Required: "Required field",
    "Invalid email": "Enter a valid email",
    "Invalid option: expected one of \"referral\"|\"white_label\"":
      "Select a partnership type",
    "Invalid input: expected string, received undefined": "Fill in this field",
    "Invalid input: expected boolean, received undefined": "You must accept this condition",
  };
  if (exact[message]) return exact[message];
  if (/expected string/i.test(message)) return "Fill in this field";
  if (/expected boolean/i.test(message)) return "You must accept this condition";
  if (/Invalid email/i.test(message)) return "Enter a valid email";
  if (/at least (\d+)/i.test(message)) {
    const n = message.match(/at least (\d+)/i)?.[1];
    return `At least ${n} characters`;
  }
  if (/Invalid option/i.test(message)) return "Select a value from the list";
  if (/Invalid literal/i.test(message)) return "You must accept this condition";
  return message;
}

export function zodToFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  const flat = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  for (const [field, messages] of Object.entries(flat)) {
    const msg = messages?.[0];
    if (!msg) continue;
    out[field] = translateIssueMessage(msg);
  }
  return out;
}

export function validationErrorResponse(error: ZodError, status = 400) {
  const fieldErrors = zodToFieldErrors(error);
  const firstField = Object.keys(fieldErrors)[0];
  const firstMessage = firstField
    ? `${FIELD_LABELS[firstField] ?? firstField}: ${fieldErrors[firstField]}`
    : "Please check the entered data";

  return NextResponse.json(
    {
      code: "VALIDATION_ERROR",
      message: firstMessage,
      error: firstMessage,
      fieldErrors,
      requestId: randomUUID(),
    },
    { status }
  );
}

export function apiErrorJson(
  message: string,
  status: number,
  extra?: { code?: string; fieldErrors?: Record<string, string> }
) {
  return NextResponse.json(
    {
      code: extra?.code ?? (status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : "ERROR"),
      message,
      error: message,
      fieldErrors: extra?.fieldErrors,
      requestId: randomUUID(),
    },
    { status }
  );
}
