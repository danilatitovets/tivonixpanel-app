"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useCurrentUser, useIsBootstrapping } from "@/lib/store";
import { canAccessResource, canUserAccess } from "@/lib/access";
import type { AccessAction, AccessResource } from "@/lib/types";

interface RoleGuardProps {
  children: ReactNode;
  resource?: AccessResource;
  action?: AccessAction;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function RoleGuard({
  children,
  resource,
  action,
  fallback,
  redirectTo = "/my",
}: RoleGuardProps) {
  const user = useCurrentUser();
  const isBootstrapping = useIsBootstrapping();
  const router = useRouter();

  const sessionReady = !isBootstrapping && Boolean(user.id);
  const allowed =
    (action ? canUserAccess(user, action) : true) &&
    (resource ? canAccessResource(user, resource) : true);

  useEffect(() => {
    if (!sessionReady) return;
    if (!allowed && redirectTo) router.replace(redirectTo);
  }, [allowed, redirectTo, router, sessionReady]);

  if (!sessionReady) return <>{children}</>;
  if (!allowed) return fallback ?? null;
  return <>{children}</>;
}

export function useCan(action: AccessAction) {
  const user = useCurrentUser();
  return canUserAccess(user, action);
}

export function useCanResource(resource: AccessResource) {
  const user = useCurrentUser();
  return canAccessResource(user, resource);
}
