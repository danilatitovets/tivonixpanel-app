"use client";

import { X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { LeadDetailContent } from "@/components/leads/lead-detail-content";
import { useApp } from "@/lib/store";
import { CLIENT_COPY } from "@/lib/ui-copy";
import { cn } from "@/lib/utils";

interface LeadDetailSheetProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailSheet({ leadId, open, onOpenChange }: LeadDetailSheetProps) {
  const { data } = useApp();
  const lead = leadId ? data.leads.find((l) => l.id === leadId) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "flex h-[min(92dvh,920px)] max-h-[min(92dvh,920px)] w-full min-w-0 max-w-full flex-col gap-0 overflow-hidden bg-[var(--color-paper-white)] p-0 md:h-dvh md:max-h-dvh md:!w-[min(96vw,720px)] md:!max-w-[720px]",
          "md:data-ending-style:translate-x-full md:data-starting-style:translate-x-full"
        )}
      >
        <header className="z-20 shrink-0 border-b border-[var(--color-mist-gray)] px-6 py-5 md:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-[22px] font-normal tracking-[-0.015em] text-[var(--color-carbon-black)] md:text-[26px]">
                {lead?.businessName ?? CLIENT_COPY.defaultName}
              </h2>
              {lead ? (
                <p className="mt-1 truncate text-[14px] text-[var(--color-zinc-gray)]">
                  {[lead.niche, lead.city].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--color-zinc-gray)] transition-colors hover:bg-[var(--color-fog-gray)] hover:text-[var(--color-carbon-black)]"
              aria-label="Закрыть"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-6 py-6 md:px-8 md:py-8">
          {leadId ? <LeadDetailContent key={leadId} leadId={leadId} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
