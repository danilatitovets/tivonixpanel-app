"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { RoleGuard } from "@/components/access/role-guard";
import {
  formatAuditActor,
  getAuditActionLabel,
  getAuditEntityLabel,
} from "@/lib/audit-labels";

type Actor = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

type AuditRow = {
  id: string;
  actor_profile_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  old_value: unknown;
  new_value: unknown;
  actor: Actor | null;
};

function shortId(id: string | null): string {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function formatJsonPreview(value: unknown): string | null {
  if (value == null) return null;
  try {
    const text = JSON.stringify(value);
    if (!text || text === "{}" || text === "null") return null;
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  } catch {
    return null;
  }
}

export default function AdminAuditLogsPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/audit-logs")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Could not load журнал");
        setRows(json.data ?? []);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Error загрузки");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <RoleGuard resource="admin" redirectTo="/dashboard">
      <AppLayout title="Audit log">
        {loading ? (
          <p className="px-1 py-8 text-[var(--color-zinc-gray)]">Loading…</p>
        ) : error ? (
          <p className="px-1 py-8 text-red-600">{error}</p>
        ) : rows.length === 0 ? (
          <p className="px-1 py-8 text-[var(--color-zinc-gray)]">Записей пока нет</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {rows.map((row) => {
                const actor = formatAuditActor(row.actor);
                const details =
                  formatJsonPreview(row.new_value) ?? formatJsonPreview(row.old_value);
                return (
                  <div key={row.id} className="rounded-2xl bg-[var(--color-fog-gray)] p-4">
                    <p className="text-xs text-[var(--color-zinc-gray)]">
                      {new Date(row.created_at).toLocaleString("ru-RU")}
                    </p>
                    <p className="mt-1 font-medium text-[var(--color-carbon-black)]">
                      {getAuditActionLabel(row.action)}
                    </p>
                    <p className="mt-1 truncate text-sm text-[var(--color-zinc-gray)]">
                      {actor.name} · {getAuditEntityLabel(row.entity_type)}
                    </p>
                    {details ? (
                      <p className="mt-2 break-all font-mono text-[11px] text-[var(--color-ash-gray)]">
                        {details}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-hidden rounded-[15px] border border-[var(--color-mist-gray)] md:block">
              <table className="w-full text-sm">
            <thead className="bg-[var(--color-fog-gray)] text-left text-[var(--color-zinc-gray)]">
              <tr>
                <th className="px-4 py-3 font-normal">Date</th>
                <th className="px-4 py-3 font-normal">Кто сделал</th>
                <th className="px-4 py-3 font-normal">Действие</th>
                <th className="px-4 py-3 font-normal">Объект</th>
                <th className="px-4 py-3 font-normal">ID</th>
                <th className="px-4 py-3 font-normal">Детали</th>
              </tr>
            </thead>
            <tbody>
                {rows.map((row) => {
                  const actor = formatAuditActor(row.actor);
                  const details =
                    formatJsonPreview(row.new_value) ?? formatJsonPreview(row.old_value);

                  return (
                    <tr key={row.id} className="border-t border-[var(--color-mist-gray)] align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--color-zinc-gray)]">
                        {new Date(row.created_at).toLocaleString("en-US")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--color-carbon-black)]">
                          {actor.name}
                        </div>
                        {actor.email && actor.email !== actor.name ? (
                          <div className="mt-0.5 text-[13px] text-[var(--color-zinc-gray)]">
                            {actor.email}
                          </div>
                        ) : null}
                        {actor.roleLabel ? (
                          <div className="mt-1 inline-flex rounded-full bg-[var(--color-fog-gray)] px-2 py-0.5 text-[11px] text-[var(--color-zinc-gray)]">
                            {actor.roleLabel}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--color-carbon-black)]">
                          {getAuditActionLabel(row.action)}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-[var(--color-ash-gray)]">
                          {row.action}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-carbon-black)]">
                        {getAuditEntityLabel(row.entity_type)}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-[12px] text-[var(--color-zinc-gray)]"
                        title={row.entity_id ?? undefined}
                      >
                        {shortId(row.entity_id)}
                      </td>
                      <td
                        className="max-w-[220px] truncate px-4 py-3 font-mono text-[11px] text-[var(--color-ash-gray)]"
                        title={details ?? undefined}
                      >
                        {details ?? "—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
          </>
        )}
      </AppLayout>
    </RoleGuard>
  );
}
