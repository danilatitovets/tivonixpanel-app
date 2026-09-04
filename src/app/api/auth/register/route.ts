import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { partnerRegisterSchema } from "@/lib/validation/partner-registration";
import { notifyAdminPartnerApplication } from "@/lib/telegram-notify";
import { allowRegisterAttempt } from "@/lib/auth/rate-limit";
import { getLegalDocumentByType } from "@/lib/legal-documents-content";
import { getPublicAppOrigin } from "@/lib/app-url";
import { toUserMessage } from "@/lib/errors";
import { validationErrorResponse } from "@/lib/api/validation-response";

const MAX_BODY_BYTES = 16_384;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function normalizeTelegram(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function normalizeWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function safeClientError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

async function recordRegistrationConsents(userId: string) {
  const admin = createAdminClient();
  const { data: activeDocs } = await admin
    .from("legal_documents")
    .select("type, version")
    .eq("status", "active")
    .in("type", ["terms", "privacy"]);

  for (const type of ["terms", "privacy"] as const) {
    const active = activeDocs?.find((d) => d.type === type);
    if (!active) continue;
    const staticDoc = getLegalDocumentByType(type);
    await admin.from("legal_acceptances").insert({
      user_id: userId,
      document_type: type,
      document_version: active.version,
      consent_text_snapshot: staticDoc?.title ?? type,
      policy_url: `/legal/${type}`,
      acceptance_method: "checkbox",
    });
  }

  await admin.from("consent_events").insert({
    user_id: userId,
    event_type: "document_accepted",
    metadata: {
      source: "partner_self_registration",
      documents: ["terms", "privacy"],
    },
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return safeClientError("Request too large", 413);
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return safeClientError("Request too large", 413);
    }
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return safeClientError("Invalid request", 400);
  }

  if (!body || typeof body !== "object") {
    return safeClientError("Invalid request", 400);
  }

  // Strip privilege-escalation attempts before validation
  const unsafe = body as Record<string, unknown>;
  delete unsafe.role;
  delete unsafe.status;
  delete unsafe.commissionPercentOverride;
  delete unsafe.assignedManagerId;
  delete unsafe.reviewedBy;
  delete unsafe.partner_type;

  const parsed = partnerRegisterSchema.safeParse({
    ...unsafe,
    email: typeof unsafe.email === "string" ? normalizeEmail(unsafe.email) : unsafe.email,
  });

  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const input = parsed.data;
  const email = normalizeEmail(input.email);
  const telegram = normalizeTelegram(input.telegram);
  const websiteUrl = normalizeWebsite(input.websiteUrl);
  const agencyName = input.agencyName?.trim() || null;

  const rate = await allowRegisterAttempt(request, email);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a few minutes and try again" },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      }
    );
  }

  try {
    const admin = createAdminClient();

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existingProfile) {
      return safeClientError("A user with this email is already registered", 409);
    }

    const supabase = await createClient();
    const origin = getPublicAppOrigin(request);

    // Password is never logged or returned
    const { data: signedUp, error: signUpError } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/pending`,
        data: {
          full_name: input.fullName,
          telegram,
          agency_name: agencyName ?? "",
          website_url: websiteUrl ?? "",
          partner_type: input.partnerType,
        },
      },
    });

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        return safeClientError("A user with this email is already registered", 409);
      }
      if (msg.includes("rate limit")) {
        return NextResponse.json(
          { error: "Too many attempts. Wait and try again" },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
      return safeClientError(
        toUserMessage(signUpError.message, "Could not create account"),
        400
      );
    }

    const userId = signedUp.user?.id;
    if (!userId) {
      return safeClientError("Could not create account", 500);
    }

    // Supabase may return a user without identities when email already exists (anti-enumeration)
    const identities = signedUp.user?.identities ?? [];
    if (Array.isArray(identities) && identities.length === 0) {
      return safeClientError("A user with this email is already registered", 409);
    }

    let profileUpdated = false;
    for (let attempt = 0; attempt < 5 && !profileUpdated; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 300 * attempt));

      const { data: updatedRows, error: profileErr } = await admin
        .from("profiles")
        .update({
          full_name: input.fullName,
          email,
          telegram,
          agency_name: agencyName,
          website_url: websiteUrl,
          partner_type: input.partnerType,
          role: "partner",
          status: "pending",
        })
        .eq("user_id", userId)
        .select("id");

      if (profileErr) {
        console.error("[register] profile update failed", profileErr.code);
        return safeClientError("Could not save application", 500);
      }
      profileUpdated = Boolean(updatedRows && updatedRows.length > 0);
    }

    if (!profileUpdated) {
      const { data: insertedRows, error: insertErr } = await admin
        .from("profiles")
        .insert({
          user_id: userId,
          full_name: input.fullName,
          email,
          telegram,
          agency_name: agencyName,
          website_url: websiteUrl,
          partner_type: input.partnerType,
          role: "partner",
          status: "pending",
        })
        .select("id");

      if (insertErr) {
        console.error("[register] profile insert failed", insertErr.code);
      } else {
        profileUpdated = Boolean(insertedRows && insertedRows.length > 0);
      }
    }

    if (!profileUpdated) {
      console.error("[register] profile row missing after signup", userId);
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch (cleanupErr) {
        console.error(
          "[register] cleanup failed",
          cleanupErr instanceof Error ? cleanupErr.message : "unknown"
        );
      }
      return safeClientError("Could not save application. Please try again", 500);
    }

    try {
      await recordRegistrationConsents(userId);
    } catch (consentErr) {
      console.error(
        "[register] consent record failed",
        consentErr instanceof Error ? consentErr.message : "unknown"
      );
      // Do not roll back account — consents are re-collected at legal onboarding
    }

    // Ensure user_legal_profiles exists (I-013): onboarding will fill real KYC fields.
    // Do not grant CRM until legal onboarding completes.
    try {
      await admin.from("user_legal_profiles").upsert(
        {
          user_id: userId,
          full_name: input.fullName,
          email,
          country: "Unknown",
          tax_residence_country: "Unknown",
          date_of_birth: "1990-01-01",
          age: 36,
          partner_legal_status: "individual",
          onboarding_status: "not_started",
          crm_access: false,
          payout_status: "pending_admin_review",
          preferred_currency: "USD",
        },
        { onConflict: "user_id", ignoreDuplicates: true }
      );
    } catch (ulpErr) {
      console.error(
        "[register] legal profile stub failed",
        ulpErr instanceof Error ? ulpErr.message : "unknown"
      );
    }

    void notifyAdminPartnerApplication({
      fullName: input.fullName,
      email,
      telegram,
      partnerType: input.partnerType,
      agencyName,
    }).catch(() => {
      /* best-effort */
    });

    const needsEmailConfirmation = !signedUp.session;

    return NextResponse.json({
      data: {
        email,
        partnerType: input.partnerType,
        status: "pending",
        needsEmailConfirmation,
      },
    });
  } catch (err) {
    console.error(
      "[register] unexpected error",
      err instanceof Error ? err.message : "unknown"
    );
    return safeClientError("Could not submit application", 500);
  }
}
