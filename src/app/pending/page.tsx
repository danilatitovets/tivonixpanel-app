"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/errors";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  authCardClass,
  authErrorClass,
  authGhostLinkClass,
  authHeadingClass,
  authPrimaryBtnClass,
  authSubheadClass,
} from "@/components/auth/auth-styles";
import { cn } from "@/lib/utils";

type PendingInfo = {
  status: string;
  rejectionReason?: string | null;
};

export default function PendingPage() {
  const router = useRouter();
  const [info, setInfo] = useState<PendingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await fetch("/api/auth/me");
        if (me.status === 401) {
          // Registration may succeed without a browser session (email confirm / proxy).
          // Keep the applicant on this page instead of dumping them on login.
          if (!cancelled) {
            setInfo({ status: "pending" });
          }
          return;
        }
        if (!me.ok) {
          throw new Error("Could not load application status");
        }
        const json = (await me.json()) as {
          user: {
            status: string;
            rejectionReason?: string | null;
            crmAccess?: boolean;
            onboardingComplete?: boolean;
          };
        };

        if (json.user.status === "active") {
          if (!json.user.onboardingComplete || !json.user.crmAccess) {
            router.replace("/onboarding/legal");
          } else {
            router.replace("/dashboard");
          }
          return;
        }

        if (!cancelled) {
          setInfo({
            status: json.user.status,
            rejectionReason: json.user.rejectionReason ?? null,
          });
        }
      } catch (err) {
        if (!cancelled) setError(toUserMessage(err, "Could not load status"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(toUserMessage(err, "Could not sign out"));
      setLoggingOut(false);
    }
  }

  const title =
    info?.status === "rejected"
      ? "Application rejected"
      : info?.status === "suspended"
        ? "Account suspended"
        : info?.status === "blocked" || info?.status === "inactive"
          ? "Access restricted"
          : "Application submitted";

  const description =
    info?.status === "rejected"
      ? info.rejectionReason ||
        "Unfortunately, the application was rejected. Contact support if you need help."
      : info?.status === "suspended"
        ? "Your partner access is temporarily suspended. Contact your TIVONIX manager."
        : "We will review your details and contact you on Telegram. After approval, you will get access to the TIVONIX partner panel.";

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-[420px]">
        <div className={cn(authCardClass, "text-center sm:p-8")}>
          {loading ? (
            <p className="text-[15px] text-[var(--color-zinc-gray)]">Loading…</p>
          ) : (
            <>
              <p className="mb-3 font-[family-name:var(--font-auth-mono)] text-[11px] uppercase tracking-[-0.006em] text-[var(--color-ash-gray)]">
                Application status
              </p>
              <h1 className={authHeadingClass}>{title}</h1>
              <p className={cn(authSubheadClass, "mx-auto")}>{description}</p>
              {error && <div className={cn(authErrorClass, "mt-5 text-left")}>{error}</div>}
              <Link href="/login" className={cn(authPrimaryBtnClass, "mt-8")}>
                Sign in
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className={cn(authGhostLinkClass, "mt-4")}
              >
                {loggingOut ? "Signing out…" : "Sign out"}
              </button>
              <p className="mt-6 text-[11px] text-[var(--color-ash-gray)]">
                <Link href="/legal/terms" className={authGhostLinkClass}>
                  Terms
                </Link>
                {" · "}
                <Link href="/legal/privacy" className={authGhostLinkClass}>
                  Privacy
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
