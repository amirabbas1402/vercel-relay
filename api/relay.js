export const runtime = 'edge';

const AUTH_KEY = process.env.AUTH_KEY || "CHANGE_ME_TO_A_RANDOM_SECRET";

export default async function handler(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Key',
      },
    });
  }

  // Only accept POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { method, url, headers = {}, auth } = body;

    // Authentication
    const authHeader = request.headers.get('X-Auth-Key');
    if (auth !== AUTH_KEY && authHeader !== AUTH_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!url) {
      return new Response(JSON.stringify({ error: 'Missing url' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Forward the request
    const response = await fetch(url, {
      method: method || 'GET',
      headers: headers,
      body: body.body ? Buffer.from(body.body, 'base64') : undefined,
    });

    const responseBody = await response.arrayBuffer();
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return new Response(JSON.stringify({
      status: response.status,
      headers: responseHeaders,
      body: Buffer.from(responseBody).toString('base64'),
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Relay error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
