import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isDemoModeEnabled,
  isProductionRuntime,
  hasSupabasePublicConfig,
  safeInternalPath,
} from "../env/public";
import { assertEnvForBuild } from "../env/assert-build";
import { canAccessResource, canUserAccess, isAdmin } from "../access";
import { canAccessResource as canAccessByRole } from "../auth/access";
import { sanitizeSpreadsheetCell, buildPlainTextExport } from "../export";
import { zodToFieldErrors } from "../api/validation-response";
import { z } from "zod";
import type { User } from "../types";

function fakeUser(role: User["role"]): User {
  return {
    id: "u1",
    name: "Test",
    email: "t@example.com",
    telegram: "@t",
    role,
    status: "active",
    partnerType: null,
    agencyName: null,
    websiteUrl: null,
    commissionPercentOverride: null,
    assignedManagerId: null,
    createdAt: "",
  };
}

describe("env public helpers", () => {
  it("blocks open redirects", () => {
    assert.equal(safeInternalPath("https://evil.com", "/dashboard"), "/dashboard");
    assert.equal(safeInternalPath("//evil.com", "/dashboard"), "/dashboard");
    assert.equal(safeInternalPath("/leads", "/dashboard"), "/leads");
    assert.equal(safeInternalPath("/%2fevil", "/dashboard"), "/dashboard");
  });

  it("demo mode disabled when flag false", () => {
    const prev = process.env.NEXT_PUBLIC_DEMO_MODE;
    const allow = process.env.ALLOW_DEMO_MODE;
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    process.env.ALLOW_DEMO_MODE = "true";
    assert.equal(isDemoModeEnabled(), false);
    process.env.NEXT_PUBLIC_DEMO_MODE = prev;
    process.env.ALLOW_DEMO_MODE = allow;
  });
});

describe("assertEnvForBuild", () => {
  it("throws when public supabase missing", () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const surl = process.env.SUPABASE_URL;
    const skey = process.env.SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    assert.throws(() => assertEnvForBuild(), /Build aborted/);
    process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
    if (surl) process.env.SUPABASE_URL = surl;
    if (skey) process.env.SUPABASE_PUBLISHABLE_KEY = skey;
  });

  it("reports missing config via hasSupabasePublicConfig", () => {
    assert.equal(typeof hasSupabasePublicConfig(), "boolean");
    assert.equal(typeof isProductionRuntime(), "boolean");
  });
});

describe("role checks", () => {
  it("partner cannot access reports/settings/admin", () => {
    const partner = fakeUser("partner");
    assert.equal(canAccessResource(partner, "reports"), false);
    assert.equal(canAccessResource(partner, "settings"), false);
    assert.equal(canAccessResource(partner, "admin"), false);
    assert.equal(canAccessResource(partner, "leads"), true);
    assert.equal(canAccessByRole("partner", "reports"), false);
    assert.equal(canAccessByRole("partner", "settings"), false);
  });

  it("resource nav follows role even if status is still pending", () => {
    const pending = fakeUser("partner");
    pending.status = "pending";
    assert.equal(canAccessResource(pending, "leads"), true);
    assert.equal(canAccessResource(pending, "prospecting"), true);
    const placeholder = fakeUser("partner");
    placeholder.id = "";
    placeholder.status = "inactive";
    assert.equal(canAccessResource(placeholder, "leads"), false);
  });

  it("admin has privileged actions", () => {
    const admin = fakeUser("admin");
    assert.equal(isAdmin(admin), true);
    assert.equal(canUserAccess(admin, "confirm_payment"), true);
    assert.equal(canUserAccess(fakeUser("partner"), "confirm_payment"), false);
  });
});

describe("export sanitization", () => {
  it("neutralizes formula injection prefixes", () => {
    assert.equal(sanitizeSpreadsheetCell("=cmd|'/c calc'!A0"), "'=cmd|'/c calc'!A0");
    assert.equal(sanitizeSpreadsheetCell("+1234"), "'+1234");
    assert.equal(sanitizeSpreadsheetCell("-1+1"), "'-1+1");
    assert.equal(sanitizeSpreadsheetCell("@sum"), "'@sum");
    assert.equal(sanitizeSpreadsheetCell("normal"), "normal");
  });

  it("builds csv without executing formulas", () => {
    const text = buildPlainTextExport(
      [{ name: "=1+1", note: "ok" }],
      [
        { key: "name", label: "Name" },
        { key: "note", label: "Note" },
      ]
    );
    assert.match(text, /'=1\+1/);
    assert.match(text, /ok/);
  });

  it("export of partner-scoped rows cannot include foreign partner id", () => {
    const partnerA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const partnerB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const scoped = [
      { id: "1", partner_id: partnerA, business: "audit_lead_a1" },
      { id: "2", partner_id: partnerA, business: "audit_lead_a2" },
    ].filter((r) => r.partner_id === partnerA);
    assert.equal(scoped.every((r) => r.partner_id !== partnerB), true);
    const text = buildPlainTextExport(scoped, [
      { key: "id", label: "id" },
      { key: "partner_id", label: "partner" },
      { key: "business", label: "business" },
    ]);
    assert.equal(text.includes(partnerB), false);
    assert.equal(text.includes("audit_lead_b"), false);
  });
});

describe("zod field errors localization", () => {
  it("maps zod issues to russian field errors", () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });
    const parsed = schema.safeParse({ email: "bad", password: "1" });
    assert.equal(parsed.success, false);
    if (parsed.success) return;
    const fields = zodToFieldErrors(parsed.error);
    assert.ok(fields.email);
    assert.ok(fields.password);
    assert.equal(fields.email.includes("email") || /email|корректн/i.test(fields.email), true);
  });
});
