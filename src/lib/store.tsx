"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppData,
  User,
  Lead,
  Deal,
  Payout,
  CommissionSettings,
  DealPaymentStatus,
  PartnerProfile,
} from "./types";
import { getServiceTypeLabel } from "./service-types";
import { syncAdminReviewForStatus } from "./lead-admin-workflow";
import { emptyAppData, PLACEHOLDER_USER } from "./empty-app-data";
import { getSeedData } from "./seed-data";
import { calculateCommission } from "./commission";
import {
  getPartnerClosedDealsCount,
  findDuplicateLead,
  getPartnerBalance,
} from "./analytics";
import { DEMO_USERS } from "./seed-data";
import type { ProspectContact } from "./prospecting-types";
import {
  checkProspectDuplicate,
  emptyProspect,
  prospectToLeadInput,
} from "./prospecting-utils";
import { emptyPartnerProfile } from "./partner-profiles-seed";
import { isDemoMode } from "./demo-mode";
import {
  loadBootstrap,
  loadAuthMe,
  type AuthSessionUser,
  approveLeadApi,
  rejectLeadApi,
  markDuplicateLeadApi,
  doNotContactLeadApi,
  createLeadApi,
  createDealApi,
  ensureDealForLeadApi,
  updateDealApi,
  markDealPaidApi,
  cancelDealApi,
  refundDealApi,
  createPayoutApi,
  markPayoutPaidApi,
  createProspectApi,
  updateProspectApi,
  deleteProspectApi,
  bulkProspectsApi,
  convertProspectApi,
  updateLeadApi,
  addLeadActivityApi,
  updateCommissionSettingsApi,
  mapLeadToApiPatch,
  mapLeadToApiCreate,
  mapDealToApiCreate,
} from "./store-api-bridge";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "tivonix_crm_data";
const USER_KEY = "tivonix_current_user";

/** Paths where CRM bootstrap /api/auth/me must NOT run (avoids console 401). */
function isPublicAuthSurface(pathname: string | null): boolean {
  if (!pathname) return true;
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/legal/") ||
    pathname.startsWith("/auth/reset-password") ||
    pathname.startsWith("/auth/callback")
  ) {
    return true;
  }
  return false;
}

