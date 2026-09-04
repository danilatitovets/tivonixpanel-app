"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { RoleGuard } from "@/components/access/role-guard";
import { getOnboardingStatusLabel, getPayoutAdminStatusLabel } from "@/lib/statuses";

type LegalRow = {
  user_id: string;
  full_name: string;
  email: string;
  telegram: string | null;
  age: number | null;
  country: string | null;
  partner_legal_status: string;
  unp: string | null;
  onboarding_status: string;
  crm_access: boolean;
  payout_status: string;
  profile?: { created_at: string };
};

export default function AdminLegalProfilesPage() {
  const [rows, setRows] = useState<LegalRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/admin/legal-profiles")
      .then((r) => r.json())
      .then((json) => {
        setRows(json.data ?? []);
        setLoading(false);
      });
  }, []);

  async function action(userId: string, path: string) {
    await fetch(`/api/admin/legal-profiles/${userId}/${path}`, { method: "POST" });
    const res = await fetch("/api/admin/legal-profiles");
    const json = await res.json();
    setRows(json.data ?? []);
  }

  return (
    <RoleGuard resource="admin" redirectTo="/dashboard">
      <AppLayout title="Legal profiles">
        {loading ? (
          <p className="py-8 text-[#71717a]">Loading…</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {rows.map((row) => (
                <div key={row.user_id} className="rounded-2xl bg-[#f4f4f5] p-4">
                  <p className="truncate font-semibold text-[#18181b]">{row.full_name}</p>
                  <p className="mt-0.5 truncate text-xs text-[#71717a]">{row.email}</p>
                  <p className="mt-2 text-sm text-[#71717a]">
                    {getOnboardingStatusLabel(row.onboarding_status)} · возраст {row.age ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-[#71717a]">
                    CRM {row.crm_access ? "да" : "нет"} ·{" "}
                    {getPayoutAdminStatusLabel(row.payout_status)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="underline"
                      onClick={() => action(row.user_id, "approve-payouts")}
                    >
                      Approve выплаты
                    </button>
                    <button
                      type="button"
                      className="underline text-red-600"
                      onClick={() => action(row.user_id, "block-user")}
                    >
                      Блок
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-[#e4e4e7] md:block">
              <table className="w-full text-sm">
                <thead className="bg-[#f4f4f5] text-left text-[#71717a]">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Возраст</th>
                    <th className="px-4 py-3">Оформление</th>
                    <th className="px-4 py-3">CRM</th>
                    <th className="px-4 py-3">Payouts</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.user_id} className="border-t border-[#e4e4e7]">
                      <td className="px-4 py-3">{row.full_name}</td>
                      <td className="px-4 py-3">{row.email}</td>
                      <td className="px-4 py-3">{row.age ?? "—"}</td>
                      <td className="px-4 py-3">{getOnboardingStatusLabel(row.onboarding_status)}</td>
                      <td className="px-4 py-3">{row.crm_access ? "да" : "нет"}</td>
                      <td className="px-4 py-3">{getPayoutAdminStatusLabel(row.payout_status)}</td>
                      <td className="space-x-2 px-4 py-3">
                        <button
                          type="button"
                          className="underline"
                          onClick={() => action(row.user_id, "approve-payouts")}
                        >
                          Approve выплаты
                        </button>
                        <button
                          type="button"
                          className="underline text-red-600"
                          onClick={() => action(row.user_id, "block-user")}
                        >
                          Блок
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AppLayout>
    </RoleGuard>
  );
}
