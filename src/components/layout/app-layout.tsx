"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { AppPageSkeleton, type AppPageSkeletonVariant } from "./app-page-skeleton";
import { useApp, useIsBootstrapping } from "@/lib/store";
import { isDemoMode } from "@/lib/demo-mode";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  showAddLead?: boolean;
  showSearch?: boolean;
  hideTitle?: boolean;
  compactTopbar?: boolean;
  mainClassName?: string;
  skeletonVariant?: AppPageSkeletonVariant;
}

function skeletonVariantForPath(pathname: string): AppPageSkeletonVariant {
  if (pathname.startsWith("/dashboard")) return "stats";
  if (pathname.startsWith("/academy")) return "academy";
  if (pathname.startsWith("/reports") || pathname.startsWith("/settings")) return "simple";
  return "table";
}

export function AppLayout({
  children,
  title,
  showAddLead = true,
  showSearch = true,
  hideTitle = false,
  compactTopbar = false,
  mainClassName,
  skeletonVariant,
}: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isBootstrapping = useIsBootstrapping();
  const { refreshFromServer } = useApp();
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);
  const variant = skeletonVariant ?? skeletonVariantForPath(pathname);

  useEffect(() => {
    if (isDemoMode() || isBootstrapping) return;
    if (prevPathRef.current !== null && prevPathRef.current !== pathname) {
      void refreshFromServer();
    }
    prevPathRef.current = pathname;
  }, [pathname, isBootstrapping, refreshFromServer]);

  return (
    <div className="flex min-h-screen min-w-0 overflow-x-hidden bg-white">
      <div className="hidden lg:block">
        <Sidebar className="fixed inset-y-0 left-0 z-40" />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-64 border-none bg-[var(--color-carbon-black)] p-0"
        >
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div
        className="flex min-w-0 flex-1 flex-col lg:pl-60 xl:pl-64"
        data-academy-layout={compactTopbar ? "" : undefined}
      >
        <Topbar
          title={title}
          hideTitle={hideTitle}
          compactTopbar={compactTopbar}
          onMenuClick={() => setMobileOpen(true)}
          showAddLead={showAddLead && !isBootstrapping}
          showSearch={showSearch && !isBootstrapping}
          isLoading={isBootstrapping}
        />
        <main
          className={cn(
            "min-w-0 flex-1 overflow-x-hidden px-4 py-6 md:px-6 lg:px-8",
            compactTopbar && "pt-0",
            mainClassName
          )}
        >
          {isBootstrapping ? <AppPageSkeleton variant={variant} /> : children}
        </main>
      </div>
    </div>
  );
}
