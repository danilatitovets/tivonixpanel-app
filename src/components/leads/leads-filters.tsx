"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import { DateFilterField } from "@/components/ui/date-picker-modal";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { LEAD_SOURCES, LEAD_STATUS_LABELS } from "@/lib/statuses";
import { SERVICE_TYPE_OPTIONS } from "@/lib/service-types";
import { cn } from "@/lib/utils";

export interface LeadsFiltersState {
  status: string;
  partner: string;
  city: string;
  service: string;
  source: string;
  dateFrom: string;
  dateTo: string;
}

interface LeadsFiltersProps {
  filters: LeadsFiltersState;
  onChange: (patch: Partial<LeadsFiltersState>) => void;
  cities: string[];
  partners: { id: string; name: string }[];
  showPartner: boolean;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-[#71717a]">{label}</p>
      {children}
    </div>
  );
}

function FiltersGrid({
  filters,
  onChange,
  cities,
  partners,
  showPartner,
}: Omit<LeadsFiltersProps, "mobileOpen" | "onMobileOpenChange">) {
  return (
    <>
      <FilterField label="Статус">
        <FilterSelect
          value={filters.status}
          onChange={(v) => onChange({ status: v })}
          placeholder="Все статусы"
          options={Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        />
      </FilterField>

      {showPartner && (
        <FilterField label="Партнёр">
          <FilterSelect
            value={filters.partner}
            onChange={(v) => onChange({ partner: v })}
            placeholder="Все партнёры"
            options={partners.map((p) => ({ value: p.id, label: p.name }))}
          />
        </FilterField>
      )}

      <FilterField label="Город">
        <FilterSelect
          value={filters.city}
          onChange={(v) => onChange({ city: v })}
          placeholder="Все города"
          options={cities.map((c) => ({ value: c, label: c }))}
        />
      </FilterField>

      <FilterField label="Услуга">
        <FilterSelect
          value={filters.service}
          onChange={(v) => onChange({ service: v })}
          placeholder="Все услуги"
          options={SERVICE_TYPE_OPTIONS}
        />
      </FilterField>

      <FilterField label="Источник">
        <FilterSelect
          value={filters.source}
          onChange={(v) => onChange({ source: v })}
          placeholder="Все источники"
          options={LEAD_SOURCES.map((s) => ({ value: s, label: s }))}
        />
      </FilterField>

      <FilterField label="Дата от">
        <DateFilterField
          label="Дата от"
          value={filters.dateFrom}
          onChange={(v) => onChange({ dateFrom: v })}
        />
      </FilterField>

      <FilterField label="Дата до">
        <DateFilterField
          label="Дата до"
          value={filters.dateTo}
          onChange={(v) => onChange({ dateTo: v })}
        />
      </FilterField>
    </>
  );
}

export function countActiveFilters(filters: LeadsFiltersState, showPartner: boolean): number {
  let n = 0;
  if (filters.status !== "all") n++;
  if (showPartner && filters.partner !== "all") n++;
  if (filters.city !== "all") n++;
  if (filters.service !== "all") n++;
  if (filters.source !== "all") n++;
  if (filters.dateFrom) n++;
  if (filters.dateTo) n++;
  return n;
}

export function LeadsFilters({
  filters,
  onChange,
  cities,
  partners,
  showPartner,
  mobileOpen,
  onMobileOpenChange,
}: LeadsFiltersProps) {
  const active = countActiveFilters(filters, showPartner);

  function reset() {
    onChange({
      status: "all",
      partner: "all",
      city: "all",
      service: "all",
      source: "all",
      dateFrom: "",
      dateTo: "",
    });
  }

  return (
    <>
      {/* Desktop */}
      <div
        className={cn(
          "hidden gap-3 lg:grid",
          showPartner ? "lg:grid-cols-4 xl:grid-cols-7" : "lg:grid-cols-3 xl:grid-cols-6"
        )}
      >
        <FiltersGrid
          filters={filters}
          onChange={onChange}
          cities={cities}
          partners={partners}
          showPartner={showPartner}
        />
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => onMobileOpenChange(true)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#f4f4f5] text-sm font-medium text-[#18181b] transition-colors hover:bg-[#f4f4f5]"
        >
          <SlidersHorizontal className="size-4" />
          Фильтры
          {active > 0 && (
            <span className="rounded-full bg-[var(--color-sunrise-coral)] px-2 py-0.5 text-xs text-white">{active}</span>
          )}
        </button>

        <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="flex max-h-[90dvh] w-full min-w-0 flex-col gap-0 overflow-x-hidden rounded-t-2xl border-0 bg-white p-0 shadow-none !max-w-none"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="text-lg font-semibold text-[#18181b]">Фильтры</h3>
              <button
                type="button"
                onClick={() => onMobileOpenChange(false)}
                className="rounded-xl p-2 text-[#71717a] hover:bg-[#f4f4f5]"
                aria-label="Закрыть"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
              <div className="grid gap-4">
                <FiltersGrid
                  filters={filters}
                  onChange={onChange}
                  cities={cities}
                  partners={partners}
                  showPartner={showPartner}
                />
              </div>
            </div>

            <div className="flex gap-3 border-t border-[#f4f4f5] px-5 py-4">
              <button
                type="button"
                onClick={reset}
                className="h-11 flex-1 rounded-xl bg-[#f4f4f5] text-sm font-medium text-[#18181b]"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={() => onMobileOpenChange(false)}
                className="h-11 flex-1 rounded-full bg-[var(--color-sunrise-coral)] text-sm font-medium text-white"
              >
                Применить
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
