import { NextResponse, type NextRequest } from "next/server";

function rewriteSetCookie(cookie: string) {
  return cookie.replace(/;\s*Domain=[^;]*/gi, "");
}

export async function proxyApiToBackend(request: NextRequest): Promise<NextResponse> {
  const apiBase = process.env.INTERNAL_API_URL?.replace(/\/$/, "");
  if (!apiBase) {
    return NextResponse.json({ error: "INTERNAL_API_URL not configured" }, { status: 503 });
  }

  const targetUrl = `${apiBase}${request.nextUrl.pathname}${request.nextUrl.search}`;
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "host" || lower === "connection" || lower === "content-length") return;
    headers.set(key, value);
  });

  const host = request.headers.get("host");
  if (host) headers.set("x-forwarded-host", host);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
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

  const backendResponse = await fetch(targetUrl, init);
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
