import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { getLegalDocumentByType } from "@/lib/legal-documents-content";
import {
  legalOnboardingSchema,
  validateLegalAge,
  calculateAge,
  type LegalOnboardingInput,
} from "@/lib/validation/legal";
import { setPasswordSchema } from "@/lib/validation/users";

const DOC_TYPES = [
  { type: "terms", accepted: "acceptTerms" },
  { type: "privacy", accepted: "acceptPrivacy" },
  { type: "personal_data_consent", accepted: "acceptPersonalData" },
  { type: "partner_agreement", accepted: "acceptPartnerAgreement" },
  { type: "commission_rules", accepted: "acceptCommissionRules" },
  { type: "cookies", accepted: "acceptCookies" },
] as const;

function profileRow(
  userId: string,
  data: LegalOnboardingInput,
  age: number,
  status: {
    onboarding_status: "blocked_under_16" | "completed";
    crm_access: boolean;
    payout_status: "blocked" | "pending_admin_review";
  }
) {
  return {
    user_id: userId,
    full_name: data.fullName.trim(),
    email: data.email.trim(),
    telegram: null,
    phone: null,
    city: data.city?.trim() || null,
    country: data.country.trim(),
    tax_residence_country: data.country.trim(),
    date_of_birth: data.dateOfBirth,
    age,
    partner_legal_status: "individual" as const,
    unp: data.unp ?? null,
    organization_name: data.organizationName ?? null,
    payout_preference: data.payoutPreference ?? null,
    preferred_currency: data.preferredCurrency,
    onboarding_status: status.onboarding_status,
    crm_access: status.crm_access,
    payout_status: status.payout_status,
  };
}

function fail(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const current = auth.user!;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Некорректный запрос", 400);
  }

  const parsed = legalOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const age = calculateAge(data.dateOfBirth);
  const admin = createAdminClient();
  const supabase = await createClient();

  if (!validateLegalAge(data.dateOfBirth)) {
    const { error: blockErr } = await admin.from("user_legal_profiles").upsert(
      profileRow(current.authId, data, age, {
        onboarding_status: "blocked_under_16",
        crm_access: false,
        payout_status: "blocked",
      }),
      { onConflict: "user_id" }
    );
    if (blockErr) {
      console.error("[onboarding/legal] under-16 upsert", blockErr.message);
      return fail("Не удалось сохранить данные");
    }

    await admin.from("consent_events").insert({
      user_id: current.authId,
      event_type: "access_blocked",
      metadata: { reason: "under_16", age },
    });

    return NextResponse.json({ blocked: true, reason: "under_16" }, { status: 403 });
  }

  for (const doc of DOC_TYPES) {
    if (!data[doc.accepted]) {
      return fail("Примите все условия и документы", 400);
    }
  }

  const { data: activeDocs, error: docsErr } = await admin
    .from("legal_documents")
    .select("type, version")
    .eq("status", "active");
  if (docsErr) {
    console.error("[onboarding/legal] documents", docsErr.message);
  }

  await admin
    .from("legal_acceptances")
    .update({ is_active: false })
    .eq("user_id", current.authId)
    .eq("is_active", true);

  const acceptanceRows = DOC_TYPES.map((doc) => {
    const active = activeDocs?.find((d) => d.type === doc.type);
    const staticDoc = getLegalDocumentByType(doc.type);
    return {
      user_id: current.authId,
      document_type: doc.type,
      document_version: active?.version ?? staticDoc?.version ?? "1.0",
      consent_text_snapshot: staticDoc?.title ?? doc.type,
      policy_url: `/legal/${doc.type.replace(/_/g, "-")}`,
      acceptance_method: "checkbox",
      is_active: true,
    };
  });

  const { error: acceptErr } = await admin.from("legal_acceptances").insert(acceptanceRows);
  if (acceptErr) {
    console.error("[onboarding/legal] acceptances", acceptErr.message);
    return fail("Не удалось сохранить согласие с документами");
  }

  // Service role: partners cannot flip crm_access / payout_status via RLS.
  const { error: upsertErr } = await admin.from("user_legal_profiles").upsert(
    profileRow(current.authId, data, age, {
      onboarding_status: "completed",
      crm_access: true,
      payout_status: "pending_admin_review",
    }),
    { onConflict: "user_id" }
  );
  if (upsertErr) {
    console.error("[onboarding/legal] profile upsert", upsertErr.message);
    return fail("Не удалось сохранить оформление. Попробуйте ещё раз");
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      full_name: data.fullName.trim(),
      email: data.email.trim(),
    })
    .eq("user_id", current.authId);
  if (profileErr) {
    console.error("[onboarding/legal] profile name", profileErr.message);
  }

  await admin.from("consent_events").insert({
    user_id: current.authId,
    event_type: "onboarding_completed",
    metadata: { age },
  });

  await supabase.rpc("write_audit_log", {
    p_action: "legal_onboarding_completed",
    p_entity_type: "user_legal_profile",
    p_entity_id: null,
  });

  let passwordSet = false;
  const passwordParsed = setPasswordSchema.safeParse(body);
  if (passwordParsed.success) {
    const { error: passwordErr } = await supabase.auth.updateUser({
      password: passwordParsed.data.password,
      data: { must_change_password: false },
    });
    if (passwordErr) {
      console.error("[onboarding/legal] password", passwordErr.message);
    } else {
      passwordSet = true;
      await supabase.rpc("write_audit_log", {
        p_action: "password_changed",
        p_entity_type: "user",
        p_entity_id: current.authId,
      });
    }
  }

  return NextResponse.json({ success: true, crmAccess: true, passwordSet });
}
