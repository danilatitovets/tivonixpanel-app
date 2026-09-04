import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/require-api-user";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminPartnerApplicationUpdateSchema } from "@/lib/validation/partner-registration";

type Params = { params: Promise<{ id: string }> };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updatePartnerApplication(request: Request, { params }: Params) {
  const auth = await requireApiRole("admin");
  if (auth.response) return auth.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = adminPartnerApplicationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте данные" }, { status: 400 });
  }

  const input = parsed.data;
  const admin = createAdminClient();

  const { data: existing, error: findErr } = await admin
    .from("profiles")
    .select("id, role, status, partner_type, commission_percent_override, assigned_manager_id")
    .eq("id", id)
    .single();

  if (findErr || !existing) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }
  if (existing.role !== "partner") {
    return NextResponse.json({ error: "Можно обновлять только партнёров" }, { status: 400 });
  }

  if (input.assignedManagerId) {
    const { data: manager } = await admin
      .from("profiles")
      .select("id, role, status")
      .eq("id", input.assignedManagerId)
      .maybeSingle();

    if (!manager || manager.role !== "manager" || manager.status !== "active") {
      return NextResponse.json(
        { error: "Укажите активного менеджера или очистите поле" },
        { status: 400 }
      );
    }
  }

  const patch: Record<string, unknown> = {
    reviewed_at: new Date().toISOString(),
    reviewed_by: auth.user!.profileId,
  };

  if (input.status !== undefined) patch.status = input.status;
  if (input.partnerType !== undefined) patch.partner_type = input.partnerType;
  if (input.commissionPercentOverride !== undefined) {
    patch.commission_percent_override = input.commissionPercentOverride;
  }
  if (input.assignedManagerId !== undefined) {
    patch.assigned_manager_id = input.assignedManagerId;
  }
  if (input.partnershipNotes !== undefined) {
    patch.partnership_notes = input.partnershipNotes;
  }
  if (input.rejectionReason !== undefined) {
    patch.rejection_reason = input.rejectionReason;
  }

  if (input.status === "active") {
    const nextType = input.partnerType ?? existing.partner_type;
    if (nextType !== "referral" && nextType !== "white_label") {
      return NextResponse.json(
        { error: "Перед одобрением укажите тип партнёрства: Referral или White-label" },
        { status: 400 }
      );
    }
    patch.partner_type = nextType;
    patch.rejection_reason = null;
  }
  if (input.status === "rejected" && !input.rejectionReason?.trim()) {
    return NextResponse.json(
      { error: "Укажите причину отклонения" },
      { status: 400 }
    );
  }

  const selectCols =
    "id, user_id, full_name, email, telegram, status, partner_type, agency_name, website_url, commission_percent_override, assigned_manager_id, partnership_notes, rejection_reason, reviewed_at, created_at";

  let { data: updated, error: updateErr } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select(selectCols)
    .single();

  const retryable = /rate limit|too many|timeout/i.test(updateErr?.message ?? "");
  if ((updateErr || !updated) && retryable) {
    await sleep(800);
    const second = await admin
      .from("profiles")
      .update(patch)
      .eq("id", id)
      .select(selectCols)
      .single();
    updated = second.data;
    updateErr = second.error;
  }

  if (updateErr || !updated) {
    console.error("[partner-applications] update failed", updateErr?.code, updateErr?.message);
    return NextResponse.json(
      { error: "Не удалось сохранить заявку. Попробуйте ещё раз" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const action =
    input.status === "active"
      ? "partner_application_approved"
      : input.status === "rejected"
        ? "partner_application_rejected"
        : input.status === "suspended"
          ? "partner_application_suspended"
          : "partner_application_updated";

  await supabase.rpc("write_audit_log", {
    p_action: action,
    p_entity_type: "profile",
    p_entity_id: id,
    p_old_value: {
      status: existing.status,
      partner_type: existing.partner_type,
      commission_percent_override: existing.commission_percent_override,
      assigned_manager_id: existing.assigned_manager_id,
    },
    p_new_value: patch,
  });

  return NextResponse.json({
    data: {
      id: updated.id,
      userId: updated.user_id,
      fullName: updated.full_name,
      email: updated.email,
      telegram: updated.telegram,
      status: updated.status,
      partnerType: updated.partner_type,
      agencyName: updated.agency_name,
      websiteUrl: updated.website_url,
      commissionPercentOverride: updated.commission_percent_override,
      assignedManagerId: updated.assigned_manager_id,
      partnershipNotes: updated.partnership_notes,
      rejectionReason: updated.rejection_reason,
      reviewedAt: updated.reviewed_at,
      createdAt: updated.created_at,
    },
  });
}

export const PATCH = updatePartnerApplication;
export const POST = updatePartnerApplication;
