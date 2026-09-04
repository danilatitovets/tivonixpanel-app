"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { CopyButton } from "@/components/academy/copy-button";
import { AcademyCardBody } from "@/components/academy/academy-card";
import { SearchInput } from "@/components/ui/search-input";
import {
  ALLOWED_PHRASES,
  FORBIDDEN_PHRASES,
  MESSAGE_PERSONALIZE_HINT,
  MESSAGE_TEMPLATE_GROUPS,
  MESSAGE_TEMPLATE_TABS,
  MESSAGE_WARNING,
  filterMessageTemplates,
  type MessageTemplate,
  type MessageTemplateTabId,
} from "@/lib/academy-message-templates";
import { cn } from "@/lib/utils";

function TemplateBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-[#18181b]">
      {label}
    </span>
  );
}

function TemplateCard({ template }: { template: MessageTemplate }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AcademyCardBody className="p-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex w-full flex-col gap-3 p-5 text-left md:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-base font-semibold text-[#18181b] md:text-lg">{template.title}</h3>
            <p className="text-sm leading-relaxed text-[#71717a] md:text-base">{template.whenToUse}</p>
            <div className="flex flex-wrap gap-1.5">
              {template.tags.map((tag) => (
                <TemplateBadge key={tag} label={tag} />
              ))}
            </div>
          </div>
          <ChevronDown
            className={cn(
              "mt-1 size-5 shrink-0 text-[#71717a] transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="space-y-4 border-t border-[#ebebeb] px-5 pb-5 pt-4 md:px-6 md:pb-6">
          <div className="rounded-xl bg-white p-4 md:p-5">
            <p className="whitespace-pre-line text-base leading-relaxed text-[#18181b]">
              {template.text}
            </p>
          </div>
          <p className="text-sm text-[#71717a] md:text-base">{MESSAGE_PERSONALIZE_HINT}</p>
          <CopyButton text={template.text} label="Скопировать" className="h-11 w-full sm:w-auto" />
        </div>
      )}
    </AcademyCardBody>
  );
}

function ForbiddenTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl bg-[#f4f4f5] p-5 ring-2 ring-red-500 ring-offset-[3px] ring-offset-white md:p-6">
        <h3 className="text-base font-semibold text-red-600 md:text-lg">Нельзя писать</h3>
        <ul className="mt-4 space-y-2.5">
          {FORBIDDEN_PHRASES.map((item) => (
            <li key={item} className="flex gap-2.5 text-base leading-snug text-[#18181b] md:text-[17px]">
              <span className="mt-0.5 shrink-0 text-sm font-bold text-red-500" aria-hidden>
                ✕
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl bg-[#f4f4f5] p-5 ring-2 ring-emerald-500 ring-offset-[3px] ring-offset-white md:p-6">
        <h3 className="text-base font-semibold text-emerald-700 md:text-lg">Правильно</h3>
        <ul className="mt-4 space-y-2.5">
          {ALLOWED_PHRASES.map((item) => (
            <li key={item} className="flex gap-2.5 text-base leading-snug text-[#18181b] md:text-[17px]">
              <span className="mt-0.5 shrink-0 text-sm font-bold text-emerald-600" aria-hidden>
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TemplateGroup({
  label,
  templates,
}: {
  label: string;
  templates: MessageTemplate[];
}) {
  if (templates.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-[#18181b] md:text-lg">{label}</h3>
      <div className="space-y-3">
        {templates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </div>
  );
}

export function ClientMessagesSection() {
  const [activeTab, setActiveTab] = useState<MessageTemplateTabId>("first");
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => filterMessageTemplates(activeTab, query),
    [activeTab, query]
  );

  const grouped = useMemo(() => {
    const groups = MESSAGE_TEMPLATE_GROUPS[activeTab];
    if (!groups) return null;

    return groups.map((group) => ({
      ...group,
      templates: filtered.filter((template) => template.group === group.id),
    }));
  }, [activeTab, filtered]);

  function handleTabChange(tab: MessageTemplateTabId) {
    setActiveTab(tab);
    setQuery("");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#fffef8] px-4 py-3 ring-1 ring-[#f5e6a8] md:px-5 md:py-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#ca8a04]" />
          <p className="text-sm leading-relaxed text-[#18181b] md:text-base">{MESSAGE_WARNING}</p>
        </div>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Поиск по шаблонам: Instagram, CRM, ремонт…"
        className="max-w-xl"
      />

      <div className="flex min-w-0 flex-wrap gap-2">
          {MESSAGE_TEMPLATE_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors md:text-base",
                  isActive
                    ? "bg-[var(--color-sunrise-coral)] text-white"
                    : "bg-[#f4f4f5] text-[#71717a] hover:bg-[#ebebeb] hover:text-[#18181b]"
                )}
              >
                {tab.label}
              </button>
            );
          })}
      </div>

      {activeTab === "forbidden" ? (
        <ForbiddenTab />
      ) : grouped ? (
        <div className="space-y-8">
          {grouped.map((group) => (
            <TemplateGroup key={group.id} label={group.label} templates={group.templates} />
          ))}
          {filtered.length === 0 && (
            <p className="text-base text-[#71717a]">Ничего не найдено. Попробуй другой запрос.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
          {filtered.length === 0 && (
            <p className="text-base text-[#71717a]">Ничего не найдено. Попробуй другой запрос.</p>
          )}
        </div>
      )}
    </div>
  );
}
