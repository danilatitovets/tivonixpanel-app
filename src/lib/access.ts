import type { AccessAction, AccessResource, User, UserRole } from "./types";

const ROLE_PERMISSIONS: Record<UserRole, AccessAction[]> = {
  admin: [
    "view_all_leads",
    "view_own_leads",
    "create_lead",
    "approve_lead",
    "reject_lead",
    "mark_duplicate",
    "create_deal",
    "confirm_payment",
    "create_payout",
    "view_all_payouts",
    "view_own_payouts",
    "export_all",
    "export_own",
    "edit_commission_settings",
    "view_all_partners",
    "view_reports",
    "assign_manager",
  ],
  manager: [
    "view_all_leads",
    "create_lead",
    "export_all",
    "view_all_partners",
    "assign_manager",
  ],
  partner: [
    "view_own_leads",
    "create_lead",
    "view_own_payouts",
    "export_own",
  ],
};

const RESOURCE_ACCESS: Record<UserRole, AccessResource[]> = {
  admin: ["leads", "deals", "payouts", "partners", "settings", "reports", "prospecting", "admin"],
  manager: ["leads", "deals", "partners", "prospecting"],
  partner: ["leads", "deals", "prospecting"],
};

export function canUserAccess(user: User | null, action: AccessAction): boolean {
  if (!user || user.status !== "active") return false;
  return ROLE_PERMISSIONS[user.role].includes(action);
}

export function canAccessResource(user: User | null, resource: AccessResource): boolean {
  if (!user?.id) return false;
  return RESOURCE_ACCESS[user.role].includes(resource);
}

export function isAdmin(user: User | null): boolean {
  return user?.role === "admin";
}

export function isPartner(user: User | null): boolean {
  return user?.role === "partner";
}

export function isManager(user: User | null): boolean {
  return user?.role === "manager";
}

export function filterByPartnerOwnership<T extends { partnerId: string }>(
  items: T[],
  user: User | null
): T[] {
  if (!user) return [];
  if (user.role === "admin" || user.role === "manager") return items;
  return items.filter((item) => item.partnerId === user.id);
}

export function filterLeadsForUser<T extends { partnerId: string }>(
  items: T[],
  user: User | null
): T[] {
  return filterByPartnerOwnership(items, user);
}
