"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { AppModal, ModalField, fieldClass } from "@/components/ui/app-modal";
import {
  OkxTable,
  OkxTableBody,
  OkxTableScroll,
  OkxTr,
  OkxTd,
  OkxCellPrimary,
  OkxTableAction,
} from "@/components/ui/okx-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { fetchJson } from "@/lib/api/fetch-json";
import { toUserMessage } from "@/lib/errors";
import { getPartnerTypeLabel, getUserStatusLabel } from "@/lib/statuses";
import type { PartnerType, UserStatus } from "@/lib/types";

export type ApplicationRow = {
  id: string;
  userId: string;
  fullName: string | null;
  email: string | null;
  telegram: string | null;
  status: UserStatus;
  partnerType: PartnerType | null;
  agencyName: string | null;
  websiteUrl: string | null;
  commissionPercentOverride: number | null;
  assignedManagerId: string | null;
  partnershipNotes: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

type ManagerOption = { id: string; full_name: string | null; email: string | null };

type Draft = {
  status: UserStatus;
  partnerType: PartnerType | "";
  commissionPercentOverride: string;
  assignedManagerId: string;
  partnershipNotes: string;
  rejectionReason: string;
};

export function PartnerApplicationsClient({
  initialRows,
  managers,
}: {
  initialRows: ApplicationRow[];
  managers: ManagerOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ApplicationRow | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "other">("pending");

  const filtered = useMemo(() => {
    return initialRows.filter((row) => {
      if (filter === "pending") return row.status === "pending";
      if (filter === "active") return row.status === "active";
      if (filter === "other") return !["pending", "active"].includes(row.status);
      return true;
    });
  }, [initialRows, filter]);

  function openRow(row: ApplicationRow) {
    setSelected(row);
    setDraft({
      status: row.status,
      partnerType: row.partnerType ?? "",
      commissionPercentOverride:
        row.commissionPercentOverride != null ? String(row.commissionPercentOverride) : "",
      assignedManagerId: row.assignedManagerId ?? "",
      partnershipNotes: row.partnershipNotes ?? "",
      rejectionReason: row.rejectionReason ?? "",
    });
  }

  async function save(nextStatus?: UserStatus) {
    if (!selected || !draft) return;

    const status = nextStatus ?? draft.status;

    if (status === "active") {
      if (!draft.partnerType) {
        toast.error("Выберите тип партнёрства перед одобрением");
        return;
      }
      if (!window.confirm(`Одобрить заявку «${selected.fullName || selected.email}»?`)) return;
    }
    if (status === "rejected") {
      if (!draft.rejectionReason.trim()) {
        toast.error("Укажите причину отклонения");
        return;
      }
      if (!window.confirm("Отклонить заявку? Партнёр увидит причину на странице ожидания.")) return;
    }
    if (status === "suspended") {
      if (!window.confirm("Приостановить доступ партнёра?")) return;
    }

    setSaving(true);
    try {
      const payload = {
        status,
        partnerType: draft.partnerType || null,
        commissionPercentOverride:
          draft.commissionPercentOverride.trim() === ""
            ? null
            : Number(draft.commissionPercentOverride),
        assignedManagerId: draft.assignedManagerId || null,
        partnershipNotes: draft.partnershipNotes.trim() || null,
        rejectionReason: status === "rejected" ? draft.rejectionReason.trim() || null : null,
      };

      if (
        payload.commissionPercentOverride != null &&
        Number.isNaN(payload.commissionPercentOverride)
      ) {
        toast.error("Некорректный процент комиссии");
        return;
      }

      await fetchJson<{ data: ApplicationRow }>(
        `/api/admin/partner-applications/${selected.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      );

      setSelected(null);
      setDraft(null);
      toast.success(
        status === "active"
          ? "Заявка одобрена"
          : status === "rejected"
            ? "Заявка отклонена"
            : status === "suspended"
              ? "Партнёр приостановлен"
              : "Заявка обновлена"
      );
      router.refresh();
    } catch (err) {
      toast.error(toUserMessage(err, "Не удалось сохранить"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Заявки партнёров" showAddLead={false} showSearch={false}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["pending", "На проверке"],
                ["active", "Активные"],
                ["other", "Прочие"],
                ["all", "Все"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-full px-3.5 py-1.5 text-sm ${
                  filter === id
                    ? "bg-[var(--color-sunrise-coral)] text-white"
                    : "bg-[var(--color-fog-gray)] text-[var(--color-zinc-gray)] hover:bg-[var(--color-mist-gray)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e4e4e7] px-3 text-sm text-[#71717a]"
          >
            <RefreshCw className="size-3.5" />
            Обновить
          </button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="Заявок нет" />
        ) : (
          <OkxTableScroll>
          <OkxTable>
            <OkxTableBody>
              {filtered.map((row) => (
                <OkxTr key={row.id} className="cursor-pointer" onClick={() => openRow(row)}>
                  <OkxTd>
                    <OkxCellPrimary title={row.fullName || "Без имени"} subtitle={row.email || ""} />
                  </OkxTd>
                  <OkxTd className="hidden text-[#71717a] sm:table-cell">{row.telegram || "—"}</OkxTd>
                  <OkxTd className="hidden md:table-cell">{getPartnerTypeLabel(row.partnerType)}</OkxTd>
                  <OkxTd>
                    <StatusBadge status={row.status} label={getUserStatusLabel(row.status)} />
                  </OkxTd>
                  <OkxTd>
                    <OkxTableAction
                      onClick={(e) => {
                        e.stopPropagation();
                        openRow(row);
                      }}
                    >
                      Открыть
                    </OkxTableAction>
                  </OkxTd>
                </OkxTr>
              ))}
            </OkxTableBody>
          </OkxTable>
          </OkxTableScroll>
        )}
      </div>

      <AppModal
        open={Boolean(selected && draft)}
        onClose={() => {
          setSelected(null);
          setDraft(null);
        }}
        title="Заявка партнёра"
      >
        {selected && draft && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#f4f4f5] p-4 text-sm text-[#71717a]">
              <p>
                <span className="text-[#71717a]">Контакт:</span> {selected.fullName}
              </p>
              <p className="mt-1">
                <span className="text-[#71717a]">Email:</span> {selected.email}
              </p>
              <p className="mt-1">
                <span className="text-[#71717a]">Telegram:</span> {selected.telegram || "—"}
              </p>
              <p className="mt-1">
                <span className="text-[#71717a]">Агентство:</span> {selected.agencyName || "—"}
              </p>
              <p className="mt-1">
                <span className="text-[#71717a]">Сайт:</span> {selected.websiteUrl || "—"}
              </p>
            </div>

            <ModalField label="Формат партнёрства">
              <select
                className={fieldClass}
                value={draft.partnerType}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    partnerType: e.target.value as PartnerType | "",
                  })
                }
              >
                <option value="">Не указан</option>
                <option value="referral">Referral</option>
                <option value="white_label">White-label</option>
              </select>
            </ModalField>

            <ModalField label="Индивидуальный процент комиссии">
              <input
                className={fieldClass}
                inputMode="decimal"
                placeholder="Пусто = глобальные правила"
                value={draft.commissionPercentOverride}
                onChange={(e) =>
                  setDraft({ ...draft, commissionPercentOverride: e.target.value })
                }
              />
            </ModalField>

            <ModalField label="Менеджер">
              <select
                className={fieldClass}
                value={draft.assignedManagerId}
                onChange={(e) => setDraft({ ...draft, assignedManagerId: e.target.value })}
              >
                <option value="">Не назначен</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </select>
            </ModalField>

            <ModalField label="Заметки / условия">
              <textarea
                className={fieldClass}
                rows={3}
                value={draft.partnershipNotes}
                onChange={(e) => setDraft({ ...draft, partnershipNotes: e.target.value })}
              />
            </ModalField>

            <ModalField label="Причина отклонения">
              <textarea
                className={fieldClass}
                rows={2}
                value={draft.rejectionReason}
                onChange={(e) => setDraft({ ...draft, rejectionReason: e.target.value })}
              />
            </ModalField>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save("rejected")}
                className="rounded-lg border border-[#e4e4e7] px-3.5 py-2 text-sm text-[#71717a] disabled:opacity-50"
              >
                Отклонить
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save("suspended")}
                className="rounded-lg border border-[#e4e4e7] px-3.5 py-2 text-sm text-[#71717a] disabled:opacity-50"
              >
                Приостановить
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-lg border border-[#e4e4e7] px-3.5 py-2 text-sm text-[#71717a] disabled:opacity-50"
              >
                Сохранить
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save("active")}
                className="rounded-[9999px] bg-[var(--color-sunrise-coral)] px-3.5 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                Одобрить
              </button>
            </div>
          </div>
        )}
      </AppModal>
    </AppLayout>
  );
}
