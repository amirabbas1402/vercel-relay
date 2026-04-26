export const runtime = 'edge';

const AUTH_KEY = process.env.AUTH_KEY || "CHANGE_ME_TO_A_RANDOM_SECRET";

export async function POST(request: Request) {
  try {
    const { method, url, headers = {}, body, auth } = await request.json();
    
    // Check authentication
    if (auth !== AUTH_KEY && request.headers.get("X-Auth-Key") !== AUTH_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Forward the request
    const response = await fetch(url, {
      method: method || "GET",
      headers: headers,
      body: body ? Buffer.from(body, "base64") : undefined,
    });
    
    const responseBody = await response.arrayBuffer();
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      responseHeaders[k] = v;
    });
    
    return new Response(JSON.stringify({
      status: response.status,
      headers: responseHeaders,
      body: Buffer.from(responseBody).toString("base64"),
    }), {
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ status: "ok", message: "Relay running" }), {
    headers: { "Content-Type": "application/json" }
  });
}
