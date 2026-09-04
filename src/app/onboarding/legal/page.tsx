"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { toUserMessage } from "@/lib/errors";
import { DateFilterField } from "@/components/ui/date-picker-modal";
import {
  LegalDocumentModal,
  ONBOARDING_CONSENT_DOCS,
} from "@/components/legal/legal-document-modal";

const inputClass =
  "h-11 w-full rounded-xl bg-[#f4f4f5] px-3.5 text-sm outline-none focus:bg-[#f4f4f5]";

export default function LegalOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [openDocSlug, setOpenDocSlug] = useState<string | null>(null);
  const [openDocTitle, setOpenDocTitle] = useState("");

  function openDocument(slug: string, title: string) {
    setOpenDocSlug(slug);
    setOpenDocTitle(title);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!dateOfBirth) {
      setError("Укажите дату рождения");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Пароль — минимум 8 символов");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      setLoading(false);
      return;
    }

    const fd = new FormData(e.currentTarget);

    const payload = {
      fullName: String(fd.get("fullName")),
      email: String(fd.get("email")),
      city: String(fd.get("city") || ""),
      country: String(fd.get("country")),
      dateOfBirth,
      acceptTerms: fd.get("acceptTerms") === "on",
      acceptPrivacy: fd.get("acceptPrivacy") === "on",
      acceptPersonalData: fd.get("acceptPersonalData") === "on",
      acceptPartnerAgreement: fd.get("acceptPartnerAgreement") === "on",
      acceptCommissionRules: fd.get("acceptCommissionRules") === "on",
      acceptCookies: fd.get("acceptCookies") === "on",
      password,
      confirmPassword,
    };

    const res = await fetch("/api/onboarding/legal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 403 && (data.blocked || data.reason === "under_16")) {
      router.push("/blocked");
      return;
    }

    if (!res.ok) {
      setError(toUserMessage(data.error, "Не удалось сохранить данные"));
      setLoading(false);
      return;
    }

    if (!data.passwordSet) {
      const pwRes = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });

      const pwData = await pwRes.json().catch(() => ({}));

      if (!pwRes.ok) {
        setError(toUserMessage(pwData.error, "Не удалось сохранить пароль"));
        setLoading(false);
        return;
      }
    }

    await fetch("/api/auth/me");
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <Image
          src="/images/tl-Photoroom.png"
          alt="TIVONIX Partners CRM"
          width={320}
          height={120}
          priority
          className="h-auto w-[180px] object-contain sm:w-[200px]"
        />
        <h1 className="mt-6 text-2xl font-semibold text-[#18181b]">Юридическое оформление</h1>
        <p className="mt-2 max-w-sm text-sm text-[#71717a]">
          Заполните данные, примите документы и задайте свой пароль для входа в CRM.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          ["fullName", "ФИО *", "text"],
          ["email", "Email *", "email"],
          ["country", "Страна *", "text"],
          ["city", "Город", "text"],
        ].map(([name, label, type]) => (
          <div key={name}>
            <label className="mb-2 block text-sm text-[#71717a]">{label}</label>
            <input name={name} type={type} required={label.includes("*")} className={inputClass} />
          </div>
        ))}

        <div>
          <label className="mb-2 block text-sm text-[#71717a]">Дата рождения *</label>
          <div className="relative">
            <DateFilterField
              label="Дата рождения"
              placeholder="Выберите дату"
              value={dateOfBirth}
              onChange={setDateOfBirth}
              variant="birth"
              className="pr-10"
            />
            <CalendarDays className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-[#9ca3af]" />
          </div>
        </div>

        <div className="space-y-3 rounded-2xl bg-[#f4f4f5] p-4 text-sm">
          <p className="text-xs text-[#71717a]">
            Отметьте галочки после ознакомления. Название документа можно открыть и прочитать.
          </p>
          {ONBOARDING_CONSENT_DOCS.map(({ name, label, slug }) => (
            <label key={name} className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" name={name} required className="mt-0.5 size-4 shrink-0" />
              <span className="leading-snug text-[#18181b]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openDocument(slug, label);
                  }}
                  className="text-left underline decoration-[#18181b]/25 underline-offset-2 hover:decoration-[#18181b]"
                >
                  {label}
                </button>
              </span>
            </label>
          ))}
        </div>

        <div className="space-y-4 rounded-2xl border border-[#e4e4e7] p-4">
          <div>
            <p className="text-sm font-medium text-[#18181b]">Свой пароль</p>
            <p className="mt-1 text-xs text-[#71717a]">
              Временный пароль от админа больше не понадобится — придумайте личный.
            </p>
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm text-[#71717a]">
              Новый пароль *
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="Минимум 8 символов"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm text-[#71717a]">
              Повторите пароль *
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              placeholder="Ещё раз"
            />
          </div>
        </div>

        {error && <p className="text-sm text-[#ef4444]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-full bg-[var(--color-sunrise-coral)] text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Сохранение…" : "Завершить и войти"}
        </button>
      </form>

      <LegalDocumentModal
        slug={openDocSlug}
        title={openDocTitle}
        open={openDocSlug !== null}
        onClose={() => setOpenDocSlug(null)}
      />
    </div>
  );
}
