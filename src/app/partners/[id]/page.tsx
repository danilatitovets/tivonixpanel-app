"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { RoleGuard } from "@/components/access/role-guard";
import { BalanceCard } from "@/components/finance/balance-card";
import { ExportButton } from "@/components/common/export-button";
import { PARTNER_LEADS_EXPORT_COLUMNS } from "@/lib/export-columns";
import { TopPartnersChart } from "@/components/charts/dashboard-charts";
import { OkxTable, OkxTableBody, OkxTr, OkxTd } from "@/components/ui/okx-table";
import { useAppData } from "@/lib/store";
import { getPartnerStats, getPartnerBalance } from "@/lib/analytics";
import { formatCurrency } from "@/lib/commission";
import { getLeadStatusLabel } from "@/lib/statuses";
import { ArrowLeft } from "lucide-react";

export default function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const data = useAppData();
  const partner = data.users.find((u) => u.id === id);
  if (!partner || partner.role !== "partner") notFound();

  const stats = getPartnerStats(data, id);
  const balance = getPartnerBalance(data, id);
  const leads = data.leads.filter((l) => l.partnerId === id);
  const deals = data.deals.filter((d) => d.partnerId === id);
  const txs = data.balanceTransactions.filter((t) => t.partnerId === id);
  const payouts = data.payouts.filter((p) => p.partnerId === id);

  const activityData = leads.slice(0, 6).map((l, i) => ({ name: l.businessName.slice(0, 8), deals: i + 1 }));

  return (
    <RoleGuard resource="partners">
      <AppLayout title={partner.name} showAddLead={false}>
        <div className="space-y-8">
          <Link href="/partners" className="inline-flex items-center gap-1 text-sm text-[#71717a]">
            <ArrowLeft className="size-4" /> Назад
          </Link>

          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{partner.name}</h1>
            <p className="break-words text-sm text-[#71717a] sm:text-base">{partner.telegram} · {partner.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <BalanceCard label="Баланс" amount={balance} />
            <BalanceCard label="Клиентов" amount={stats.totalLeads} format="count" />
            <BalanceCard label="Сделок" amount={stats.closedDeals} format="count" />
            <BalanceCard label="Продажи" amount={stats.salesAmount} />
          </div>

          <ExportButton
            data={leads.map((l) => ({
              business: l.businessName,
              status: getLeadStatusLabel(l.status),
            }))}
            filename={`partner-${partner.name}-klienty`}
            columns={PARTNER_LEADS_EXPORT_COLUMNS}
          />

          <TopPartnersChart data={activityData} height={180} />

          <section>
            <h2 className="mb-3 font-semibold">Клиенты</h2>
            <OkxTable><OkxTableBody>
              {leads.map((l) => (
                <OkxTr key={l.id}><OkxTd>{l.businessName}</OkxTd><OkxTd>{getLeadStatusLabel(l.status)}</OkxTd></OkxTr>
              ))}
            </OkxTableBody></OkxTable>
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Сделки</h2>
            <OkxTable><OkxTableBody>
              {deals.map((d) => (
                <OkxTr key={d.id}><OkxTd>{d.clientName}</OkxTd><OkxTd>{formatCurrency(d.amount)}</OkxTd><OkxTd>{d.paymentStatus}</OkxTd></OkxTr>
              ))}
            </OkxTableBody></OkxTable>
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Начисления</h2>
            <div className="space-y-3">
              {txs.map((t) => (
                <div key={t.id} className="rounded-2xl bg-[#f4f4f5] p-4 md:rounded-none md:bg-transparent md:p-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 break-words text-sm">{t.description || t.type}</p>
                    <p className="shrink-0 text-sm font-medium">{formatCurrency(t.amount)}</p>
                  </div>
                  <p className="mt-1 text-xs text-[#71717a] md:hidden">{t.type}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Выплаты</h2>
            <OkxTable><OkxTableBody>
              {payouts.map((p) => (
                <OkxTr key={p.id}><OkxTd>{formatCurrency(p.amount)}</OkxTd><OkxTd>{p.status}</OkxTd></OkxTr>
              ))}
            </OkxTableBody></OkxTable>
          </section>
        </div>
      </AppLayout>
    </RoleGuard>
  );
}
