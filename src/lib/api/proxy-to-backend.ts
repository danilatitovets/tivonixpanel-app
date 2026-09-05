import { NextResponse, type NextRequest } from "next/server";

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "te",
  "keep-alive",
  "upgrade",
  "expect",
  "proxy-connection",
  "proxy-authenticate",
  "proxy-authorization",
  "trailer",
]);

function rewriteSetCookie(cookie: string) {
  return cookie.replace(/;\s*Domain=[^;]*/gi, "");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(response: Response): number {
  const raw = response.headers.get("retry-after");
  if (!raw) return 800;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(Math.max(seconds * 1000, 200), 3000);
  }
  return 800;
}

export async function proxyApiToBackend(request: NextRequest): Promise<NextResponse> {
  const apiBase = process.env.INTERNAL_API_URL?.replace(/\/$/, "");
  if (!apiBase) {
    return NextResponse.json({ error: "INTERNAL_API_URL not configured" }, { status: 503 });
  }

  const targetUrl = `${apiBase}${request.nextUrl.pathname}${request.nextUrl.search}`;
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    headers.set(key, value);
  });

  const host = request.headers.get("host");
  if (host) headers.set("x-forwarded-host", host);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
  if (!headers.has("user-agent")) {
    headers.set("user-agent", "tivonixpanel-frontend-proxy");
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    cache: "no-store",
    // Wait out a Render free-tier cold start, but do not hang the panel forever.
    signal: AbortSignal.timeout(55_000),
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    // Buffer the body so the frontend→API proxy works on Render/Edge
    // (streaming + duplex is unreliable across that hop).
    const body = await request.arrayBuffer();
    init.body = body;
    if (!headers.has("content-type") && body.byteLength > 0) {
      headers.set("content-type", "application/json");
    }
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(targetUrl, init);
    // Retry 502/503 once. Do not auto-retry 429 — it amplifies rate-limit storms.
    if ([502, 503].includes(backendResponse.status)) {
      const wait = retryAfterMs(backendResponse);
      console.warn(
        `[api-proxy] ${request.method} ${request.nextUrl.pathname} -> ${backendResponse.status}, retry in ${wait}ms`
      );
      await sleep(wait);
      backendResponse = await fetch(targetUrl, init);
    }
  } catch (err) {
    const aborted =
      err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    console.warn(
      `[api-proxy] ${request.method} ${request.nextUrl.pathname} -> ${aborted ? "timeout" : "unreachable"}`
    );
    return NextResponse.json(
      { error: aborted ? "API timeout" : "API unreachable" },
      { status: 503, headers: { "Retry-After": "5" } }
    );
  }

  if (!backendResponse.ok) {
    console.warn(
      `[api-proxy] ${request.method} ${request.nextUrl.pathname} -> ${backendResponse.status}`
    );
  }

  const responseHeaders = new Headers();

  backendResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    responseHeaders.set(key, value);
  });

  const setCookies =
    typeof backendResponse.headers.getSetCookie === "function"
      ? backendResponse.headers.getSetCookie()
      : [];

  if (setCookies.length === 0) {
    const single = backendResponse.headers.get("set-cookie");
    if (single) setCookies.push(single);
  }

  for (const cookie of setCookies) {
    responseHeaders.append("set-cookie", rewriteSetCookie(cookie));
  }

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}
