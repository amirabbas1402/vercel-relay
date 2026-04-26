export const runtime = 'edge';

const AUTH_KEY = "5XBjc4rwezg4wEQwJGPA3nVtNpgi57Ku";  // CHANGE THIS

export default async function handler(request) {
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
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { method, url, headers, body, auth } = await request.json();
    
    const authHeader = request.headers.get('X-Auth-Key');
    if (auth !== AUTH_KEY && authHeader !== AUTH_KEY) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!url) {
      return Response.json({ error: 'Missing url' }, { status: 400 });
    }
    
    const response = await fetch(url, {
      method: method || 'GET',
      headers: headers || {},
      body: body ? Buffer.from(body, 'base64') : undefined,
    });
    
    const responseBody = await response.arrayBuffer();
    
    return Response.json({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: Buffer.from(responseBody).toString('base64'),
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 502 });
  }
}
