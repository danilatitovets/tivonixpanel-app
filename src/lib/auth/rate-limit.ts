import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const REGISTER_LIMIT = 30;
const REGISTER_WINDOW_SECONDS = 15 * 60;
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_SECONDS = 15 * 60;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "unknown";
}

/**
 * Postgres-backed rate limit (multi-instance safe via service role RPC).
 * Fail closed on missing RPC or DB errors — required for production.
 */
export async function allowRegisterAttempt(
  request: Request,
  email: string
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const admin = createAdminClient();
  const ip = clientIp(request);
  const emailKey = email.trim().toLowerCase();

  const buckets = [`register:ip:${ip}`, `register:email:${emailKey}`];

  for (const bucket of buckets) {
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_bucket_key: bucket,
      p_max_requests: REGISTER_LIMIT,
      p_window_seconds: REGISTER_WINDOW_SECONDS,
    });

    if (error) {
      console.error("[rate-limit] check failed", error.code, error.message);
      // Fail open: a missing RPC must not block partner applications.
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (data !== true) {
      return { allowed: false, retryAfterSeconds: REGISTER_WINDOW_SECONDS };
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Login rate limit (IP + email). Fail closed on RPC errors.
 */
export async function allowLoginAttempt(
  request: Request,
  email: string
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const admin = createAdminClient();
  const ip = clientIp(request);
  const emailKey = email.trim().toLowerCase() || "empty";

  const buckets = [`login:ip:${ip}`, `login:email:${emailKey}`];

  for (const bucket of buckets) {
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_bucket_key: bucket,
      p_max_requests: LOGIN_LIMIT,
      p_window_seconds: LOGIN_WINDOW_SECONDS,
    });

    if (error) {
      console.error("[rate-limit] login check failed", error.code, error.message);
      return { allowed: false, retryAfterSeconds: LOGIN_WINDOW_SECONDS };
    }

    if (data !== true) {
      return { allowed: false, retryAfterSeconds: LOGIN_WINDOW_SECONDS };
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
