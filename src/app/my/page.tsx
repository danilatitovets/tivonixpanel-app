"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { PartnerCabinetHero } from "@/components/finance/partner-cabinet-hero";
import { ExportButton } from "@/components/common/export-button";
import { MY_LEADS_EXPORT_COLUMNS, formatExportDate } from "@/lib/export-columns";
import { useAddLeadSheet } from "@/components/leads/add-lead-context";
import { useLeadDetail } from "@/components/leads/lead-detail-context";
import {
  OkxTable,
  OkxTableHead,
  OkxTableBody,
  OkxTr,
  OkxTh,
  OkxTd,
  OkxCellPrimary,
} from "@/components/ui/okx-table";
import { StatusBadge } from "@/components/common/status-badge";
import { useAppData, useCurrentUser } from "@/lib/store";
import { getPartnerStats, getPartnerBalance, getPartnerMonthlyTrends } from "@/lib/analytics";
import {
  getLeadStatusLabel,
  DEAL_PAYMENT_LABELS,
  PAYOUT_STATUS_LABELS,
  ADMIN_REVIEW_LABELS,
} from "@/lib/statuses";
import { formatCurrency } from "@/lib/commission";
import { CLIENT_COPY } from "@/lib/ui-copy";
import { RoleGuard } from "@/components/access/role-guard";
import { formatDate } from "@/lib/utils";
import type { DealPaymentStatus, PayoutStatus } from "@/lib/types";

function SectionHeading({
  title,
  href,
  hrefLabel = "Все",
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-3">
      <h2 className="text-[19px] font-normal tracking-[-0.012em] text-[var(--color-carbon-black)] md:text-[22px]">
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          className="text-[13px] font-bold tracking-[-0.009em] text-[var(--color-sunrise-coral)] hover:opacity-80"
        >
          {hrefLabel}
        </Link>
      ) : null}
    </div>
  );
}

function QuietEmpty({ title }: { title: string }) {
  return (
    <p className="py-6 text-[15px] text-[var(--color-zinc-gray)]">{title}</p>
  );
}

