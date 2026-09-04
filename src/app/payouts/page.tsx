"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { RoleGuard, useCan } from "@/components/access/role-guard";
import { BalanceCard } from "@/components/finance/balance-card";
import { OkxPageTitle, OkxTable, OkxTableBody, OkxTr, OkxTd, OkxTableScroll } from "@/components/ui/okx-table";
import { StatusBadge } from "@/components/common/status-badge";
import { useApp, useAppData } from "@/lib/store";
import { getPartnersWithBalance, getUserName } from "@/lib/analytics";
import { formatCurrency } from "@/lib/commission";
import { PAYOUT_STATUS_LABELS } from "@/lib/statuses";
import { formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPartnerBalance } from "@/lib/analytics";

export default function PayoutsPage() {
  const data = useAppData();
  const { createPayout, markPayoutPaid, currentUser } = useApp();
  const canCreate = useCan("create_payout");

  const balances = getPartnersWithBalance(data);
  const pending = data.payouts.filter((p) => p.status === "pending");
  const paidMonth = data.payouts.filter((p) => p.status === "paid" && (p.paidAt ?? "") >= "2026-06-01");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    partnerId: "",
    amount: "",
    paymentMethod: "USDT",
    paymentDetails: "",
    adminComment: "",
  });

  const available = form.partnerId ? getPartnerBalance(data, form.partnerId) : 0;

  function handleCreate() {
    const amount = Number(form.amount);
    const result = createPayout({
      partnerId: form.partnerId,
      amount,
      currency: "USD",
      paymentMethod: form.paymentMethod,
      paymentDetails: form.paymentDetails,
      adminComment: form.adminComment,
      createdBy: currentUser.id,
    });
    if (!result) {
      toast.error("Amount превышает доступный баланс");
      return;
    }
    toast.success("Payout создана");
    setOpen(false);
  }

  return (
    <RoleGuard resource="payouts" redirectTo="/my">
      <AppLayout title="Payouts" showAddLead={false}>
        <div className="space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <OkxPageTitle title="Payouts" description="Payouts комиссий партнёрам" />
            {canCreate && (
              <button type="button" onClick={() => setOpen(true)} className="h-10 w-full shrink-0 rounded-full bg-[var(--color-sunrise-coral)] px-5 text-sm text-white sm:w-auto">
                Create выплату
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <BalanceCard label="К выплате всего" amount={balances.reduce((s, b) => s + b.balance, 0)} />
            <BalanceCard label="Paid за месяц" amount={paidMonth.reduce((s, p) => s + p.amount, 0)} />
            <BalanceCard label="Ожидают" amount={pending.length} format="count" />
            <BalanceCard label="Partners с балансом" amount={balances.length} format="count" />
          </div>

          <div className="space-y-3 md:hidden">
            {data.payouts.map((p) => (
              <div key={p.id} className="rounded-2xl bg-[#f4f4f5] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#18181b]">
                      {getUserName(data, p.partnerId)}
                    </p>
                    <p className="mt-0.5 text-xs text-[#71717a]">
                      {p.paymentMethod} · {p.paidAt ? formatDate(p.paidAt) : "ожидает"}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium">
                    {formatCurrency(p.amount, p.currency)}
                  </p>
                </div>
                <div className="mt-3">
                  <StatusBadge status={p.status} label={PAYOUT_STATUS_LABELS[p.status]} />
                </div>
                {p.adminComment ? (
                  <p className="mt-2 break-words text-xs text-[#71717a]">{p.adminComment}</p>
                ) : null}
                {canCreate && p.status === "pending" && (
                  <button
                    type="button"
                    className="mt-3 text-xs underline"
                    onClick={() => {
                      markPayoutPaid(p.id, currentUser.id);
                      toast.success("Payout проведена");
                    }}
                  >
                    Выплатить
                  </button>
                )}
              </div>
            ))}
          </div>

          <OkxTableScroll className="hidden md:block">
            <OkxTable className="min-w-[720px]">
              <OkxTableBody>
              {data.payouts.map((p) => (
                <OkxTr key={p.id}>
                  <OkxTd>{getUserName(data, p.partnerId)}</OkxTd>
                  <OkxTd>{formatCurrency(getPartnerBalance(data, p.partnerId))}</OkxTd>
                  <OkxTd className="font-medium">{formatCurrency(p.amount, p.currency)}</OkxTd>
                  <OkxTd>{p.currency}</OkxTd>
                  <OkxTd><StatusBadge status={p.status} label={PAYOUT_STATUS_LABELS[p.status]} /></OkxTd>
                  <OkxTd className="text-[#71717a]">{p.paymentMethod}</OkxTd>
                  <OkxTd className="text-[#71717a]">{p.paidAt ? formatDate(p.paidAt) : "—"}</OkxTd>
                  <OkxTd className="text-[#71717a]">{p.adminComment}</OkxTd>
                  <OkxTd>
                    {canCreate && p.status === "pending" && (
                      <button type="button" className="text-xs underline" onClick={() => {
                        markPayoutPaid(p.id, currentUser.id);
                        toast.success("Payout проведена");
                      }}>Выплатить</button>
                    )}
                  </OkxTd>
                </OkxTr>
              ))}
              </OkxTableBody>
            </OkxTable>
          </OkxTableScroll>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Новая выплата</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Partner</Label>
                  <select className="mt-1 h-10 w-full rounded-xl border px-3 text-sm" value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })}>
                    <option value="">Select</option>
                    {data.users.filter((u) => u.role === "partner").map((u) => (
                      <option key={u.id} value={u.id}>{u.name} — баланс {formatCurrency(getPartnerBalance(data, u.id))}</option>
                    ))}
                  </select>
                </div>
                {form.partnerId && <p className="text-sm text-[#71717a]">Доступно: {formatCurrency(available)}</p>}
                <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Метод</Label><Input value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} /></div>
                <div><Label>Реквизиты</Label><Input value={form.paymentDetails} onChange={(e) => setForm({ ...form, paymentDetails: e.target.value })} /></div>
                <div><Label>Comment</Label><Input value={form.adminComment} onChange={(e) => setForm({ ...form, adminComment: e.target.value })} /></div>
                <button type="button" className="w-full rounded-full bg-[var(--color-sunrise-coral)] py-2 text-sm text-white" onClick={handleCreate}>Create</button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </AppLayout>
    </RoleGuard>
  );
}
