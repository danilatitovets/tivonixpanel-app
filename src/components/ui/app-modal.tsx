"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function AppModal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        placement="bottom"
        className={cn(
          "gap-0 overflow-hidden border-0 p-0 shadow-[var(--shadow-subtle)] md:max-w-lg",
          className
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--color-mist-gray)] md:hidden" />
        <div className="shrink-0 px-6 pt-4 pb-3 pr-14">
          <DialogHeader className="gap-1.5 text-left">
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel,
  primary,
  disabled,
  className,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  primary?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2 pt-2", className)}>
      <button
        type="button"
        onClick={onCancel}
        className="h-11 flex-1 rounded-full border border-[var(--color-mist-gray)] bg-transparent text-[14px] font-bold tracking-[-0.009em] text-[var(--color-carbon-black)] transition-colors hover:bg-[var(--color-fog-gray)]"
      >
        Отмена
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className={cn(
          "h-11 flex-1 rounded-full text-[14px] font-bold tracking-[-0.009em] transition-opacity disabled:opacity-50",
          primary
            ? "bg-[var(--color-sunrise-coral)] text-white hover:opacity-90"
            : "bg-[var(--color-fog-gray)] text-[var(--color-carbon-black)] hover:opacity-90"
        )}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

const fieldClass =
  "mt-1.5 h-11 w-full rounded-[15px] border border-[var(--color-mist-gray)] bg-[var(--color-paper-white)] px-[15px] text-[15px] tracking-[-0.005em] text-[var(--color-carbon-black)] outline-none transition-colors placeholder:text-[var(--color-ash-gray)] focus:border-[var(--color-carbon-black)] focus:ring-[3px] focus:ring-[var(--color-carbon-black)]/5";

export function ModalField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[13px] tracking-[-0.005em] text-[var(--color-zinc-gray)]">
        {label}
      </label>
      {children}
    </div>
  );
}

export { fieldClass };