export default function MyPage() {
  const data = useAppData();
  const user = useCurrentUser();
  const { open: openAddLead } = useAddLeadSheet();
  const { openLead } = useLeadDetail();
  const stats = getPartnerStats(data, user.id);
  const balance = getPartnerBalance(data, user.id);
  const trends = getPartnerMonthlyTrends(data, user.id);
  const allLeads = data.leads.filter((l) => l.partnerId === user.id);
  const myLeads = allLeads.slice(0, 5);
  const allDeals = data.deals.filter((d) => d.partnerId === user.id);
  const myDeals = allDeals.slice(0, 5);
  const allPayouts = data.payouts.filter((p) => p.partnerId === user.id);
  const myPayouts = allPayouts.slice(0, 5);

  const exportData = allLeads.map((l) => ({
    business: l.businessName,
    status: getLeadStatusLabel(l.status),
    budget: l.estimatedBudget,
    created: formatExportDate(l.createdAt),
  }));

  const isWhiteLabel = user.partnerType === "white_label";
  const primaryActionLabel = isWhiteLabel ? "Создать проект" : "Передать клиента";
  const listTitle = isWhiteLabel ? "Мои проекты" : CLIENT_COPY.titleMy;
  const emptyTitle = isWhiteLabel ? "Проектов пока нет" : "Клиентов пока нет";
  const dealsTitle = isWhiteLabel ? "Этапы и сделки" : "Мои сделки";

  const expectedCommission = allDeals
    .filter((d) => d.commissionStatus === "pending" || d.commissionStatus === "not_accrued")
    .reduce((sum, d) => sum + d.commissionAmount, 0);
  const confirmedCommission = allDeals
    .filter((d) => d.commissionStatus === "accrued" || d.commissionStatus === "paid")
    .reduce((sum, d) => sum + d.commissionAmount, 0);

  return (
    <RoleGuard>
      <AppLayout title="Мой кабинет" showAddLead={false} showSearch={false} hideTitle>
        <div className="space-y-12 md:space-y-14">
          <PartnerCabinetHero
            name={user.name}
            balance={balance}
            totalLeads={stats.totalLeads}
            closedDeals={stats.closedDeals}
            commissionAccrued={stats.commissionAccrued}
            trends={trends}
            actions={
              <>
                <button
                  type="button"
                  onClick={openAddLead}
                  className="inline-flex h-11 items-center rounded-full bg-[var(--color-sunrise-coral)] px-6 text-[15px] font-bold tracking-[-0.009em] text-white transition-opacity hover:opacity-90"
                >
                  {primaryActionLabel}
                </button>
                <ExportButton
                  data={exportData}
                  filename={isWhiteLabel ? "moi-proekty" : "moi-klienty"}
                  columns={MY_LEADS_EXPORT_COLUMNS}
                  sheetName={isWhiteLabel ? "Мои проекты" : "Мои клиенты"}
                  className="h-11 rounded-full border border-[var(--color-mist-gray)] bg-transparent px-5 text-[15px] font-bold tracking-[-0.009em] text-[var(--color-carbon-black)] hover:bg-[var(--color-fog-gray)]"
                />
              </>
            }
          />

          <p className="text-[15px] leading-relaxed text-[var(--color-zinc-gray)] md:text-[16px]">
            <span className="text-[var(--color-carbon-black)]">
              Ожидается {formatCurrency(expectedCommission)}
            </span>
            <span className="mx-2.5 text-[var(--color-mist-gray)]">·</span>
            <span className="text-[var(--color-carbon-black)]">
              Подтверждено {formatCurrency(confirmedCommission)}
            </span>
            <span className="mx-2.5 text-[var(--color-mist-gray)]">·</span>
            {isWhiteLabel ? "White-label" : "Referral"}
          </p>

          <section>
            <SectionHeading title={listTitle} href="/leads" hrefLabel="Все клиенты" />
            {myLeads.length === 0 ? (
              <QuietEmpty title={emptyTitle} />
            ) : (
              <>
                <div className="hidden sm:block">
                  <OkxTable>
                    <OkxTableHead>
                      <tr>
                        <OkxTh>Клиент</OkxTh>
                        <OkxTh>Статус</OkxTh>
                        <OkxTh>Проверка</OkxTh>
                      </tr>
                    </OkxTableHead>
                    <OkxTableBody>
                      {myLeads.map((l) => (
                        <OkxTr key={l.id} className="cursor-pointer" onClick={() => openLead(l.id)}>
                          <OkxTd>
                            <OkxCellPrimary title={l.businessName} subtitle={l.niche} />
                          </OkxTd>
                          <OkxTd>
                            <StatusBadge status={l.status} label={getLeadStatusLabel(l.status)} />
                          </OkxTd>
                          <OkxTd className="text-[var(--color-zinc-gray)]">
                            {l.adminReviewComment || ADMIN_REVIEW_LABELS[l.adminReviewStatus]}
                          </OkxTd>
                        </OkxTr>
                      ))}
                    </OkxTableBody>
                  </OkxTable>
                </div>
                <div className="divide-y divide-[var(--color-mist-gray)] sm:hidden">
                  {myLeads.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => openLead(l.id)}
                      className="flex w-full flex-col gap-2 py-4 text-left"
                    >
                      <p className="text-[15px] font-medium text-[var(--color-carbon-black)]">
                        {l.businessName}
                      </p>
                      {l.niche ? (
                        <p className="text-[13px] text-[var(--color-zinc-gray)]">{l.niche}</p>
                      ) : null}
                      <StatusBadge status={l.status} label={getLeadStatusLabel(l.status)} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>

          <section>
            <SectionHeading title={dealsTitle} href="/deals" hrefLabel="Все сделки" />
            {myDeals.length === 0 ? (
              <QuietEmpty title="Сделок пока нет" />
            ) : (
              <OkxTable>
                <OkxTableHead>
                  <tr>
                    <OkxTh>Клиент</OkxTh>
                    <OkxTh>Сумма</OkxTh>
                    <OkxTh>Комиссия</OkxTh>
                    <OkxTh>Оплата</OkxTh>
                  </tr>
                </OkxTableHead>
                <OkxTableBody>
                  {myDeals.map((d) => (
                    <OkxTr key={d.id} interactive={false}>
                      <OkxTd className="font-medium">{d.clientName}</OkxTd>
                      <OkxTd>{formatCurrency(d.amount, d.currency)}</OkxTd>
                      <OkxTd>{formatCurrency(d.commissionAmount, d.currency)}</OkxTd>
                      <OkxTd className="text-[var(--color-zinc-gray)]">
                        {DEAL_PAYMENT_LABELS[d.paymentStatus as DealPaymentStatus] ??
                          d.paymentStatus}
                      </OkxTd>
                    </OkxTr>
                  ))}
                </OkxTableBody>
              </OkxTable>
            )}
          </section>

          <section>
            <SectionHeading title="Мои выплаты" href="/payouts" hrefLabel="Все выплаты" />
            {myPayouts.length === 0 ? (
              <QuietEmpty title="Выплат пока нет" />
            ) : (
              <OkxTable>
                <OkxTableHead>
                  <tr>
                    <OkxTh>Сумма</OkxTh>
                    <OkxTh>Статус</OkxTh>
                    <OkxTh>Дата</OkxTh>
                  </tr>
                </OkxTableHead>
                <OkxTableBody>
                  {myPayouts.map((p) => (
                    <OkxTr key={p.id} interactive={false}>
                      <OkxTd className="font-medium">
                        {formatCurrency(p.amount, p.currency)}
                      </OkxTd>
                      <OkxTd className="text-[var(--color-zinc-gray)]">
                        {PAYOUT_STATUS_LABELS[p.status as PayoutStatus] ?? p.status}
                      </OkxTd>
                      <OkxTd className="text-[var(--color-zinc-gray)]">
                        {p.paidAt ? formatDate(p.paidAt) : "—"}
                      </OkxTd>
                    </OkxTr>
                  ))}
                </OkxTableBody>
              </OkxTable>
            )}
          </section>
        </div>
      </AppLayout>
    </RoleGuard>
  );
}
