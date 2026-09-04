"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/lib/errors";
import type { PartnerType } from "@/lib/types";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  authErrorClass,
  authGhostLinkClass,
  authHeadingClass,
  authLabelClass,
  authPrimaryBtnClass,
  authSubheadClass,
} from "@/components/auth/auth-styles";

const PARTNER_OPTIONS: {
  type: PartnerType;
  title: string;
  description: string;
  image: string;
}[] = [
  {
    type: "referral",
    title: "Referral partner",
    description:
      "You refer a client to TIVONIX. We evaluate the project, close the deal, and do the work. After the order is paid, you receive a partner commission.",
    image: "/images/1.png",
  },
  {
    type: "white_label",
    title: "White-label",
    description:
      "You own the client relationship, sell development under your brand, and set the final price. TIVONIX handles the technical work and does not contact the client without approval.",
    image: "/images/2.png",
  },
];

const modalInputClass =
  "h-11 w-full rounded-[12px] border-0 bg-[var(--color-fog-gray)] px-4 text-[15px] leading-[1.5] tracking-[-0.005em] text-[var(--color-carbon-black)] outline-none transition-shadow placeholder:text-[var(--color-ash-gray)] focus:ring-[3px] focus:ring-[var(--color-carbon-black)]/8";

type FormState = {
  fullName: string;
  agencyName: string;
  telegram: string;
  email: string;
  websiteUrl: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

const initialForm: FormState = {
  fullName: "",
  agencyName: "",
  telegram: "",
  email: "",
  websiteUrl: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

function firstFieldError(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
    return value[0];
  }
  return undefined;
}

function parsePartnerTypeParam(raw: string | null): PartnerType | null {
  if (raw === "referral" || raw === "white_label") return raw;
  return null;
}

export function RegisterForm() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[420px] py-20 text-center text-sm text-[var(--color-zinc-gray)]">
          Loading…
        </div>
      }
    >
      <RegisterFormInner />
    </Suspense>
  );
}

function RegisterFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = useMemo(
    () => parsePartnerTypeParam(searchParams.get("type") ?? searchParams.get("partner_type")),
    [searchParams]
  );
  const [partnerType, setPartnerType] = useState<PartnerType | null>(initialType);
  const [form, setForm] = useState<FormState>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<"pending" | "confirm_email" | null>(null);

  const [mounted, setMounted] = useState(false);
  const modalOpen = partnerType !== null && done !== "confirm_email";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalOpen]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function closeModal() {
    setPartnerType(null);
    setError(null);
    setFieldErrors({});
    const params = new URLSearchParams(searchParams.toString());
    params.delete("type");
    params.delete("partner_type");
    const qs = params.toString();
    router.replace(qs ? `/register?${qs}` : "/register", { scroll: false });
  }

  function selectPartnerType(type: PartnerType) {
    setPartnerType(type);
    setError(null);
    setFieldErrors({});
    router.replace(`/register?type=${type}`, { scroll: false });
  }

  function validateClient(): string | null {
    if (!partnerType) return "Select a partnership format";
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      return "Enter your first and last name";
    }
    if (!form.telegram.trim()) return "Enter Telegram";
    if (!form.email.trim()) return "Enter email";
    if (form.password.length < 8) return "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (!form.acceptTerms) {
      return "You must accept the terms and privacy policy";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const clientError = validateClient();
    if (clientError) {
      setError(clientError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          agencyName: form.agencyName.trim() || null,
          telegram: form.telegram.trim(),
          email: form.email.trim(),
          websiteUrl: form.websiteUrl.trim() || null,
          password: form.password,
          confirmPassword: form.confirmPassword,
          partnerType,
          acceptTerms: form.acceptTerms,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: Record<string, string[] | string>;
        data?: { needsEmailConfirmation?: boolean };
      };

      if (!res.ok) {
        if (json.fieldErrors) {
          const mapped: Record<string, string> = {};
          for (const [key, messages] of Object.entries(json.fieldErrors)) {
            const text = firstFieldError(messages);
            if (text) mapped[key] = text;
          }
          setFieldErrors(mapped);
        }
        throw new Error(json.error ?? "Could not submit application");
      }

      if (json.data?.needsEmailConfirmation) {
        setDone("confirm_email");
      } else {
        setDone("pending");
        router.push("/pending");
        router.refresh();
      }
    } catch (err) {
      setError(toUserMessage(err, "Could not submit application"));
    } finally {
      setLoading(false);
    }
  }

  if (done === "confirm_email") {
    return (
      <div className="mx-auto w-full max-w-lg rounded-[15px] bg-[var(--color-paper-white)] p-8 text-center shadow-[var(--shadow-subtle)]">
        <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-[7.5px] bg-[var(--color-fog-gray)]">
          <Check className="size-5 text-[var(--color-sunrise-coral)]" strokeWidth={2} />
        </div>
        <h2 className="text-[22px] font-normal leading-[1.25] tracking-[-0.012em] text-[var(--color-carbon-black)]">
          Confirm your email
        </h2>
        <p className="mt-3 text-[15px] leading-[1.5] tracking-[-0.005em] text-[var(--color-zinc-gray)]">
          We sent an email to {form.email}. Open the link, then sign in — your application will be
          under review.
        </p>
        <Link href="/login" className={cn(authPrimaryBtnClass, "mt-7")}>
          Go to sign in
          <ArrowRight className="size-4" strokeWidth={2} />
        </Link>
      </div>
    );
  }

  const partnerLabel = partnerType === "referral" ? "Referral partner" : "White-label";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-10 text-left">
        <p className="mb-3 font-[family-name:var(--font-auth-mono)] text-[11px] uppercase tracking-[-0.006em] text-[var(--color-ash-gray)]">
          TIVONIX Partners
        </p>
        <h1 className={authHeadingClass}>Become a TIVONIX partner</h1>
        <p className={authSubheadClass}>
          Choose a partnership format and submit your application. After review, we will open
          access to the partner panel.
        </p>
      </div>

      <div className="grid gap-[11px] sm:grid-cols-2">
        {PARTNER_OPTIONS.map((option) => {
          const selected = partnerType === option.type;
          return (
            <button
              key={option.type}
              type="button"
              onClick={() => selectPartnerType(option.type)}
              aria-pressed={selected}
              className={cn(
                "relative overflow-hidden rounded-[15px] border text-left outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-[var(--color-sunrise-coral)]/25",
                selected
                  ? "border-[var(--color-sunrise-coral)] shadow-[0_0_0_1px_var(--color-sunrise-coral)]"
                  : "border-[var(--color-mist-gray)] hover:border-[var(--color-ash-gray)]"
              )}
            >
              <div className="relative bg-[var(--color-paper-white)]">
                <div
                  className="relative aspect-[16/10] w-full"
                  style={{
                    maskImage:
                      "linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 12%, #000 70%, transparent 100%)",
                    maskComposite: "intersect",
                    WebkitMaskImage:
                      "linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 12%, #000 70%, transparent 100%)",
                    WebkitMaskComposite: "source-in",
                  }}
                >
                  <Image
                    src={option.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 360px"
                    className="object-contain object-center p-1"
                    priority
                  />
                </div>
                <div className="relative p-[19px] pt-2">
                  <p className="text-[19px] font-normal leading-[1.4] tracking-[-0.009em] text-[var(--color-carbon-black)]">
                    {option.title}
                  </p>
                  <p className="mt-2 text-[15px] leading-[1.5] tracking-[-0.005em] text-[var(--color-zinc-gray)]">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-10 text-center text-[13px] text-[var(--color-zinc-gray)]">
        Already registered?{" "}
        <Link href="/login" className={cn(authGhostLinkClass, "font-bold text-[var(--color-carbon-black)]")}>
          Sign in
        </Link>
      </p>

      {mounted &&
        modalOpen &&
        createPortal(
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--color-carbon-black)]/25 supports-backdrop-filter:backdrop-blur-[2px]"
            aria-label="Закрыть"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-sheet-title"
            data-slot="sheet-content"
            data-side="bottom"
            className="register-sheet absolute inset-x-0 bottom-0 z-10 flex max-h-[min(92dvh,920px)] w-full flex-col overflow-hidden rounded-t-[20px] bg-[var(--color-paper-white)] shadow-[0_24px_80px_rgba(24,24,27,0.18)] md:inset-auto md:left-1/2 md:top-1/2 md:bottom-auto md:w-[min(42rem,calc(100%-2rem))] md:max-h-[min(90vh,900px)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[15px]"
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--color-mist-gray)] sm:hidden" />
            <div className="relative shrink-0 px-6 pt-4 pb-1 sm:px-8 sm:pt-5">
              <p id="register-sheet-title" className="pr-10 text-[19px] font-normal leading-[1.25] tracking-[-0.012em] text-[var(--color-carbon-black)]">
                Partnership application
              </p>
              <p className="mt-1 text-[14px] leading-[1.45] tracking-[-0.005em] text-[var(--color-zinc-gray)]">
                Selected format:{" "}
                <span className="font-bold text-[var(--color-carbon-black)]">{partnerLabel}</span>
              </p>
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full text-[var(--color-zinc-gray)] hover:bg-[var(--color-fog-gray)] hover:text-[var(--color-carbon-black)]"
                aria-label="Закрыть"
              >
                <X className="size-4" />
              </button>
            </div>

          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <input type="hidden" name="partnerType" value={partnerType ?? ""} />

            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-6 pt-2 sm:px-8">
            <div className="space-y-1.5">
              <label htmlFor="reg-full-name" className={authLabelClass}>
                Full name
              </label>
              <input
                id="reg-full-name"
                required
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                className={modalInputClass}
                placeholder="John Smith"
              />
              {fieldErrors.fullName && (
                <p className="text-[11px] text-[var(--color-sunrise-coral)]">{fieldErrors.fullName}</p>
              )}
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="reg-agency" className={authLabelClass}>
                  Agency / brand{" "}
                  <span className="text-[var(--color-ash-gray)]">(optional)</span>
                </label>
                <input
                  id="reg-agency"
                  autoComplete="organization"
                  value={form.agencyName}
                  onChange={(e) => updateField("agencyName", e.target.value)}
                  className={modalInputClass}
                  placeholder="Agency Studio"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reg-website" className={authLabelClass}>
                  Website{" "}
                  <span className="text-[var(--color-ash-gray)]">(optional)</span>
                </label>
                <input
                  id="reg-website"
                  type="text"
                  value={form.websiteUrl}
                  onChange={(e) => updateField("websiteUrl", e.target.value)}
                  className={modalInputClass}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="reg-telegram" className={authLabelClass}>
                  Telegram
                </label>
                <input
                  id="reg-telegram"
                  required
                  value={form.telegram}
                  onChange={(e) => updateField("telegram", e.target.value)}
                  className={modalInputClass}
                  placeholder="@username"
                />
                {fieldErrors.telegram && (
                  <p className="text-[11px] text-[var(--color-sunrise-coral)]">{fieldErrors.telegram}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reg-email" className={authLabelClass}>
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={modalInputClass}
                  placeholder="name@company.com"
                />
                {fieldErrors.email && (
                  <p className="text-[11px] text-[var(--color-sunrise-coral)]">{fieldErrors.email}</p>
                )}
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="reg-password" className={authLabelClass}>
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className={modalInputClass}
                  placeholder="At least 8 characters"
                />
                {fieldErrors.password && (
                  <p className="text-[11px] text-[var(--color-sunrise-coral)]">{fieldErrors.password}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reg-confirm" className={authLabelClass}>
                  Confirm password
                </label>
                <input
                  id="reg-confirm"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  className={modalInputClass}
                  placeholder="Enter password again"
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-[11px] text-[var(--color-sunrise-coral)]">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-[12px] bg-[var(--color-fog-gray)] px-3.5 py-3">
              <Checkbox
                checked={form.acceptTerms}
                onCheckedChange={(checked) => updateField("acceptTerms", checked === true)}
                className="mt-0.5 border-[var(--color-mist-gray)] data-checked:border-[var(--color-sunrise-coral)] data-checked:bg-[var(--color-sunrise-coral)]"
                aria-label="Accept terms"
              />
              <span className="text-[13px] leading-[1.45] text-[var(--color-zinc-gray)]">
                I accept the{" "}
                <Link
                  href="/legal/terms"
                  className="text-[var(--color-carbon-black)] underline-offset-2 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/legal/privacy"
                  className="text-[var(--color-carbon-black)] underline-offset-2 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  privacy policy
                </Link>
                . Document versions are recorded when you submit.
              </span>
            </label>

            {error && <div className={cn(authErrorClass, "border-0")}>{error}</div>}
            </div>

            <div className="shrink-0 border-t border-[var(--color-mist-gray)] bg-[var(--color-paper-white)] px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-8 sm:pb-6">
            <button type="submit" disabled={loading} className={cn(authPrimaryBtnClass, "h-11")}>
              {loading ? "Submitting…" : "Submit application"}
              {!loading && <ArrowRight className="size-4" strokeWidth={2} />}
            </button>

            <p className="mt-3 text-center text-[13px] text-[var(--color-zinc-gray)]">
              Already registered?{" "}
              <Link
                href="/login"
                className={cn(authGhostLinkClass, "font-bold text-[var(--color-carbon-black)]")}
              >
                Sign in
              </Link>
            </p>
            </div>
          </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function RegisterPageShell({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
