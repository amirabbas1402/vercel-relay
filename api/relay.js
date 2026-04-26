const AUTH_KEY = "5XBjc4rwezg4wEQwJGPA3nVtNpgi57Ku";  // Change this

export default async function handler(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const { method, url, headers, body, auth } = await request.json();

    // Check authentication
    if (auth !== AUTH_KEY) {
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

    // Make the request
    const response = await fetch(url, {
      method: method || 'GET',
      headers: headers || {},
      body: body ? Buffer.from(body, 'base64') : undefined,
    });

    const responseBody = await response.arrayBuffer();
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Return response
    return new Response(JSON.stringify({
      status: response.status,
      headers: responseHeaders,
      body: Buffer.from(responseBody).toString('base64'),
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
