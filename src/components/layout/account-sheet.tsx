"use client";

import { X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AccountSheetContent } from "@/components/layout/account-sheet-content";
import { useCurrentUser } from "@/lib/store";
import { getUserRoleLabel } from "@/lib/statuses";
import { cn } from "@/lib/utils";

interface AccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSheet({ open, onOpenChange }: AccountSheetProps) {
  const user = useCurrentUser();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "flex h-[min(92dvh,920px)] max-h-[min(92dvh,920px)] flex-col gap-0 overflow-hidden bg-[var(--color-paper-white)] p-0 md:h-dvh md:max-h-dvh",
          "!w-[min(96vw,560px)] !max-w-[560px] min-w-0",
          "data-ending-style:translate-x-full data-starting-style:translate-x-full"
        )}
      >
        <header className="z-20 shrink-0 border-b border-[var(--color-mist-gray)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-[22px] font-normal tracking-[-0.015em] text-[var(--color-carbon-black)]">
                {user.name}
              </h2>
              <p className="mt-1 text-[14px] text-[var(--color-zinc-gray)]">
                {getUserRoleLabel(user.role)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--color-zinc-gray)] transition-colors hover:bg-[var(--color-fog-gray)] hover:text-[var(--color-carbon-black)]"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-6">
          <AccountSheetContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}
