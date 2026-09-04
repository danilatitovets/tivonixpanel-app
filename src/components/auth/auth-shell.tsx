"use client";

import { AuthNav } from "@/components/auth/auth-nav";
import { cn } from "@/lib/utils";

export function AuthShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "auth-surface relative isolate min-h-dvh overflow-x-hidden bg-[var(--color-paper-white)] text-[var(--color-carbon-black)] antialiased",
        "font-[family-name:var(--font-auth-sans)]",
        className
      )}
    >
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col px-5 pb-16 pt-5 sm:px-8 sm:pt-6">
        <AuthNav />
        {children}
      </div>
    </div>
  );
}
