"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useApp, useCurrentUser } from "@/lib/store";
import { isAdmin } from "@/lib/access";
import { LEAD_SOURCES } from "@/lib/statuses";
import { CLIENT_COPY } from "@/lib/ui-copy";
import { SERVICE_TYPE_OPTIONS, toServiceTypeSlug, getServiceTypeLabel } from "@/lib/service-types";
import { toUserMessage } from "@/lib/errors";
import { DuplicateWarning } from "@/components/leads/duplicate-warning";
import {
  EmailSplitInput,
  FormField,
  FormSelect,
  PrefixInput,
  plainInputClass,
} from "@/components/leads/lead-form-fields";
import {
  calcFormProgress,
  formatPhoneDisplay,
  hasAnyContact,
  isEmailValid,
  isPhoneValid,
  normalizeLeadContacts,
  stripAt,
  extractPhoneDigits,
  stripWebsite,
} from "@/lib/lead-input-utils";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  businessName: "",
  niche: "",
  city: "",
  contactName: "",
  instagram: "",
  telegram: "",
  phoneIntl: "",
  emailLocal: "",
  emailDomain: "",
  website: "",
  source: "",
  serviceType: "",
  estimatedBudget: "",
  nextAction: "",
  notes: "",
};

interface LeadFormProps {
  mode?: "page" | "sheet";
  formId?: string;
  showFooter?: boolean;
  autoFocus?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  onSubmittingChange?: (submitting: boolean) => void;
}

