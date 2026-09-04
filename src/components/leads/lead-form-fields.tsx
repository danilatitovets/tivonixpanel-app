"use client";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectFieldText,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

const fieldShell =
  "flex h-11 min-w-0 items-center gap-1.5 rounded-xl bg-[#f4f4f5] px-3.5 transition-colors focus-within:bg-[#f4f4f5]";

const prefixText = "shrink-0 text-sm font-medium text-[#9ca3af] select-none";

const inputClass =
  "min-w-0 flex-1 bg-transparent text-sm text-[#18181b] outline-none placeholder:text-[#9ca3af]";

interface PrefixInputProps {
  prefix: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: string;
  autoComplete?: string;
  id?: string;
  className?: string;
}

export function PrefixInput({
  prefix,
  value,
  onChange,
  placeholder,
  inputMode,
  type = "text",
  autoComplete,
  id,
  className,
}: PrefixInputProps) {
  return (
    <div className={cn(fieldShell, className)}>
      <span className={prefixText} aria-hidden>
        {prefix}
      </span>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

interface EmailSplitInputProps {
  local: string;
  domain: string;
  onLocalChange: (v: string) => void;
  onDomainChange: (v: string) => void;
  localId?: string;
  domainId?: string;
}

export function EmailSplitInput({
  local,
  domain,
  onLocalChange,
  onDomainChange,
  localId,
  domainId,
}: EmailSplitInputProps) {
  return (
    <div className={fieldShell}>
      <input
        id={localId}
        type="text"
        inputMode="email"
        autoComplete="email"
        value={local}
        onChange={(e) => onLocalChange(e.target.value.replace(/\s/g, ""))}
        placeholder="mail"
        className={cn(inputClass, "min-w-0")}
      />
      <span className={prefixText} aria-hidden>
        @
      </span>
      <input
        id={domainId}
        type="text"
        inputMode="url"
        autoComplete="off"
        value={domain}
        onChange={(e) => onDomainChange(e.target.value.replace(/\s/g, "").replace(/^@+/, ""))}
        placeholder="gmail.com"
        className={inputClass}
      />
    </div>
  );
}

export function FormField({
  label,
  required,
  children,
  className,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("min-w-0 max-w-full", className)}>
      <label htmlFor={htmlFor} className="mb-2 block text-sm text-[#71717a]">
        {label}
        {required && <span className="text-[#18181b]"> *</span>}
      </label>
      {children}
    </div>
  );
}

export const plainInputClass =
  "h-11 w-full rounded-xl bg-[#f4f4f5] px-3.5 text-sm text-[#18181b] outline-none transition-colors placeholder:text-[#9ca3af] focus:bg-[#f4f4f5]";

export const plainTextareaClass =
  "w-full rounded-xl bg-[#f4f4f5] px-3.5 py-3 text-sm text-[#18181b] outline-none transition-colors placeholder:text-[#9ca3af] focus:bg-[#f4f4f5]";

const formSelectTriggerClass =
  "h-11 w-full justify-between gap-2 rounded-xl border-0 bg-[#f4f4f5] px-3.5 shadow-none ring-0 transition-colors hover:bg-[#f4f4f5] focus-visible:border-0 focus-visible:bg-[#f4f4f5] focus-visible:ring-0 data-placeholder:text-[#9ca3af] [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:flex-1 [&_[data-slot=select-value]]:text-left [&_svg]:ml-2 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-[#9ca3af]";

const formSelectContentClass =
  "rounded-xl border-0 bg-white p-1.5 shadow-[0_8px_30px_rgba(5,5,5,0.08)] ring-0";

const formSelectItemClass =
  "rounded-lg py-2.5 pl-3 pr-9 text-sm data-highlighted:bg-[#f4f4f5] data-highlighted:text-[#18181b]";

interface FormSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export function FormSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Выберите",
  className,
}: FormSelectProps) {
  const items = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  return (
    <Select value={value || null} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger id={id} className={cn(formSelectTriggerClass, className)}>
        <SelectFieldText value={value || null} placeholder={placeholder} options={items} />
      </SelectTrigger>
      <SelectContent
        className={formSelectContentClass}
        side="bottom"
        align="start"
        sideOffset={8}
        alignItemWithTrigger={false}
      >
        {items.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className={formSelectItemClass}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

