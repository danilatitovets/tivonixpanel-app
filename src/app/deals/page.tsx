"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { RoleGuard, useCan } from "@/components/access/role-guard";
import { DealsExportButton } from "@/components/deals/deals-export-button";
import { StatusBadge } from "@/components/common/status-badge";
import { CommissionPreview } from "@/components/finance/commission-preview";
import { BalanceCard } from "@/components/finance/balance-card";
import { OkxPageTitle, OkxTable, OkxTableHead, OkxTableBody, OkxTh, OkxTr, OkxTd, OkxTableScroll } from "@/components/ui/okx-table";
import { useApp, useAppData, useCurrentUser } from "@/lib/store";
import { filterByPartnerOwnership, isPartner } from "@/lib/access";
import { getPartnerClosedDealsCount, getUserName } from "@/lib/analytics";
import { formatCurrency } from "@/lib/commission";
import { DEAL_PAYMENT_LABELS, COMMISSION_STATUS_LABELS } from "@/lib/statuses";
import { formatDate } from "@/lib/utils";
import { toUserMessage } from "@/lib/errors";
import { SERVICE_TYPE_OPTIONS, toServiceTypeSlug, getServiceTypeLabel } from "@/lib/service-types";
import {
  PAYOUT_DETAILS_TELEGRAM_MESSAGE,
  supportTelegramMessageUrl,
} from "@/lib/ui-copy";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DealPaymentStatus } from "@/lib/types";

