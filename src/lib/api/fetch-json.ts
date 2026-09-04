import { apiErrorMessage } from "@/lib/errors";

function resolveApiUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = process.env.INTERNAL_API_URL?.replace(/\/$/, "");
  if (base && typeof window === "undefined") {
    return `${base}${url.startsWith("/") ? url : `/${url}`}`;
  }
  return url;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(res: Response, fallbackMs: number): number {
  const raw = res.headers.get("retry-after");
  if (!raw) return fallbackMs;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(Math.max(seconds * 1000, fallbackMs), 15000);
  }
  return fallbackMs;
}

async function send(url: string, init?: RequestInit): Promise<Response> {
  return fetch(resolveApiUrl(url), {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text.trim().slice(0, 200) || `HTTP ${res.status}` };
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  let res = await send(url, init);

  // One calm retry only — aggressive loops make Render 429 worse.
  if (!res.ok && [429, 502, 503].includes(res.status)) {
    const wait = retryAfterMs(res, res.status === 429 ? 2500 : 800);
    await sleep(wait);
    res = await send(url, init);
  }

  const data = await readBody(res);
  if (!res.ok) {
    // Avoid retry storms: surface 429 clearly so callers can back off.
    if (res.status === 429 && method === "GET") {
      throw new Error(apiErrorMessage(data, 429));
    }
    throw new Error(apiErrorMessage(data, res.status));
  }
  return data as T;
}
