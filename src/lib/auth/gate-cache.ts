/**
 * Short-lived gate cache so protected navigations do not hit profiles +
 * user_legal_profiles on every click (Render Free + remote Supabase latency).
 * Only used after a verified Supabase session; APIs still enforce RLS.
 */
export type GateCache = {
  uid: string;
  role: string;
  status: string;
  crmAccess: boolean;
  onboarding: string | null;
  mustChangePassword: boolean;
  exp: number;
};

const COOKIE = "tvx_gate";
const TTL_MS = 120_000;

export function readGateCache(request: { cookies: { get: (n: string) => { value: string } | undefined } }, userId: string): GateCache | null {
  const raw = request.cookies.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as GateCache;
    if (!data || data.uid !== userId || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeGateCache(
  response: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } },
  gate: Omit<GateCache, "exp">
) {
  const payload: GateCache = { ...gate, exp: Date.now() + TTL_MS };
  response.cookies.set(COOKIE, encodeURIComponent(JSON.stringify(payload)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.ceil(TTL_MS / 1000),
  });
}

export function clearGateCache(
  response: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } }
) {
  response.cookies.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
