import { NextResponse, type NextRequest } from "next/server";
import { proxyApiToBackend } from "@/lib/api/proxy-to-backend";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import {
  getSupabasePublicUrl,
  getSupabasePublishableKey,
  isDemoModeEnabled,
  safeInternalPath,
} from "@/lib/env/public";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/pending",
  "/blocked",
  "/auth/callback",
  "/auth/reset-password",
  "/legal/privacy",
  "/legal/terms",
  "/legal/personal-data-consent",
  "/legal/partner-agreement",
  "/legal/commission-rules",
  "/legal/cookies",
];

const AUTH_ENTRY_PATHS = ["/login", "/register", "/forgot-password"];

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/academy",
  "/prospecting",
  "/leads",
  "/deals",
  "/partners",
  "/payouts",
  "/reports",
  "/settings",
  "/admin",
  "/my",
  "/onboarding",
];

const DEMO_MODE = isDemoModeEnabled();
const API_ONLY = process.env.APP_SERVICE === "api";
const FRONTEND_API_PROXY =
  process.env.APP_SERVICE === "frontend" && Boolean(process.env.INTERNAL_API_URL?.trim());

function isApiOnlyBlocked(pathname: string) {
  if (!API_ONLY) return false;
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next")) return false;
  if (pathname === "/login" || pathname === "/favicon.ico") return false;
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)) return false;
  return true;
}

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAuthEntry(pathname: string) {
  return AUTH_ENTRY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function homeForRole() {
  return "/dashboard";
}

function misconfiguredResponse(pathname: string) {
  if (pathname === "/api/health") {
    return NextResponse.json(
      { ok: false, error: "missing_supabase_env", service: process.env.APP_SERVICE ?? "full" },
      { status: 503 }
    );
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { code: "MISCONFIGURED", error: "Service temporarily unavailable", message: "Service temporarily unavailable" },
      { status: 503 }
    );
  }
  return new NextResponse(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Service unavailable</title></head><body style="font-family:system-ui;padding:2rem"><h1>Service temporarily unavailable</h1><p>Required Supabase environment variables are not set.</p></body></html>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

/** Reject DEMO_MODE=true when it would be ignored in production builds. */
function demoModeBlockedInProduction(pathname: string) {
  if (process.env.NODE_ENV !== "production") return null;
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;
  if (pathname === "/api/health") {
    return NextResponse.json(
      { ok: false, error: "demo_mode_forbidden_in_production" },
      { status: 503 }
    );
  }
  return new NextResponse("DEMO_MODE is forbidden in production", { status: 503 });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Liveness only. Never proxy /api/health to the API service — on Render free
  // that turns keepalive + client probes into a 429 storm and the panel never loads.
  if (pathname === "/api/health") {
    return NextResponse.json({
      ok: true,
      service: process.env.APP_SERVICE ?? "full",
    });
  }

  const demoBlocked = demoModeBlockedInProduction(pathname);
  if (demoBlocked) return demoBlocked;

  if (isApiOnlyBlocked(pathname)) {
    return NextResponse.json({ error: "API service" }, { status: 404 });
  }

  if (FRONTEND_API_PROXY && !DEMO_MODE && pathname.startsWith("/api/")) {
    return proxyApiToBackend(request);
  }

  // Demo: only allowed outside production with ALLOW_DEMO_MODE=true.
  // Still require public paths to work; CRM uses local seed (no Supabase session).
  if (DEMO_MODE) {
    if (isProtected(pathname) || pathname.startsWith("/admin")) {
      // In demo, allow CRM UI without Supabase — intentional local-only.
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  const url = getSupabasePublicUrl();
  const key = getSupabasePublishableKey();

  if (!url || !key) {
    // Fail-closed: never treat missing env as "public".
    if (
      pathname.startsWith("/_next") ||
      pathname === "/favicon.ico" ||
      /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
    ) {
      return NextResponse.next();
    }
    return misconfiguredResponse(pathname);
  }

  if (pathname.startsWith("/api/") || pathname.startsWith("/_next")) {
    return updateSession(request);
  }

  // Legal docs & reset/callback: session refresh only (no auth gate)
  if (
    pathname.startsWith("/legal/") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/reset-password")
  ) {
    return updateSession(request);
  }

  const needsProfileGate =
    pathname === "/" ||
    isProtected(pathname) ||
    isAuthEntry(pathname) ||
    pathname.startsWith("/pending") ||
    pathname.startsWith("/blocked");

  if (!needsProfileGate && isPublic(pathname)) {
    return updateSession(request);
  }

  if (!needsProfileGate && !isProtected(pathname)) {
    return updateSession(request);
  }

  let response = await updateSession(request);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname === "/") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }
    if (isAuthEntry(pathname) || pathname.startsWith("/pending") || pathname.startsWith("/blocked")) {
      return response;
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", safeInternalPath(pathname, "/dashboard"));
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("user_id", user.id)
    .single();

  const role = profile?.role as string | undefined;
  const status = profile?.status as string | undefined;

  // Profile not ready yet (race after signup) — keep user out of CRM
  if (!profile || !status) {
    if (pathname.startsWith("/pending") || pathname.startsWith("/blocked") || isAuthEntry(pathname)) {
      return response;
    }
    const pending = request.nextUrl.clone();
    pending.pathname = "/pending";
    return NextResponse.redirect(pending);
  }

  if (pathname === "/" || isAuthEntry(pathname)) {
    if (role === "admin") {
      const dest = request.nextUrl.clone();
      dest.pathname = "/dashboard";
      return NextResponse.redirect(dest);
    }
    if (status === "pending" || status === "rejected" || status === "suspended") {
      const dest = request.nextUrl.clone();
      dest.pathname = "/pending";
      return NextResponse.redirect(dest);
    }
    if (status === "blocked" || status === "inactive") {
      const dest = request.nextUrl.clone();
      dest.pathname = "/blocked";
      return NextResponse.redirect(dest);
    }
    const dest = request.nextUrl.clone();
    dest.pathname = homeForRole();
    return NextResponse.redirect(dest);
  }

  if (pathname.startsWith("/pending")) {
    if (role === "admin") {
      const dest = request.nextUrl.clone();
      dest.pathname = "/dashboard";
      return NextResponse.redirect(dest);
    }
    if (status === "blocked" || status === "inactive") {
      const dest = request.nextUrl.clone();
      dest.pathname = "/blocked";
      return NextResponse.redirect(dest);
    }
    if (status === "active") {
      const dest = request.nextUrl.clone();
      dest.pathname = homeForRole();
      return NextResponse.redirect(dest);
    }
    return response;
  }

  if (pathname.startsWith("/blocked")) {
    return response;
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    const forbidden = request.nextUrl.clone();
    forbidden.pathname = "/dashboard";
    forbidden.searchParams.set("error", "forbidden");
    return NextResponse.redirect(forbidden);
  }

  if (role === "admin") {
    return response;
  }

  if (status === "pending" || status === "rejected" || status === "suspended") {
    const pending = request.nextUrl.clone();
    pending.pathname = "/pending";
    return NextResponse.redirect(pending);
  }

  if (status === "blocked" || status === "inactive") {
    const blocked = request.nextUrl.clone();
    blocked.pathname = "/blocked";
    return NextResponse.redirect(blocked);
  }

  if (isProtected(pathname)) {
    const { data: legal } = await supabase
      .from("user_legal_profiles")
      .select("crm_access, onboarding_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (legal?.onboarding_status === "blocked_under_16") {
      const blocked = request.nextUrl.clone();
      blocked.pathname = "/blocked";
      blocked.searchParams.set("reason", "under_16");
      return NextResponse.redirect(blocked);
    }

    const needsOnboarding =
      !legal ||
      legal.onboarding_status === "not_started" ||
      legal.onboarding_status === "in_progress" ||
      legal.onboarding_status === "requires_reaccept" ||
      !legal.crm_access;

    const mustChangePassword = user.user_metadata?.must_change_password === true;

    if (needsOnboarding) {
      if (!pathname.startsWith("/onboarding/legal")) {
        const onboarding = request.nextUrl.clone();
        onboarding.pathname = "/onboarding/legal";
        return NextResponse.redirect(onboarding);
      }
      return response;
    }

    if (mustChangePassword) {
      if (!pathname.startsWith("/onboarding/set-password")) {
        const setPassword = request.nextUrl.clone();
        setPassword.pathname = "/onboarding/set-password";
        return NextResponse.redirect(setPassword);
      }
      return response;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
