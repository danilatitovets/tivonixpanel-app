"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-mode";
import { useApp } from "@/lib/store";
import { DEMO_USERS } from "@/lib/seed-data";
import { toUserMessage } from "@/lib/errors";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  authCardClass,
  authErrorClass,
  authGhostLinkClass,
  authHeadingClass,
  authInputClass,
  authLabelClass,
  authPrimaryBtnClass,
  authSubheadClass,
} from "@/components/auth/auth-styles";
import { cn } from "@/lib/utils";

export default function LoginForm() {
  const router = useRouter();
  const { setCurrentUserId, refreshFromServer } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolveRedirect() {
    const me = await fetch("/api/auth/me");
    if (!me.ok) {
      router.replace("/dashboard");
      return;
    }
    const body = (await me.json().catch(() => null)) as {
      user?: {
        status?: string;
        blockedUnder16?: boolean;
        onboardingComplete?: boolean;
        requiresReaccept?: boolean;
        crmAccess?: boolean;
        mustChangePassword?: boolean;
      };
    } | null;
    const user = body?.user;
    if (!user) {
      router.replace("/dashboard");
      return;
    }
    if (
      user.status === "pending" ||
      user.status === "rejected" ||
      user.status === "suspended"
    ) {
      router.replace("/pending");
      return;
    }
    if (user.status === "blocked" || user.status === "inactive") {
      router.replace("/blocked");
      return;
    }
    if (user.blockedUnder16) {
      router.replace("/blocked");
      return;
    }
    if (!user.onboardingComplete || user.requiresReaccept || !user.crmAccess) {
      router.replace(
        user.requiresReaccept ? "/onboarding/legal?step=documents" : "/onboarding/legal"
      );
      return;
    }
    if (user.mustChangePassword) {
      router.replace("/onboarding/set-password");
      return;
    }
    router.replace("/dashboard");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isDemoMode()) {
      setCurrentUserId(DEMO_USERS.partner);
      router.replace("/dashboard");
      return;
    }

    try {
      const precheck = await fetch("/api/auth/login-precheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (precheck.status === 429) {
        const body = (await precheck.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Слишком много попыток входа. Подождите 15 минут");
      }
      if (!precheck.ok && precheck.status !== 503) {
        // 503 = rate-limit infra unavailable; still allow login attempt via Supabase
        const body = (await precheck.json().catch(() => null)) as { message?: string } | null;
        if (precheck.status === 400) {
          throw new Error(body?.message ?? "Проверьте email");
        }
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      try {
        await refreshFromServer();
      } catch {
        /* dashboard bootstrap will retry calmly */
      }
      await resolveRedirect();
    } catch (err) {
      setError(toUserMessage(err, "Не удалось войти. Проверьте email и пароль"));
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-[420px]">
        <div className="mb-8">
          <p className="mb-3 font-[family-name:var(--font-auth-mono)] text-[11px] uppercase tracking-[-0.006em] text-[var(--color-ash-gray)]">
            TIVONIX Partners
          </p>
          <h1 className={authHeadingClass}>Вход в панель</h1>
          <p className={authSubheadClass}>Email и пароль для доступа к партнёрской панели.</p>
        </div>

        <form onSubmit={handleSubmit} className={cn(authCardClass, "space-y-[11px] sm:p-7")}>
          <div className="space-y-1.5">
            <label htmlFor="login-email" className={authLabelClass}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authInputClass}
              placeholder="name@company.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className={authLabelClass}>
              Пароль
            </label>
            <input
              id="login-password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
              placeholder="Введите пароль"
            />
            <div className="flex justify-end pt-1">
              <Link href="/forgot-password" className={authGhostLinkClass}>
                Забыли пароль?
              </Link>
            </div>
          </div>

          {error && (
            <div className={authErrorClass} role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className={cn(authPrimaryBtnClass, "mt-2")}>
            {loading ? "Загрузка…" : "Войти"}
            {!loading && <ArrowRight className="size-4" strokeWidth={2} />}
          </button>
        </form>

        <p className="mt-7 text-center text-[13px] text-[var(--color-zinc-gray)]">
          Нет аккаунта?{" "}
          <Link
            href="/register"
            className={cn(authGhostLinkClass, "font-bold text-[var(--color-carbon-black)]")}
          >
            Зарегистрироваться
          </Link>
        </p>

        <p className="mt-6 text-center text-[11px] text-[var(--color-ash-gray)]">
          <Link href="/legal/terms" className="underline-offset-2 hover:underline">
            Условия
          </Link>
          {" · "}
          <Link href="/legal/privacy" className="underline-offset-2 hover:underline">
            Конфиденциальность
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
