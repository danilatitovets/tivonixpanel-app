import { createClient } from "@/lib/supabase/server";
import type { PartnerType, UserRole, UserStatus } from "@/lib/types";

export interface CurrentAuthUser {
  authId: string;
  email: string;
  profileId: string;
  fullName: string | null;
  role: UserRole;
  status: UserStatus;
  partnerType: PartnerType | null;
  agencyName: string | null;
  websiteUrl: string | null;
  commissionPercentOverride: number | null;
  assignedManagerId: string | null;
  rejectionReason: string | null;
  crmAccess: boolean;
  onboardingComplete: boolean;
  blockedUnder16: boolean;
  requiresReaccept: boolean;
  mustChangePassword: boolean;
}

export function isRestrictedPartnerStatus(status: UserStatus): boolean {
  return status === "pending" || status === "rejected" || status === "suspended";
}

export async function getCurrentUser(): Promise<CurrentAuthUser | null> {
  const supabase = await createClient();
  let {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user && authError?.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    const retry = await supabase.auth.getUser();
    user = retry.data.user;
  }

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, status, partner_type, agency_name, website_url, commission_percent_override, assigned_manager_id, rejection_reason"
    )
    .eq("user_id", user.id)
    .single();

  if (!profile) return null;

  const { data: legal } = await supabase
    .from("user_legal_profiles")
    .select("crm_access, onboarding_status, age")
    .eq("user_id", user.id)
    .maybeSingle();

  const onboardingComplete = legal?.onboarding_status === "completed";
  const blockedUnder16 = legal?.onboarding_status === "blocked_under_16";
  const requiresReaccept = legal?.onboarding_status === "requires_reaccept";
  const mustChangePassword = user.user_metadata?.must_change_password === true;

  return {
    authId: user.id,
    email: profile.email ?? user.email ?? "",
    profileId: profile.id,
    fullName: profile.full_name,
    role: profile.role as UserRole,
    status: profile.status as UserStatus,
    partnerType: (profile.partner_type as PartnerType | null) ?? null,
    agencyName: profile.agency_name ?? null,
    websiteUrl: profile.website_url ?? null,
    commissionPercentOverride:
      profile.commission_percent_override != null
        ? Number(profile.commission_percent_override)
        : null,
    assignedManagerId: profile.assigned_manager_id ?? null,
    rejectionReason: profile.rejection_reason ?? null,
    crmAccess: legal?.crm_access ?? false,
    onboardingComplete: onboardingComplete ?? false,
    blockedUnder16: blockedUnder16 ?? false,
    requiresReaccept: requiresReaccept ?? false,
    mustChangePassword,
  };
}
