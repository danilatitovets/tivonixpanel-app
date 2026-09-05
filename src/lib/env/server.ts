import "server-only";
import { z } from "zod";
import {
  getSupabasePublicUrl,
  getSupabasePublishableKey,
  hasSupabasePublicConfig,
  isDemoModeEnabled,
  isProductionRuntime,
} from "./public";

const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20).optional(),
  SUPABASE_SECRET_KEY: z.string().min(20).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).optional(),
  NEXT_PUBLIC_DEMO_MODE: z.enum(["true", "false"]).optional(),
  ALLOW_DEMO_MODE: z.enum(["true", "false"]).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

export type ServerEnvIssue = { code: string; message: string };

export function collectServerEnvIssues(): ServerEnvIssue[] {
  const issues: ServerEnvIssue[] = [];
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        code: "ENV_SHAPE",
        message: `${issue.path.join(".")}: ${issue.message}`,
      });
    }
  }

  if (!hasSupabasePublicConfig()) {
    issues.push({
      code: "MISSING_SUPABASE_PUBLIC",
      message:
        "Задайте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (или серверные SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY)",
    });
  }

  if (isProductionRuntime()) {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      issues.push({
        code: "DEMO_IN_PRODUCTION",
        message:
          "NEXT_PUBLIC_DEMO_MODE=true запрещён в production. Установите false или удалите переменную.",
      });
    }
    if (!process.env.SUPABASE_SECRET_KEY?.trim() && process.env.APP_SERVICE !== "frontend") {
      issues.push({
        code: "MISSING_SUPABASE_SECRET",
        message: "SUPABASE_SECRET_KEY обязателен в production (server-only).",
      });
    }
  }

  return issues;
}

export function assertServerEnv(): void {
  const issues = collectServerEnvIssues();
  if (issues.length === 0) return;
  const detail = issues.map((i) => `[${i.code}] ${i.message}`).join("\n");
  throw new Error(`Некорректная конфигурация окружения:\n${detail}`);
}

export function getValidatedSupabasePublic() {
  const url = getSupabasePublicUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    throw new Error("Missing Supabase public URL or publishable key");
  }
  return { url, key };
}

export function getValidatedSupabaseSecret(): string {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error("Missing SUPABASE_SECRET_KEY");
  }
  return secret;
}

export { isDemoModeEnabled, isProductionRuntime, hasSupabasePublicConfig };
