"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Handshake,
  Wallet,
  Settings,
  List,
  LogOut,
  FileBarChart,
  User,
  BookOpen,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser, useIsBootstrapping } from "@/lib/store";
import { canAccessResource } from "@/lib/access";
import { getUserRoleLabel } from "@/lib/statuses";
import { isDemoMode } from "@/lib/demo-mode";
import { logoutApi } from "@/lib/store-api-bridge";
import { RoleSwitcher } from "./role-switcher";
import { useAccountSheet } from "./account-sheet-context";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandLogo } from "@/components/brand-logo";
import type { AccessResource } from "@/lib/types";

const navItems: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  resource?: AccessResource;
  partnerOnly?: boolean;
}[] = [
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/my", label: "Мой кабинет", icon: User, partnerOnly: true },
  { href: "/leads", label: "Клиенты", icon: List, resource: "leads" },
  { href: "/prospecting", label: "Поиск клиентов", icon: ListChecks, resource: "prospecting", partnerOnly: true },
  { href: "/academy", label: "Как искать клиентов", icon: BookOpen, partnerOnly: true },
  { href: "/partners", label: "Партнёры", icon: Users, resource: "partners" },
  { href: "/deals", label: "Сделки", icon: Handshake, resource: "deals" },
  { href: "/payouts", label: "Выплаты", icon: Wallet, resource: "payouts" },
  { href: "/reports", label: "Отчёты", icon: FileBarChart, resource: "reports" },
  { href: "/settings", label: "Настройки", icon: Settings, resource: "settings" },
  { href: "/admin/legal-profiles", label: "Юр. профили", icon: Users, resource: "admin" },
  { href: "/admin/partner-applications", label: "Заявки партнёров", icon: Handshake, resource: "admin" },
  { href: "/admin/audit-logs", label: "Журнал действий", icon: FileBarChart, resource: "admin" },
];

interface SidebarProps {
  onNavigate?: () => void;
  className?: string;
}

async function handleLogout(onNavigate?: () => void) {
  onNavigate?.();
  if (!isDemoMode()) {
    try {
      await Promise.race([
        logoutApi(),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch {
      /* still leave the panel even if the API call fails */
    }
  }
  window.location.assign("/login");
}

export function Sidebar({ onNavigate, className }: SidebarProps) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const { openAccount } = useAccountSheet();
  const isBootstrapping = useIsBootstrapping();

  const visibleItems = navItems.filter((item) => {
    if (item.partnerOnly && user.role !== "partner") return false;
    if (item.href === "/my" && user.role !== "partner") return false;
    if (item.resource && !canAccessResource(user, item.resource)) return false;
    return true;
  });

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col bg-[var(--color-carbon-black)] text-white lg:w-60 xl:w-64",
        className
      )}
    >
      <div className="px-3 pt-6 pb-5">
        <BrandLogo href="/dashboard" onClick={onNavigate} priority className="px-3" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/leads" && pathname.startsWith("/leads/") && pathname !== "/leads/new") ||
            (item.href === "/partners" && pathname.startsWith("/partners/")) ||
            (item.href === "/admin/legal-profiles" && pathname.startsWith("/admin/legal-profiles")) ||
            (item.href === "/admin/partner-applications" &&
              pathname.startsWith("/admin/partner-applications")) ||
            (item.href === "/academy" && pathname.startsWith("/academy")) ||
            (item.href === "/prospecting" && pathname.startsWith("/prospecting"));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-[9999px] px-3 py-2.5 text-[13px] tracking-[-0.005em] transition-colors",
                isActive
                  ? "bg-white/12 font-medium text-white"
                  : "text-white/55 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <Icon className="size-4 shrink-0 opacity-90" strokeWidth={1.75} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <RoleSwitcher />

      <div className="mt-auto border-t border-white/10 px-3 py-3">
        {isBootstrapping ? (
          <div className="space-y-3 px-3 py-2">
            <Skeleton className="h-4 w-28 bg-white/10" />
            <Skeleton className="h-3 w-16 bg-white/10" />
            <Skeleton className="h-9 w-full rounded-full bg-white/10" />
          </div>
        ) : (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                onNavigate?.();
                openAccount();
              }}
              className="flex w-full items-center gap-3 rounded-[9999px] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[12px] font-bold tracking-tight text-white">
                {user.name.trim().charAt(0).toUpperCase() || "U"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold tracking-[-0.005em] text-white">
                  {user.name}
                </span>
                <span className="mt-0.5 block text-[11px] tracking-[-0.005em] text-white/45">
                  {getUserRoleLabel(user.role)}
                </span>
              </span>
              <Settings className="size-4 shrink-0 text-white/45" strokeWidth={1.75} />
            </button>

            <button
              type="button"
              onClick={() => void handleLogout(onNavigate)}
              className="flex w-full items-center gap-3 rounded-[9999px] px-3 py-2.5 text-[13px] tracking-[-0.005em] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
              <span>Выйти</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