export default function DealsPage() {
  const data = useAppData();
  const user = useCurrentUser();
  const { createDeal, updateDealPayment, ensureDealForLead, refreshFromServer, getPartnerProfile } = useApp();
  const canCreate = useCan("create_deal");
  const canConfirm = useCan("confirm_payment");
  const backfillStarted = useRef(false);

  useEffect(() => {
    if (!canCreate || backfillStarted.current) return;
    const missing = data.leads.filter(
      (l) => l.status === "won" && !data.deals.some((d) => d.leadId === l.id)
    );
    if (missing.length === 0) return;
    backfillStarted.current = true;
    void Promise.all(missing.map((l) => ensureDealForLead(l.id, user.id)))
      .then(() => refreshFromServer())
      .catch(() => {
        backfillStarted.current = false;
      });
  }, [canCreate, data.leads, data.deals, ensureDealForLead, refreshFromServer, user.id]);

  const deals = filterByPartnerOwnership(data.deals, user);
  const paid = deals.filter((d) => d.paymentStatus === "paid");
  const waiting = deals.filter((d) => d.paymentStatus === "waiting_payment");
  const accrued = deals.filter((d) => d.commissionStatus === "accrued");

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    leadId: "",
    clientName: "",
    serviceType: "landing",
    amount: "",
    paymentStatus: "waiting_payment" as DealPaymentStatus,
    notes: "",
  });

  const selectedLead = data.leads.find((l) => l.id === form.leadId);
  const closedCount = selectedLead
    ? getPartnerClosedDealsCount(data, selectedLead.partnerId)
    : 0;

  async function handleCreate() {
    if (!form.leadId || !form.amount) return;
    setSubmitting(true);
    try {
      await createDeal({
        leadId: form.leadId,
        clientName: form.clientName,
        serviceType: getServiceTypeLabel(toServiceTypeSlug(form.serviceType)),
        amount: Number(form.amount),
        currency: "USD",
        paymentStatus: form.paymentStatus,
        notes: form.notes,
        createdBy: user.id,
      });
      toast.success("Deal создана");
      setOpen(false);
    } catch (error) {
      toast.error(toUserMessage(error, "Не удалось создать сделку"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmPayment(dealId: string) {
    try {
      await updateDealPayment(dealId, "paid", user.id);
      toast.success("Оплата подтверждена, комиссия начислена");
    } catch (error) {
      toast.error(toUserMessage(error, "Не удалось подтвердить оплату"));
    }
  }

  const pdfRows = deals.map((d) => ({
    client: d.clientName,
    service: getServiceTypeLabel(d.serviceType),
    amount: formatCurrency(d.amount, d.currency),
    partner: getUserName(data, d.partnerId),
    commission: formatCurrency(d.commissionAmount, d.currency),
    commissionPercent: String(d.commissionPercent),
    payment: DEAL_PAYMENT_LABELS[d.paymentStatus],
    date: formatDate(d.closedAt),
  }));

  const totalDealsAmount = formatCurrency(deals.reduce((s, d) => s + d.amount, 0));
  const totalDealsCommission = formatCurrency(
    deals.reduce((s, d) => s + d.commissionAmount, 0)
  );

  const partnerProfile = getPartnerProfile(user.id);
  const hasFirstCommission = deals.some(
    (d) => d.paymentStatus === "paid" && d.commissionAmount > 0
  );
  const needsPaymentDetails =
    !partnerProfile.paymentDetails ||
    partnerProfile.paymentDetails.trim() === "" ||
    partnerProfile.paymentDetails === "—";
  const showPayoutDetailsHint =
    isPartner(user) && hasFirstCommission && needsPaymentDetails;

  return (
    <RoleGuard resource="deals" redirectTo="/dashboard">
    <AppLayout title="Deals" showAddLead={false}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <OkxPageTitle title="Deals" description="Закрытые заказы и расчёт комиссии партнёров" />
          <div className="flex gap-2">
            {canCreate && (
              <button type="button" onClick={() => setOpen(true)} className="h-10 rounded-full bg-[var(--color-sunrise-coral)] px-5 text-sm text-white">
                Create сделку
              </button>
            )}
            <DealsExportButton
              rows={pdfRows}
              totalAmount={totalDealsAmount}
              totalCommission={totalDealsCommission}
              filename="sdelki"
            />
          </div>
        </div>

        {showPayoutDetailsHint && (
          <p className="rounded-2xl border border-[#ebebeb] bg-[#f4f4f5] px-4 py-3 text-sm leading-relaxed text-[#71717a] md:px-5">
            После первой комиссии от клиента{" "}
            <a
              href={supportTelegramMessageUrl(PAYOUT_DETAILS_TELEGRAM_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#18181b] underline underline-offset-2 hover:text-[#18181b]/80"
            >
              напишите нам в Telegram
            </a>
            , чтобы добавить реквизиты для выплат.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <BalanceCard label="Amount всех сделок" amount={deals.reduce((s, d) => s + d.amount, 0)} />
          <BalanceCard label="Paid" amount={paid.reduce((s, d) => s + d.amount, 0)} />
          <BalanceCard label="Pending оплату" amount={waiting.length} format="count" />
          <BalanceCard label="Комиссий к выплате" amount={accrued.reduce((s, d) => s + d.commissionAmount, 0)} />
        </div>

        <div className="space-y-3 md:hidden">
          {deals.length === 0 ? (
            <EmptyState
              title="Сделок пока нет"
              description="Закрытые сделки появятся здесь после закрытия клиента"
            />
          ) : (
            deals.map((d) => (
              <div key={d.id} className="rounded-2xl bg-[#f4f4f5] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#18181b]">{d.clientName}</p>
                    <p className="mt-0.5 truncate text-xs text-[#71717a]">
                      {getServiceTypeLabel(d.serviceType)} · {getUserName(data, d.partnerId)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium">{formatCurrency(d.amount, d.currency)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge status={d.paymentStatus} label={DEAL_PAYMENT_LABELS[d.paymentStatus]} />
                  <StatusBadge status={d.commissionStatus} label={COMMISSION_STATUS_LABELS[d.commissionStatus]} />
                </div>
                <p className="mt-2 text-xs text-[#71717a]">
                  Комиссия {formatCurrency(d.commissionAmount, d.currency)} · {formatDate(d.closedAt)}
                </p>
                {canConfirm && d.paymentStatus === "waiting_payment" && (
                  <button
                    type="button"
                    className="mt-3 text-xs font-medium underline"
                    onClick={() => void handleConfirmPayment(d.id)}
                  >
                    Confirm оплату
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <OkxTableScroll className="hidden md:block">
          <OkxTable className="min-w-[900px]">
          <OkxTableHead>
            <OkxTr interactive={false}>
              {["Client", "Service", "Amount", "Partner", "%", "Commission", "Оплата", "Commission", "Date", ""].map((h) => (
                <OkxTh key={h}>{h}</OkxTh>
              ))}
            </OkxTr>
          </OkxTableHead>
          <OkxTableBody>
            {deals.length === 0 ? (
              <OkxTr interactive={false}>
                <OkxTd colSpan={10}>
                  <EmptyState
                    title="Сделок пока нет"
                    description="Закрытые сделки появятся здесь после закрытия клиента"
                  />
                </OkxTd>
              </OkxTr>
            ) : (
            deals.map((d) => (
              <OkxTr key={d.id}>
                <OkxTd className="font-medium">{d.clientName}</OkxTd>
                <OkxTd className="text-[#71717a]">{getServiceTypeLabel(d.serviceType)}</OkxTd>
                <OkxTd>{formatCurrency(d.amount, d.currency)}</OkxTd>
                <OkxTd className="text-[#71717a]">{getUserName(data, d.partnerId)}</OkxTd>
                <OkxTd>{d.commissionPercent}% {d.bonusApplied && "★"}</OkxTd>
                <OkxTd>{formatCurrency(d.commissionAmount, d.currency)}</OkxTd>
                <OkxTd><StatusBadge status={d.paymentStatus} label={DEAL_PAYMENT_LABELS[d.paymentStatus]} /></OkxTd>
                <OkxTd><StatusBadge status={d.commissionStatus} label={COMMISSION_STATUS_LABELS[d.commissionStatus]} /></OkxTd>
                <OkxTd className="text-[#71717a]">{formatDate(d.closedAt)}</OkxTd>
                <OkxTd>
                  {canConfirm && d.paymentStatus === "waiting_payment" && (
                    <button type="button" className="text-xs font-medium underline" onClick={() => void handleConfirmPayment(d.id)}>
                      Confirm оплату
                    </button>
                  )}
                </OkxTd>
              </OkxTr>
            ))
            )}
          </OkxTableBody>
          </OkxTable>
        </OkxTableScroll>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Новая сделка (только admin)</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Client</Label>
                <select className="mt-1 h-10 w-full rounded-xl border px-3 text-sm" value={form.leadId} onChange={(e) => {
                  const l = data.leads.find((x) => x.id === e.target.value);
                  setForm({ ...form, leadId: e.target.value, clientName: l?.businessName ?? "" });
                }}>
                  <option value="">Select клиента</option>
                  {data.leads.map((l) => <option key={l.id} value={l.id}>{l.businessName}</option>)}
                </select>
              </div>
              <div><Label>Client</Label><Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /></div>
              <div><Label>Service</Label>
                <select className="mt-1 h-10 w-full rounded-xl border px-3 text-sm" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
                  {SERVICE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              {form.amount && (
                <CommissionPreview amount={Number(form.amount)} partnerClosedDealsCount={closedCount} settings={data.commissionSettings} />
              )}
              <div>
                <Label>Status оплаты</Label>
                <select className="mt-1 h-10 w-full rounded-xl border px-3 text-sm" value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as DealPaymentStatus })}>
                  <option value="waiting_payment">Pending оплату</option>
                  <option value="paid">Paid</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <button type="button" disabled={submitting} className="w-full rounded-full bg-[var(--color-sunrise-coral)] py-2 text-sm text-white disabled:opacity-50" onClick={() => void handleCreate()}>
                {submitting ? "Создание…" : "Create"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
    </RoleGuard>
  );
}
