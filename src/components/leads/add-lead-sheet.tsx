"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { LeadForm, FormFooter } from "@/components/leads/lead-form";
import { CLIENT_COPY } from "@/lib/ui-copy";
import { cn } from "@/lib/utils";

const FORM_ID = "add-lead-form";

interface AddLeadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLeadSheet({ open, onOpenChange }: AddLeadSheetProps) {
  const [formKey, setFormKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFormKey((k) => k + 1);
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "flex h-[min(92dvh,920px)] max-h-[min(92dvh,920px)] w-full min-w-0 max-w-full flex-col gap-0 overflow-hidden bg-[var(--color-paper-white)] p-0 md:h-dvh md:max-h-dvh md:!w-[min(96vw,720px)] md:!max-w-[720px]",
          "md:data-ending-style:translate-x-full md:data-starting-style:translate-x-full"
        )}
      >
        <header className="z-20 shrink-0 border-b border-[var(--color-mist-gray)] px-6 py-5 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[22px] font-normal tracking-[-0.015em] text-[var(--color-carbon-black)] md:text-[26px]">
              {CLIENT_COPY.add}
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--color-zinc-gray)] transition-colors hover:bg-[var(--color-fog-gray)] hover:text-[var(--color-carbon-black)] disabled:pointer-events-none disabled:opacity-50"
              aria-label="Закрыть"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-6 py-6 md:px-8">
          <LeadForm
            key={formKey}
            mode="sheet"
            formId={FORM_ID}
            showFooter={false}
            autoFocus
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
            onSubmittingChange={setSubmitting}
          />
        </div>

        <footer className="z-30 min-w-0 shrink-0 overflow-x-hidden border-t border-[var(--color-mist-gray)] bg-[var(--color-paper-white)] px-6 py-4 md:px-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <FormFooter
            mode="sheet"
            formId={FORM_ID}
            submitting={submitting}
            onCancel={() => onOpenChange(false)}
          />
        </footer>
      </SheetContent>
    </Sheet>
  );
}