function loadData(): AppData {
  if (typeof window === "undefined") return getSeedData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      const seed = getSeedData();
      return {
        ...parsed,
        leads: parsed.leads.map((l) => ({ ...l, email: l.email ?? "" })),
        prospectContacts: parsed.prospectContacts?.length ? parsed.prospectContacts : seed.prospectContacts,
        prospectActivities: parsed.prospectActivities?.length ? parsed.prospectActivities : seed.prospectActivities,
        partnerProfiles: parsed.partnerProfiles?.length ? parsed.partnerProfiles : seed.partnerProfiles,
      };
    }
  } catch {
    /* ignore */
  }
  return getSeedData();
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadUserId(): string {
  if (typeof window === "undefined") return DEMO_USERS.admin;
  return localStorage.getItem(USER_KEY) ?? DEMO_USERS.admin;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function appendAutoDealForWonLead(
  prev: AppData,
  leadId: string,
  userId: string,
  addActivityFn: (
    data: AppData,
    leadId: string,
    userId: string,
    action: string,
    comment: string
  ) => AppData
): AppData {
  const lead = prev.leads.find((l) => l.id === leadId);
  if (!lead || lead.status !== "won") return prev;
  if (prev.deals.some((d) => d.leadId === leadId)) return prev;

  const amount = Math.max(lead.estimatedBudget || 0, 1);
  const closedCount = getPartnerClosedDealsCount(prev, lead.partnerId);
  const calc = calculateCommission(amount, closedCount, prev.commissionSettings);
  const ts = new Date().toISOString().slice(0, 10);

  const deal: Deal = {
    id: uid("d"),
    leadId,
    partnerId: lead.partnerId,
    clientName: lead.businessName,
    serviceType: lead.serviceType,
    amount,
    currency: "USD",
    commissionPercent: calc.percent,
    commissionAmount: calc.amount,
    partnerClosedDealsCountAtMoment: closedCount,
    bonusApplied: calc.hasBonus,
    paymentStatus: "waiting_payment",
    commissionStatus: "not_accrued",
    closedAt: ts,
    paidAt: null,
    notes: lead.notes ?? "",
    createdAt: ts,
    updatedAt: ts,
  };

  let next: AppData = { ...prev, deals: [deal, ...prev.deals] };
  next = addActivityFn(next, leadId, userId, "deal_created", `Сделка создана: ${lead.businessName}`);
  return next;
}

interface AppContextValue {
  data: AppData;
  currentUser: User;
  setCurrentUserId: (id: string) => void;
  resetDemoData: () => void;
  addLead: (lead: Omit<Lead, "id" | "createdAt" | "updatedAt">) => Promise<Lead>;
  updateLead: (id: string, patch: Partial<Lead>, userId: string, comment?: string) => void;
  approveLead: (id: string, userId: string, comment?: string) => void;
  rejectLead: (id: string, userId: string, comment: string) => void;
  markDuplicate: (id: string, userId: string, comment: string) => void;
  markDoNotContact: (id: string, userId: string) => void;
  assignManager: (leadId: string, managerId: string, userId: string) => void;
  createDeal: (input: {
    leadId: string;
    clientName: string;
    serviceType: string;
    amount: number;
    currency: string;
    paymentStatus: DealPaymentStatus;
    notes: string;
    createdBy: string;
  }) => Promise<Deal>;
  updateDeal: (
    dealId: string,
    patch: { amount?: number; notes?: string; serviceType?: string },
    userId: string
  ) => Promise<void>;
  ensureDealForLead: (leadId: string, userId: string) => Promise<void>;
  updateDealPayment: (dealId: string, status: DealPaymentStatus, userId: string) => Promise<void>;
  createPayout: (input: {
    partnerId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    paymentDetails: string;
    adminComment: string;
    createdBy: string;
  }) => Payout | null;
  markPayoutPaid: (payoutId: string, userId: string) => void;
  updateCommissionSettings: (patch: Partial<CommissionSettings>) => void;
  checkDuplicate: (input: Parameters<typeof findDuplicateLead>[1], excludeId?: string) => ReturnType<typeof findDuplicateLead>;
  getUserById: (id: string) => User | undefined;
  getPartnerProfile: (userId: string) => PartnerProfile;
  updatePartnerProfile: (userId: string, patch: Partial<Omit<PartnerProfile, "userId">>) => void;
  updateUser: (id: string, patch: Partial<Omit<User, "id">>) => void;
  addUser: (input: Omit<User, "id" | "createdAt">) => User;
  createProspectContact: (input: Partial<ProspectContact>) => ProspectContact;
  updateProspectContact: (id: string, patch: Partial<ProspectContact>, userId: string, comment?: string) => void;
  deleteProspectContact: (id: string) => void;
  bulkCreateProspectContacts: (items: Partial<ProspectContact>[]) => ProspectContact[];
  checkProspectDuplicate: (
    input: Parameters<typeof checkProspectDuplicate>[1],
    excludeProspectId?: string
  ) => ReturnType<typeof checkProspectDuplicate>;
  convertProspectToLead: (prospectId: string, userId: string) => Lead | null;
  refreshFromServer: () => Promise<void>;
  isBootstrapping: boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const demo = isDemoMode();
  const pathname = usePathname();
  const [data, setData] = useState<AppData>(() => (demo ? loadData() : emptyAppData()));
  const [currentUserId, setCurrentUserIdState] = useState<string>(() =>
    demo ? loadUserId() : ""
  );
  const [authSession, setAuthSession] = useState<AuthSessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(() => !demo);
  const sessionLoadedRef = useRef(false);

  const refreshFromServer = useCallback(async () => {
    const me = await loadAuthMe();
    setAuthSession(me);
    setCurrentUserIdState(me.profileId);
    const payload = await loadBootstrap();
    setData(payload.data);
  }, []);

  useEffect(() => {
    queueMicrotask(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated || demo) {
      if (demo) {
        queueMicrotask(() => setIsBootstrapping(false));
      }
      return;
    }

    if (isPublicAuthSurface(pathname)) {
      sessionLoadedRef.current = false;
      queueMicrotask(() => setIsBootstrapping(false));
      return;
    }

    if (sessionLoadedRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        const me = await loadAuthMe();
        if (cancelled) return;
        setAuthSession(me);
        setCurrentUserIdState(me.profileId);

        try {
          const payload = await loadBootstrap();
          if (cancelled) return;
          setData(payload.data);
        } catch (bootstrapErr) {
          console.error("[crm] bootstrap failed, retrying", bootstrapErr);
          try {
            await sleep(900);
            if (cancelled) return;
            const payload = await loadBootstrap();
            if (cancelled) return;
            setData(payload.data);
          } catch (retryErr) {
            console.error("[crm] bootstrap retry failed", retryErr);
          }
        }
      } catch (err) {
        console.error("[crm] session bootstrap failed", err);
      } finally {
        if (!cancelled) {
          sessionLoadedRef.current = true;
          setIsBootstrapping(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, demo, pathname]);

  useEffect(() => {
    if (hydrated && demo) saveData(data);
  }, [data, hydrated, demo]);

  const setCurrentUserId = useCallback((id: string) => {
    setCurrentUserIdState(id);
    localStorage.setItem(USER_KEY, id);
  }, []);

  const resetDemoData = useCallback(() => {
    const seed = getSeedData();
    setData(seed);
    saveData(seed);
  }, []);

  const addActivity = useCallback(
    (
      prev: AppData,
      leadId: string,
      userId: string,
      actionType: string,
      comment: string,
      oldValue = "",
      newValue = ""
    ): AppData => ({
      ...prev,
      leadActivities: [
        {
          id: uid("act"),
          leadId,
          userId,
          actionType,
          comment,
          oldValue,
          newValue,
          createdAt: new Date().toISOString(),
        },
        ...prev.leadActivities,
      ],
    }),
    []
  );

  const currentUser = useMemo(() => {
    if (demo) {
      return data.users.find((u) => u.id === currentUserId) ?? data.users[0] ?? PLACEHOLDER_USER;
    }
    if (!authSession) return PLACEHOLDER_USER;

    const fromData = data.users.find((u) => u.id === authSession.profileId);
    return {
      id: authSession.profileId,
      name: authSession.fullName ?? fromData?.name ?? authSession.email,
      email: authSession.email,
      telegram: fromData?.telegram ?? "",
      role: authSession.role,
      status: authSession.status,
      partnerType: authSession.partnerType ?? fromData?.partnerType ?? null,
      agencyName: authSession.agencyName ?? fromData?.agencyName ?? null,
      websiteUrl: authSession.websiteUrl ?? fromData?.websiteUrl ?? null,
      commissionPercentOverride:
        authSession.commissionPercentOverride ?? fromData?.commissionPercentOverride ?? null,
      assignedManagerId: authSession.assignedManagerId ?? fromData?.assignedManagerId ?? null,
      createdAt: fromData?.createdAt ?? "",
    };
  }, [data.users, currentUserId, authSession, demo]);

  const addLead = useCallback(
    async (input: Omit<Lead, "id" | "createdAt" | "updatedAt">) => {
      const normalizedInput = {
        ...input,
        serviceType: getServiceTypeLabel(input.serviceType),
      };

      if (!demo) {
        await createLeadApi(mapLeadToApiCreate(normalizedInput));
        await refreshFromServer();
        const ts = new Date().toISOString().slice(0, 10);
        return { ...normalizedInput, id: "pending", createdAt: ts, updatedAt: ts } as Lead;
      }
      const ts = new Date().toISOString().slice(0, 10);
      const lead: Lead = {
        ...normalizedInput,
        id: uid("l"),
        createdAt: ts,
        updatedAt: ts,
      };
      setData((prev) => {
        let next = { ...prev, leads: [lead, ...prev.leads] };
        next = addActivity(next, lead.id, input.partnerId, "lead_created", "Клиент добавлен");
        return next;
      });
      return lead;
    },
    [demo, addActivity, refreshFromServer]
  );

  const updateLead = useCallback(
    (id: string, patch: Partial<Lead>, userId: string, comment?: string) => {
      if (!demo) {
        const current = data.leads.find((l) => l.id === id);
        let mergedPatch = patch;
        if (patch.status && current) {
          const reviewSync = syncAdminReviewForStatus(patch.status, current.adminReviewStatus);
          if (reviewSync) mergedPatch = { ...patch, adminReviewStatus: reviewSync };
        }
        const apiPatch = mapLeadToApiPatch(mergedPatch);
        void updateLeadApi(id, apiPatch).then(async () => {
          if (comment) {
            await addLeadActivityApi(id, {
              actionType: "lead_updated",
              comment,
              oldValue: mergedPatch.status ?? "",
              newValue: mergedPatch.status ?? "",
            });
          }
          await refreshFromServer();
        });
        return;
      }
      setData((prev) => {
        const old = prev.leads.find((l) => l.id === id);
        let mergedPatch = patch;
        if (patch.status && old) {
          const reviewSync = syncAdminReviewForStatus(patch.status, old.adminReviewStatus);
          if (reviewSync) mergedPatch = { ...patch, adminReviewStatus: reviewSync };
        }
        let next: AppData = {
          ...prev,
          leads: prev.leads.map((l) =>
            l.id === id ? { ...l, ...mergedPatch, updatedAt: new Date().toISOString().slice(0, 10) } : l
          ),
        };
        if (comment && old) {
          next = addActivity(next, id, userId, "lead_updated", comment, old.status, mergedPatch.status ?? old.status);
        }
        if (mergedPatch.status === "won") {
          next = appendAutoDealForWonLead(next, id, userId, addActivity);
        }
        return next;
      });
    },
    [demo, addActivity, refreshFromServer, data.leads]
  );

  const approveLead = useCallback(
    (id: string, userId: string, comment = "Одобрено админом") => {
      if (!demo) {
        void approveLeadApi(id, comment).then(refreshFromServer);
        return;
      }
      updateLead(
        id,
        { status: "approved", adminReviewStatus: "approved", adminReviewComment: comment },
        userId,
        "Клиент одобрен админом"
      );
    },
    [demo, updateLead, refreshFromServer]
  );

  const rejectLead = useCallback(
    (id: string, userId: string, comment: string) => {
      if (!demo) {
        void rejectLeadApi(id, comment).then(refreshFromServer);
        return;
      }
      updateLead(
        id,
        { status: "rejected", adminReviewStatus: "rejected", adminReviewComment: comment },
        userId,
        `Отклонён: ${comment}`
      );
    },
    [demo, updateLead, refreshFromServer]
  );

  const markDuplicate = useCallback(
    (id: string, userId: string, comment: string) => {
      if (!demo) {
        void markDuplicateLeadApi(id, comment).then(refreshFromServer);
        return;
      }
      updateLead(
        id,
        { status: "duplicate", adminReviewStatus: "duplicate", adminReviewComment: comment },
        userId,
        "Отмечен как дубль"
      );
    },
    [demo, updateLead, refreshFromServer]
  );

  const markDoNotContact = useCallback(
    (id: string, userId: string) => {
      if (!demo) {
        void doNotContactLeadApi(id).then(refreshFromServer);
        return;
      }
      updateLead(
        id,
        { status: "do_not_contact", adminReviewStatus: "do_not_contact" },
        userId,
        "Не трогать"
      );
    },
    [demo, updateLead, refreshFromServer]
  );

  const assignManager = useCallback(
    (leadId: string, managerId: string, userId: string) => {
      updateLead(leadId, { assignedManagerId: managerId }, userId, "Назначен менеджер");
    },
    [updateLead]
  );

  const accrueCommission = useCallback(
    (prev: AppData, deal: Deal, userId: string): AppData => {
      const exists = prev.balanceTransactions.some(
        (t) => t.dealId === deal.id && t.type === "accrual" && t.status === "completed"
      );
      if (exists) return prev;

      return {
        ...prev,
        deals: prev.deals.map((d) =>
          d.id === deal.id
            ? { ...d, commissionStatus: "accrued", paidAt: new Date().toISOString().slice(0, 10) }
            : d
        ),
        balanceTransactions: [
          {
            id: uid("bt"),
            partnerId: deal.partnerId,
            dealId: deal.id,
            payoutId: null,
            type: "accrual",
            amount: deal.commissionAmount,
            currency: deal.currency,
            status: "completed",
            description: `Комиссия: ${deal.clientName}`,
            createdBy: userId,
            createdAt: new Date().toISOString(),
          },
          ...prev.balanceTransactions,
        ],
      };
    },
    []
  );

  const createDeal = useCallback(
    async (input: {
      leadId: string;
      clientName: string;
      serviceType: string;
      amount: number;
      currency: string;
      paymentStatus: DealPaymentStatus;
      notes: string;
      createdBy: string;
    }) => {
      if (!demo) {
        const res = await createDealApi(mapDealToApiCreate(input));
        const dealId = String(res.data.id ?? "");
        if (input.paymentStatus === "paid" && dealId) {
          await markDealPaidApi(dealId);
        }
        await refreshFromServer();
        const ts = new Date().toISOString().slice(0, 10);
        return {
          id: dealId || "pending",
          leadId: input.leadId,
          partnerId: "",
          clientName: input.clientName,
          serviceType: input.serviceType,
          amount: input.amount,
          currency: input.currency,
          commissionPercent: 0,
          commissionAmount: 0,
          partnerClosedDealsCountAtMoment: 0,
          bonusApplied: false,
          paymentStatus: input.paymentStatus,
          commissionStatus: input.paymentStatus === "paid" ? "accrued" : "not_accrued",
          closedAt: ts,
          paidAt: input.paymentStatus === "paid" ? ts : null,
          notes: input.notes,
          createdAt: ts,
          updatedAt: ts,
        } satisfies Deal;
      }

      let createdDeal!: Deal;

      setData((prev) => {
        const lead = prev.leads.find((l) => l.id === input.leadId);
        const partnerId = lead?.partnerId ?? "";
        const closedCount = getPartnerClosedDealsCount(prev, partnerId);
        const calc = calculateCommission(input.amount, closedCount, prev.commissionSettings);
        const ts = new Date().toISOString().slice(0, 10);

        createdDeal = {
          id: uid("d"),
          leadId: input.leadId,
          partnerId,
          clientName: input.clientName,
          serviceType: input.serviceType,
          amount: input.amount,
          currency: input.currency,
          commissionPercent: calc.percent,
          commissionAmount: calc.amount,
          partnerClosedDealsCountAtMoment: closedCount,
          bonusApplied: calc.hasBonus,
          paymentStatus: input.paymentStatus,
          commissionStatus: input.paymentStatus === "paid" ? "accrued" : "not_accrued",
          closedAt: ts,
          paidAt: input.paymentStatus === "paid" ? ts : null,
          notes: input.notes,
          createdAt: ts,
          updatedAt: ts,
        };

        let next: AppData = { ...prev, deals: [createdDeal, ...prev.deals] };
        if (input.paymentStatus === "paid") {
          next = accrueCommission(next, createdDeal, input.createdBy);
        }
        if (lead) {
          next = addActivity(next, lead.id, input.createdBy, "deal_created", `Создана сделка: ${input.clientName}`);
        }
        return next;
      });

      return createdDeal;
    },
    [demo, accrueCommission, addActivity, refreshFromServer]
  );

  const updateDeal = useCallback(
    async (
      dealId: string,
      patch: { amount?: number; notes?: string; serviceType?: string },
      userId: string
    ) => {
      if (!demo) {
        await updateDealApi(dealId, patch);
        await refreshFromServer();
        return;
      }

      setData((prev) => {
        const deal = prev.deals.find((d) => d.id === dealId);
        if (!deal) return prev;

        const amount = patch.amount ?? deal.amount;
        const closedCount = getPartnerClosedDealsCount(prev, deal.partnerId);
        const calc = calculateCommission(amount, closedCount, prev.commissionSettings);
        const ts = new Date().toISOString().slice(0, 10);

        return {
          ...prev,
          deals: prev.deals.map((d) =>
            d.id === dealId
              ? {
                  ...d,
                  ...patch,
                  amount,
                  commissionPercent: calc.percent,
                  commissionAmount: calc.amount,
                  bonusApplied: calc.hasBonus,
                  updatedAt: ts,
                }
              : d
          ),
        };
      });
      void userId;
    },
    [demo, refreshFromServer]
  );

  const ensureDealForLead = useCallback(
    async (leadId: string, userId: string) => {
      if (!demo) {
        await ensureDealForLeadApi(leadId);
        await refreshFromServer();
        return;
      }
      setData((prev) => appendAutoDealForWonLead(prev, leadId, userId, addActivity));
    },
    [demo, addActivity, refreshFromServer]
  );

  const updateDealPayment = useCallback(
    async (dealId: string, status: DealPaymentStatus, userId: string) => {
      if (!demo) {
        if (status === "paid") await markDealPaidApi(dealId);
        else if (status === "cancelled") await cancelDealApi(dealId);
        else if (status === "refunded") await refundDealApi(dealId);
        await refreshFromServer();
        return;
      }
      setData((prev) => {
        const deal = prev.deals.find((d) => d.id === dealId);
        if (!deal) return prev;

        const updated: Deal = {
          ...deal,
          paymentStatus: status,
          paidAt: status === "paid" ? new Date().toISOString().slice(0, 10) : deal.paidAt,
          commissionStatus:
            status === "paid"
              ? "accrued"
              : status === "cancelled" || status === "refunded"
                ? "cancelled"
                : deal.commissionStatus,
          updatedAt: new Date().toISOString().slice(0, 10),
        };

        let next: AppData = {
          ...prev,
          deals: prev.deals.map((d) => (d.id === dealId ? updated : d)),
        };

        if (status === "paid") {
          next = accrueCommission(next, updated, userId);
        }

        if (status === "cancelled" || status === "refunded") {
          const hasAccrual = prev.balanceTransactions.some(
            (t) => t.dealId === dealId && t.type === "accrual" && t.status === "completed"
          );
          if (hasAccrual) {
            next = {
              ...next,
              balanceTransactions: [
                {
                  id: uid("bt"),
                  partnerId: deal.partnerId,
                  dealId,
                  payoutId: null,
                  type: "cancellation",
                  amount: deal.commissionAmount,
                  currency: deal.currency,
                  status: "completed",
                  description: `Отмена комиссии: ${deal.clientName}`,
                  createdBy: userId,
                  createdAt: new Date().toISOString(),
                },
                ...next.balanceTransactions,
              ],
            };
          }
        }

        return next;
      });
    },
    [demo, accrueCommission, refreshFromServer]
  );

  const createPayout = useCallback(
    (input: {
      partnerId: string;
      amount: number;
      currency: string;
      paymentMethod: string;
      paymentDetails: string;
      adminComment: string;
      createdBy: string;
    }) => {
      if (!demo) {
        void createPayoutApi(input).then(refreshFromServer);
        return {
          id: "pending",
          partnerId: input.partnerId,
          amount: input.amount,
          currency: input.currency,
          status: "pending" as const,
          paymentMethod: input.paymentMethod,
          paymentDetails: input.paymentDetails,
          adminComment: input.adminComment,
          paidAt: null,
          createdAt: new Date().toISOString().slice(0, 10),
        };
      }

      const balance = getPartnerBalance(data, input.partnerId);
      if (input.amount > balance) return null;

      const payout: Payout = {
        id: uid("pay"),
        partnerId: input.partnerId,
        amount: input.amount,
        currency: input.currency,
        status: "pending",
        paymentMethod: input.paymentMethod,
        paymentDetails: input.paymentDetails,
        adminComment: input.adminComment,
        paidAt: null,
        createdAt: new Date().toISOString().slice(0, 10),
      };

      setData((prev) => ({ ...prev, payouts: [payout, ...prev.payouts] }));
      return payout;
    },
    [demo, data, refreshFromServer]
  );

  const markPayoutPaid = useCallback(
    (payoutId: string, userId: string) => {
      if (!demo) {
        void markPayoutPaidApi(payoutId).then(refreshFromServer);
        return;
      }
      setData((prev) => {
      const payout = prev.payouts.find((p) => p.id === payoutId);
      if (!payout || payout.status === "paid") return prev;

      const ts = new Date().toISOString().slice(0, 10);
      return {
        ...prev,
        payouts: prev.payouts.map((p) =>
          p.id === payoutId ? { ...p, status: "paid" as const, paidAt: ts } : p
        ),
        deals: prev.deals.map((d) =>
          d.partnerId === payout.partnerId && d.commissionStatus === "accrued"
            ? { ...d, commissionStatus: "paid" as const }
            : d
        ),
        balanceTransactions: [
          {
            id: uid("bt"),
            partnerId: payout.partnerId,
            dealId: null,
            payoutId,
            type: "payout",
            amount: payout.amount,
            currency: payout.currency,
            status: "completed",
            description: payout.adminComment || "Выплата партнёру",
            createdBy: userId,
            createdAt: new Date().toISOString(),
          },
          ...prev.balanceTransactions,
        ],
      };
    });
  }, [demo, refreshFromServer]);

  const updateCommissionSettings = useCallback(
    (patch: Partial<CommissionSettings>) => {
      if (!demo) {
        void updateCommissionSettingsApi(patch as Record<string, unknown>).then(refreshFromServer);
        return;
      }
      setData((prev) => ({
        ...prev,
        commissionSettings: {
          ...prev.commissionSettings,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      }));
    },
    [demo, refreshFromServer]
  );

  const checkDuplicate = useCallback(
    (input: Parameters<typeof findDuplicateLead>[1], excludeId?: string) =>
      findDuplicateLead(data, input, excludeId),
    [data]
  );

  const getUserById = useCallback((id: string) => data.users.find((u) => u.id === id), [data.users]);

  const addProspectActivity = useCallback(
    (
      prev: AppData,
      prospectId: string,
      userId: string,
      actionType: string,
      comment: string
    ): AppData => ({
      ...prev,
      prospectActivities: [
        {
          id: uid("pa"),
          prospectId,
          userId,
          actionType,
          comment,
          createdAt: new Date().toISOString(),
        },
        ...(prev.prospectActivities ?? []),
      ],
    }),
    []
  );

  const addUser = useCallback((input: Omit<User, "id" | "createdAt">) => {
    const newUser: User = {
      ...input,
      id: uid("u"),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setData((prev) => ({ ...prev, users: [...prev.users, newUser] }));
    return newUser;
  }, []);

  const getPartnerProfile = useCallback(
    (userId: string): PartnerProfile => {
      const found = data.partnerProfiles?.find((p) => p.userId === userId);
      return found ?? emptyPartnerProfile(userId);
    },
    [data.partnerProfiles]
  );

  const updatePartnerProfile = useCallback(
    (userId: string, patch: Partial<Omit<PartnerProfile, "userId">>) => {
      setData((prev) => {
        const profiles = prev.partnerProfiles ?? [];
        const idx = profiles.findIndex((p) => p.userId === userId);
        if (idx === -1) {
          return {
            ...prev,
            partnerProfiles: [{ ...emptyPartnerProfile(userId), ...patch, userId }],
          };
        }
        const next = [...profiles];
        next[idx] = { ...next[idx], ...patch };
        return { ...prev, partnerProfiles: next };
      });
    },
    []
  );

  const updateUser = useCallback((id: string, patch: Partial<Omit<User, "id">>) => {
    setData((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
  }, []);

  const createProspectContact = useCallback(
    (input: Partial<ProspectContact>) => {
      if (!demo) {
        void createProspectApi(input).then(refreshFromServer);
        const ts = new Date().toISOString().slice(0, 10);
        return {
          ...emptyProspect(input, input.createdBy ?? currentUserId),
          id: "pending",
          createdAt: ts,
          updatedAt: ts,
        };
      }
      const ts = new Date().toISOString().slice(0, 10);
      let contact: ProspectContact = {
        ...emptyProspect(input, input.createdBy ?? currentUserId),
        id: uid("pc"),
        createdAt: ts,
        updatedAt: ts,
      };
      setData((prev) => {
        if (contact.status !== "duplicate") {
          const dup = checkProspectDuplicate(prev, {
            businessName: contact.businessName,
            website: contact.website,
            instagram: contact.instagram,
            telegram: contact.telegram,
            phone: contact.phone,
            email: contact.email,
          });
          if (dup) {
            contact = {
              ...contact,
              status: "duplicate",
              duplicateLeadId: dup.type === "lead" ? dup.id : null,
            };
          }
        }
        let next: AppData = {
          ...prev,
          prospectContacts: [contact, ...(prev.prospectContacts ?? [])],
        };
        next = addProspectActivity(
          next,
          contact.id,
          contact.createdBy,
          "created",
          contact.status === "duplicate" ? "Контакт добавлен · дубль" : "Контакт добавлен"
        );
        return next;
      });
      return contact;
    },
    [demo, addProspectActivity, currentUserId, refreshFromServer]
  );

  const updateProspectContact = useCallback(
    (id: string, patch: Partial<ProspectContact>, userId: string, comment?: string) => {
      if (!demo) {
        void updateProspectApi(id, patch).then(refreshFromServer);
        return;
      }
      setData((prev) => {
        const ts = new Date().toISOString().slice(0, 10);
        let next: AppData = {
          ...prev,
          prospectContacts: (prev.prospectContacts ?? []).map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: ts, lastActionAt: ts } : p
          ),
        };
        if (comment) {
          next = addProspectActivity(next, id, userId, "updated", comment);
        }
        return next;
      });
    },
    [demo, addProspectActivity, refreshFromServer]
  );

  const deleteProspectContact = useCallback(
    (id: string) => {
      if (!demo) {
        void deleteProspectApi(id).then(refreshFromServer);
        return;
      }
      setData((prev) => ({
      ...prev,
      prospectContacts: (prev.prospectContacts ?? []).filter((p) => p.id !== id),
    }));
  }, [demo, refreshFromServer]);

  const bulkCreateProspectContacts = useCallback(
    (items: Partial<ProspectContact>[]) => {
      if (!demo) {
        void bulkProspectsApi(items).then(refreshFromServer);
        return items.map((input, i) => ({
          ...emptyProspect(input, input.createdBy ?? currentUserId),
          id: `pending-${i}`,
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        }));
      }
      const ts = new Date().toISOString().slice(0, 10);
      const created: ProspectContact[] = [];
      setData((prev) => {
        let next = prev;
        for (const input of items) {
          let contact: ProspectContact = {
            ...emptyProspect(input, input.createdBy ?? currentUserId),
            id: uid("pc"),
            createdAt: ts,
            updatedAt: ts,
          };
          if (contact.status !== "duplicate") {
            const dup = checkProspectDuplicate(next, {
              businessName: contact.businessName,
              website: contact.website,
              instagram: contact.instagram,
              telegram: contact.telegram,
              phone: contact.phone,
              email: contact.email,
            });
            if (dup) {
              contact = {
                ...contact,
                status: "duplicate",
                duplicateLeadId: dup.type === "lead" ? dup.id : null,
              };
            }
          }
          created.push(contact);
          next = {
            ...next,
            prospectContacts: [contact, ...(next.prospectContacts ?? [])],
          };
        }
        return next;
      });
      return created;
    },
    [demo, currentUserId, refreshFromServer]
  );

  const checkProspectDuplicateFn = useCallback(
    (input: Parameters<typeof checkProspectDuplicate>[1], excludeProspectId?: string) =>
      checkProspectDuplicate(data, input, excludeProspectId),
    [data]
  );

  const convertProspectToLead = useCallback(
    (prospectId: string, userId: string) => {
      if (!demo) {
        void convertProspectApi(prospectId).then(refreshFromServer);
        return null;
      }
      const prospect = data.prospectContacts?.find((p) => p.id === prospectId);
      if (!prospect || prospect.status === "duplicate" || prospect.status === "do_not_contact") {
        return null;
      }
      const dup = checkProspectDuplicate(data, {
        businessName: prospect.businessName,
        website: prospect.website,
        instagram: prospect.instagram,
        telegram: prospect.telegram,
        phone: prospect.phone,
        email: prospect.email,
      }, prospectId);
      if (dup?.type === "lead") return null;

      const leadInput = prospectToLeadInput(prospect, userId);
      void addLead(leadInput).then((lead) => {
        updateProspectContact(
          prospectId,
          { status: "converted_to_lead", convertedLeadId: lead.id },
          userId,
          "Контакт добавлен в лиды"
        );
      });
      return null;
    },
    [demo, data, addLead, updateProspectContact, refreshFromServer]
  );

  const value: AppContextValue = {
    data,
    currentUser,
    setCurrentUserId,
    resetDemoData,
    addLead,
    updateLead,
    approveLead,
    rejectLead,
    markDuplicate,
    markDoNotContact,
    assignManager,
    createDeal,
    updateDeal,
    ensureDealForLead,
    updateDealPayment,
    createPayout,
    markPayoutPaid,
    updateCommissionSettings,
    checkDuplicate,
    getUserById,
    getPartnerProfile,
    updatePartnerProfile,
    updateUser,
    addUser,
    createProspectContact,
    updateProspectContact,
    deleteProspectContact,
    bulkCreateProspectContacts,
    checkProspectDuplicate: checkProspectDuplicateFn,
    convertProspectToLead,
    refreshFromServer,
    isBootstrapping,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function useCurrentUser() {
  return useApp().currentUser;
}

export function useAppData() {
  return useApp().data;
}

export function useIsBootstrapping() {
  return useApp().isBootstrapping;
}
