"use client";

import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  FormField,
  FormSelect,
  plainInputClass,
  plainTextareaClass,
} from "@/components/leads/lead-form-fields";
import { PROSPECT_NICHES, PROSPECT_SOURCES, WEBSITE_QUALITY_LABELS } from "@/lib/prospecting-data";
import { PROSPECT_PRIORITY_LABELS } from "@/lib/prospecting-data";
import type { ProspectPriority, WebsiteQuality } from "@/lib/prospecting-types";

export interface ProspectFormValues {
  businessName: string;
  niche: string;
  city: string;
  source: string;
  website: string;
  instagram: string;
  telegram: string;
  phone: string;
  email: string;
  contactPerson: string;
  hasWebsite: boolean | null;
  websiteQuality: WebsiteQuality;
  hasOnlineBooking: boolean;
  hasTelegramBot: boolean;
  hasCRM: boolean;
  painPoints: string;
  priority: ProspectPriority;
  notes: string;
}

const emptyForm: ProspectFormValues = {
  businessName: "",
  niche: "",
  city: "",
  source: "2ГИС",
  website: "",
  instagram: "",
  telegram: "",
  phone: "",
  email: "",
  contactPerson: "",
  hasWebsite: null,
  websiteQuality: "unknown",
  hasOnlineBooking: false,
  hasTelegramBot: false,
  hasCRM: false,
  painPoints: "",
  priority: "medium",
  notes: "",
};

interface ProspectFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: ProspectFormValues, action: "save" | "message") => void;
  initial?: Partial<ProspectFormValues>;
}

export function ProspectForm({ open, onClose, onSave, initial }: ProspectFormProps) {
  const [form, setForm] = useState<ProspectFormValues>({ ...emptyForm, ...initial });
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm({ ...emptyForm, ...initial });
    }
  }

  function set<K extends keyof ProspectFormValues>(key: K, value: ProspectFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const hasWebsiteValue =
    form.hasWebsite === null ? "unknown" : form.hasWebsite ? "yes" : "no";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex h-[min(92dvh,920px)] max-h-[min(92dvh,920px)] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl md:h-auto [&>button]:hidden"
      >
        <div className="shrink-0 border-b border-[#ebebeb] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#18181b]">Добавить контакт</h2>
          <p className="mt-1 text-sm text-[#71717a]">
            Сначала достаточно названия и одного контакта. Остальное можно заполнить позже.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
          <FormField label="Название бизнеса" required>
            <input
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              className={plainInputClass}
              placeholder="СтройДом Минск"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Ниша">
              <FormSelect
                value={form.niche}
                onChange={(v) => set("niche", v)}
                options={PROSPECT_NICHES}
                placeholder="Выберите нишу"
              />
            </FormField>
            <FormField label="Город">
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className={plainInputClass}
                placeholder="Минск"
              />
            </FormField>
          </div>

          <FormField label="Источник">
            <FormSelect
              value={form.source}
              onChange={(v) => set("source", v)}
              options={PROSPECT_SOURCES}
              placeholder="Выберите источник"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Сайт">
              <input value={form.website} onChange={(e) => set("website", e.target.value)} className={plainInputClass} placeholder="site.by" />
            </FormField>
            <FormField label="Instagram">
              <input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} className={plainInputClass} placeholder="@business" />
            </FormField>
            <FormField label="Telegram">
              <input value={form.telegram} onChange={(e) => set("telegram", e.target.value)} className={plainInputClass} placeholder="@business" />
            </FormField>
            <FormField label="Телефон">
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={plainInputClass} placeholder="+375…" />
            </FormField>
          </div>

          <FormField label="Email">
            <input value={form.email} onChange={(e) => set("email", e.target.value)} className={plainInputClass} placeholder="mail@company.by" />
          </FormField>
          <FormField label="Контактное лицо">
            <input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} className={plainInputClass} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Есть сайт">
              <FormSelect
                value={hasWebsiteValue}
                onChange={(v) => set("hasWebsite", v === "unknown" ? null : v === "yes")}
                options={[
                  { value: "unknown", label: "Не проверено" },
                  { value: "yes", label: "Да" },
                  { value: "no", label: "Нет" },
                ]}
              />
            </FormField>
            <FormField label="Качество сайта">
              <FormSelect
                value={form.websiteQuality}
                onChange={(v) => set("websiteQuality", v as WebsiteQuality)}
                options={Object.entries(WEBSITE_QUALITY_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </FormField>
          </div>

          <FormField label="Проблемы">
            <textarea value={form.painPoints} onChange={(e) => set("painPoints", e.target.value)} rows={2} className={plainTextareaClass} />
          </FormField>
          <FormField label="Заметка">
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={plainTextareaClass} />
          </FormField>
          <FormField label="Приоритет">
            <FormSelect
              value={form.priority}
              onChange={(v) => set("priority", v as ProspectPriority)}
              options={Object.entries(PROSPECT_PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </FormField>
        </div>

        <div className="shrink-0 flex flex-col gap-2 border-t border-[#ebebeb] bg-white p-4 sm:flex-row">
          <button type="button" onClick={() => onSave(form, "save")} className="h-11 flex-1 rounded-full bg-[var(--color-sunrise-coral)] text-sm font-medium text-white">
            Сохранить
          </button>
          <button type="button" onClick={() => onSave(form, "message")} className="h-11 flex-1 rounded-full bg-[#f4f4f5] text-sm font-medium text-[#18181b]">
            Сохранить и написать
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
