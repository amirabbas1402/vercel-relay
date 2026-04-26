export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const AUTH_KEY = process.env.AUTH_KEY || "CHANGE_ME_TO_A_RANDOM_SECRET";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { method, url, headers = {}, auth } = body;
    
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
      body: body.body ? Buffer.from(body.body, "base64") : undefined,
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
    console.error("Relay error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ 
    status: "ok", 
    message: "Vercel relay is running",
    endpoint: "/api/relay"
  }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Auth-Key",
    },
  });
}
