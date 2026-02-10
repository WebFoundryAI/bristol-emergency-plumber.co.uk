const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

async function hashIp(ip) {
  if (!ip) return null;
  const data = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function checkRateLimit(ipHash) {
  if (!ipHash) return false;
  const now = Date.now();
  const entry = rateLimitMap.get(ipHash);
  if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ipHash, { count: 1, timestamp: now });
    return false;
  }
  entry.count += 1;
  rateLimitMap.set(ipHash, entry);
  return entry.count > RATE_LIMIT_MAX;
}

export async function onRequest({ request, env }) {
  if (request.method === 'GET') {
    return handleGet(env);
  }
  if (request.method === 'POST') {
    return handlePost(request, env);
  }
  return new Response(JSON.stringify({ message: 'Method not allowed.' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleGet(env) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM leads ORDER BY created_at DESC'
    ).all();
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Unable to fetch leads.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handlePost(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Invalid JSON payload.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Honeypot check
  if (payload.website) {
    return new Response(JSON.stringify({ message: 'Submission rejected.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Required fields
  const requiredFields = ['name', 'email', 'phone'];
  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length > 0) {
    return new Response(JSON.stringify({ message: 'Please fill in all required fields.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Rate limiting
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '';
  const ipHash = await hashIp(ip);

  if (checkRateLimit(ipHash)) {
    return new Response(JSON.stringify({ message: 'Too many submissions. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const id = crypto.randomUUID();

  try {
    await env.DB.prepare(
      `INSERT INTO leads (id, name, email, phone, service, message, postcode, address, source_page, ip_hash, user_agent)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
    ).bind(
      id,
      payload.name,
      payload.email,
      payload.phone,
      payload.service || null,
      payload.message || null,
      payload.postcode || null,
      payload.address || null,
      payload.source_page || null,
      ipHash,
      request.headers.get('user-agent') || null
    ).run();
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Unable to save your request. Please try calling us.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}
