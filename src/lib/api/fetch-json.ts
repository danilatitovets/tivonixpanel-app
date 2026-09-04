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

function retryAfterMs(res: Response): number {
  const raw = res.headers.get("retry-after");
  if (!raw) return 800;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(Math.max(seconds * 1000, 200), 3000);
  }
  return 800;
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

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res = await send(url, init);

  if (!res.ok && [429, 502, 503].includes(res.status)) {
    await sleep(retryAfterMs(res));
    res = await send(url, init);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, res.status));
  }
  return data as T;
}