export function LeadForm({
  mode = "page",
  formId = "lead-form",
  showFooter = true,
  autoFocus = false,
  onSuccess,
  onCancel,
  onSubmittingChange,
}: LeadFormProps) {
  const router = useRouter();
  const { addLead, checkDuplicate, data } = useApp();
  const user = useCurrentUser();
  const businessRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  function setSubmittingState(value: boolean) {
    setSubmitting(value);
    onSubmittingChange?.(value);
  }

  const contacts = useMemo(
    () => ({
      instagram: form.instagram,
      telegram: form.telegram,
      phoneIntl: form.phoneIntl,
      emailLocal: form.emailLocal,
      emailDomain: form.emailDomain,
      website: form.website,
    }),
    [form]
  );

  const normalized = useMemo(() => normalizeLeadContacts(contacts), [contacts]);

  const duplicate = useMemo(
    () =>
      checkDuplicate({
        instagramUrl: normalized.instagramUrl || undefined,
        telegramUsername: normalized.telegramUsername || undefined,
        phone: normalized.phone || undefined,
        website: normalized.website || undefined,
        email: normalized.email || undefined,
        businessName: form.businessName || undefined,
      }),
    [form.businessName, normalized, checkDuplicate]
  );

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => businessRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const progress = calcFormProgress(
    form.businessName,
    contacts,
    Boolean(form.source || form.serviceType || form.estimatedBudget)
  );

  const gridClass = cn(
    "grid min-w-0 gap-4",
    mode === "sheet" ? "md:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"
  );

  function update(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function handlePhoneChange(raw: string) {
    update("phoneIntl", extractPhoneDigits(raw));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!form.businessName.trim()) {
      toast.error("Укажите название бизнеса");
      businessRef.current?.focus();
      return;
    }

    if (!hasAnyContact(contacts)) {
      toast.error("Добавьте хотя бы один контакт: телефон, email, Instagram, Telegram или сайт");
      return;
    }

    if (!isPhoneValid(form.phoneIntl)) {
      toast.error("Телефон: укажите код страны и номер (от 8 до 15 цифр, например +7 или +1)");
      return;
    }

    if (!isEmailValid(form.emailLocal, form.emailDomain)) {
      toast.error("Заполните email полностью: имя и домен после @");
      return;
    }

    if (duplicate && !isAdmin(user)) {
      toast.error("Клиент уже есть в базе. Дождитесь проверки админом.");
      return;
    }

    setSubmittingState(true);
    try {
      await addLead({
        businessName: form.businessName.trim(),
        niche: form.niche.trim(),
        city: form.city.trim(),
        contactName: form.contactName.trim(),
        email: normalized.email,
        instagramUrl: normalized.instagramUrl,
        telegramUsername: normalized.telegramUsername,
        phone: normalized.phone,
        website: normalized.website,
        source: form.source || "Instagram",
        serviceType: getServiceTypeLabel(toServiceTypeSlug(form.serviceType || "landing")),
        estimatedBudget: Number(form.estimatedBudget) || 0,
        status: "pending_review",
        priority: "normal",
        partnerId: user.id,
        assignedManagerId: null,
        adminReviewStatus: "pending",
        adminReviewComment: "",
        nextAction: form.nextAction.trim() || "Ожидает проверки админом",
        lastContactAt: null,
        reservedUntil: null,
        notes: form.notes.trim(),
      });

      toast.success(CLIENT_COPY.addedSuccess);
      setForm(EMPTY_FORM);

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/leads");
      }
    } catch (error) {
      toast.error(toUserMessage(error, "Не удалось добавить клиента"));
    } finally {
      setSubmittingState(false);
    }
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="min-w-0 max-w-full space-y-10">
      {mode === "sheet" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#71717a]">
            <span>Заполнено</span>
            <span className="font-medium text-[#18181b]">{progress}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[#f4f4f5]">
            <div
              className="h-full rounded-full bg-[var(--color-sunrise-coral)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {duplicate && (
        <DuplicateWarning lead={duplicate.lead} matchedField={duplicate.matchedField} data={data} />
      )}

      <section className="space-y-5">
        <SectionTitle step={1} title="О бизнесе" />
        <div className={gridClass}>
          <FormField
            label="Название бизнеса"
            required
            htmlFor="businessName"
            className="sm:col-span-2 lg:col-span-3"
          >
            <input
              ref={businessRef}
              id="businessName"
              className={plainInputClass}
              value={form.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              placeholder="Glow Studio"
              required
              autoComplete="organization"
            />
          </FormField>
          <FormField label="Сфера" htmlFor="niche">
            <input
              id="niche"
              className={plainInputClass}
              value={form.niche}
              onChange={(e) => update("niche", e.target.value)}
              placeholder="Салон красоты"
            />
          </FormField>
          <FormField label="Город" htmlFor="city">
            <input
              id="city"
              className={plainInputClass}
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="Москва"
              autoComplete="address-level2"
            />
          </FormField>
          <FormField label="Имя контакта" htmlFor="contactName" className={mode === "sheet" ? "lg:col-span-1" : undefined}>
            <input
              id="contactName"
              className={plainInputClass}
              value={form.contactName}
              onChange={(e) => update("contactName", e.target.value)}
              placeholder="Алина"
              autoComplete="name"
            />
          </FormField>
        </div>
      </section>

      <section className="space-y-5">
        <SectionTitle step={2} title="Контакты" />
        <div className={gridClass}>
          <FormField label="Email" htmlFor="emailLocal">
            <EmailSplitInput
              localId="emailLocal"
              domainId="emailDomain"
              local={form.emailLocal}
              domain={form.emailDomain}
              onLocalChange={(v) => update("emailLocal", v)}
              onDomainChange={(v) => update("emailDomain", v)}
            />
          </FormField>

          <FormField label="Телефон" htmlFor="phone">
            <PrefixInput
              id="phone"
              prefix="+"
              value={formatPhoneDisplay(form.phoneIntl)}
              onChange={handlePhoneChange}
              placeholder="7 900 000-00-00"
              inputMode="tel"
              autoComplete="tel"
            />
          </FormField>

          <FormField label="Instagram" htmlFor="instagram">
            <PrefixInput
              id="instagram"
              prefix="@"
              value={stripAt(form.instagram)}
              onChange={(v) => update("instagram", v)}
              placeholder="glowstudio"
              autoComplete="off"
            />
          </FormField>

          <FormField label="Telegram" htmlFor="telegram">
            <PrefixInput
              id="telegram"
              prefix="@"
              value={stripAt(form.telegram)}
              onChange={(v) => update("telegram", v)}
              placeholder="username"
              autoComplete="off"
            />
          </FormField>

          <FormField
            label="Сайт"
            htmlFor="website"
            className={cn("sm:col-span-2", mode === "sheet" && "lg:col-span-3")}
          >
            <PrefixInput
              id="website"
              prefix="https://"
              value={stripWebsite(form.website)}
              onChange={(v) => update("website", v)}
              placeholder="example.ru"
              inputMode="url"
              autoComplete="url"
            />
          </FormField>
        </div>
      </section>

      <section className="space-y-5">
        <SectionTitle step={3} title="Детали" />
        <div className={gridClass}>
          <FormField label="Источник" htmlFor="source">
            <FormSelect
              id="source"
              value={form.source}
              onChange={(v) => update("source", v)}
              options={LEAD_SOURCES}
            />
          </FormField>

          <FormField label="Услуга" htmlFor="serviceType">
            <FormSelect
              id="serviceType"
              value={form.serviceType}
              onChange={(v) => update("serviceType", v)}
              options={SERVICE_TYPE_OPTIONS}
            />
          </FormField>

          <FormField label="Примерный бюджет" htmlFor="budget">
            <PrefixInput
              id="budget"
              prefix="$"
              value={form.estimatedBudget}
              onChange={(v) => update("estimatedBudget", v.replace(/[^\d]/g, ""))}
              placeholder="1000"
              inputMode="numeric"
            />
          </FormField>

          <FormField label="Следующий шаг" htmlFor="nextAction" className={mode === "sheet" ? "lg:col-span-2" : "sm:col-span-2"}>
            <input
              id="nextAction"
              className={plainInputClass}
              value={form.nextAction}
              onChange={(e) => update("nextAction", e.target.value)}
              placeholder="Написать в Instagram"
            />
          </FormField>

          <FormField
            label="Комментарий"
            htmlFor="notes"
            className={cn("sm:col-span-2", mode === "sheet" && "lg:col-span-3")}
          >
            <textarea
              id="notes"
              className={cn(plainInputClass, "min-h-[96px] resize-none py-3")}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Нашли через сторис, интересовались лендингом…"
            />
          </FormField>
        </div>
      </section>

      {/* Отступ снизу, чтобы последние поля не прилипали к краю скролла */}
      {mode === "sheet" && <div className="h-4 shrink-0" aria-hidden />}

      {showFooter && (
        <FormFooter mode={mode} onCancel={handleCancel} submitting={submitting} />
      )}
    </form>
  );
}

export function FormFooter({
  mode,
  onCancel,
  formId = "lead-form",
  submitting = false,
}: {
  mode?: "page" | "sheet";
  onCancel: () => void;
  formId?: string;
  submitting?: boolean;
}) {
  const submitLabel =
    mode === "sheet" ? CLIENT_COPY.save : CLIENT_COPY.saveAndReview;

  return (
    <div className={mode === "sheet" ? "" : "pt-2"}>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="h-11 w-full rounded-xl bg-[#f4f4f5] px-6 text-sm font-medium text-[#18181b] transition-colors hover:bg-[#f4f4f5] disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
        >
          Отмена
        </button>
        <button
          type="submit"
          form={formId}
          disabled={submitting}
          className="h-11 w-full rounded-full bg-[var(--color-sunrise-coral)] px-8 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 sm:w-auto sm:min-w-[180px]"
        >
          {submitting ? "Сохранение…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-sunrise-coral)] text-[11px] font-semibold text-white">
        {step}
      </span>
      <p className="text-sm font-semibold text-[#18181b]">{title}</p>
    </div>
  );
}
