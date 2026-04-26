// No export const runtime needed - Vercel handles this via vercel.json

export default async function handler(request) {
  // Handle CORS
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

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { method, url, headers = {}, auth } = body;

    // Get auth from header or body
    const authHeader = request.headers.get('X-Auth-Key');
    const AUTH_KEY = process.env.AUTH_KEY || "5XBjc4rwezg4wEQwJGPA3nVtNpgi57Ku";
    
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
    const fetchOptions = {
      method: method || 'GET',
      headers: headers,
    };

    // Handle body
    if (body.body) {
      fetchOptions.body = Buffer.from(body.body, 'base64');
    }

    const response = await fetch(url, fetchOptions);
    const responseBody = await response.arrayBuffer();
    
    // Convert headers to object
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

// Also handle GET for testing
export async function GET() {
  return new Response(JSON.stringify({ 
    status: 'ok', 
    message: 'Vercel relay is running. Use POST requests to /api/relay' 
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
