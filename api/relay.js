export const config = { runtime: "edge" };

const RELAY_SECRET = process.env.RELAY_SECRET || "792401002";

const STRIP_REQ_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
  "x-relay-secret",
  "x-relay-target",   // never leak our internal headers upstream
]);

const STRIP_RES_HEADERS = new Set([
  "transfer-encoding",
  "connection",
  "keep-alive",
  "trailer",
  "upgrade",
]);

export default async function handler(req) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  if (RELAY_SECRET) {
    const provided = req.headers.get("x-relay-secret") || "";
    if (provided !== RELAY_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // ── 2. Resolve target ────────────────────────────────────────────────────
  // Dynamic mode: client sends the real destination in x-relay-target header
  // e.g.  x-relay-target: https://api.example.com
  const targetBase = (req.headers.get("x-relay-target") || "").replace(/\/$/, "");

  if (!targetBase) {
    return new Response(
      "Bad Request: x-relay-target header is required in dynamic mode",
      { status: 400 }
    );
  }

  // Basic SSRF guard — only allow http/https targets
  if (!/^https?:\/\//i.test(targetBase)) {
    return new Response("Bad Request: x-relay-target must be http or https", {
      status: 400,
    });
  }

  try {
    // ── 3. Build full target URL (preserve path + query) ──────────────────
    const parsedReq = new URL(req.url);
    const targetUrl = targetBase + parsedReq.pathname + parsedReq.search;

    // ── 4. Clean + forward request headers ───────────────────────────────
    const outHeaders = new Headers();
    let clientIp = null;

    for (const [k, v] of req.headers) {
      const lower = k.toLowerCase();
      if (STRIP_REQ_HEADERS.has(lower)) continue;
      if (lower.startsWith("x-vercel-")) continue;
      if (lower === "x-real-ip")       { clientIp = v; continue; }
      if (lower === "x-forwarded-for") { if (!clientIp) clientIp = v; continue; }
      outHeaders.set(k, v);
    }
    if (clientIp) outHeaders.set("x-forwarded-for", clientIp);

    // Set correct Host for the target
    outHeaders.set("host", new URL(targetBase).host);

    // ── 5. Forward ────────────────────────────────────────────────────────
    const method  = req.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    const upstream = await fetch(targetUrl, {
      method,
      headers: outHeaders,
      body:    hasBody ? req.body : undefined,
      duplex:  "half",
      redirect: "manual",
    });

    // ── 6. Clean response headers ─────────────────────────────────────────
    const resHeaders = new Headers();
    for (const [k, v] of upstream.headers) {
      if (STRIP_RES_HEADERS.has(k.toLowerCase())) continue;
      resHeaders.set(k, v);
    }
    resHeaders.set("access-control-allow-origin", "*");

    return new Response(upstream.body, {
      status:     upstream.status,
      statusText: upstream.statusText,
      headers:    resHeaders,
    });

  } catch (err) {
    console.error("relay error:", err);
    return new Response("Bad Gateway: " + err.message, { status: 502 });
  }
}
