"use client";

import { X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ProspectDetailContent } from "@/components/prospecting/prospect-detail-content";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

interface ProspectDetailSheetProps {
  prospectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProspectDetailSheet({ prospectId, open, onOpenChange }: ProspectDetailSheetProps) {
  const { data } = useApp();
  const prospect = prospectId ? (data.prospectContacts ?? []).find((p) => p.id === prospectId) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "flex h-[min(92dvh,920px)] max-h-[min(92dvh,920px)] w-full min-w-0 max-w-full flex-col gap-0 overflow-hidden bg-white p-0 shadow-none md:h-dvh md:max-h-dvh md:!w-[min(96vw,720px)] md:!max-w-[720px]",
          "md:data-ending-style:translate-x-full md:data-starting-style:translate-x-full"
        )}
      >
        <header className="z-20 shrink-0 border-b border-[#ebebeb] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-[#18181b]">
                {prospect?.businessName ?? "Контакт"}
              </h2>
              {prospect && (
                <p className="mt-1 text-sm text-[#71717a]">
                  {[prospect.niche, prospect.city, prospect.source].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="shrink-0 rounded-xl p-2 text-[#71717a] transition-colors hover:bg-[#f4f4f5] hover:text-[#18181b]"
              aria-label="Закрыть"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-6 py-5">
          {prospectId && (
            <ProspectDetailContent
              key={prospectId}
              prospectId={prospectId}
              onClose={() => onOpenChange(false)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
