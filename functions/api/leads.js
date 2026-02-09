const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

const hashIp = async (ip) => {
  if (!ip) return null;
  const data = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const checkRateLimit = (ipHash) => {
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
};

const verifyTurnstile = async (token, secret) => {
  if (!token || !secret) return { success: false, skipped: true };

  const body = new URLSearchParams({
    secret,
    response: token
  });

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body
  });

  if (!response.ok) {
    return { success: false, skipped: false };
  }

  const payload = await response.json();
  return { success: Boolean(payload.success), skipped: false };
};

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Invalid JSON payload.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const requiredFields = ['name', 'phone', 'email', 'postcode', 'address_label', 'service', 'source_path'];
  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length > 0) {
    return new Response(JSON.stringify({ message: 'Missing required fields.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (payload.service === 'Other' && !payload.other_service) {
    return new Response(JSON.stringify({ message: 'Other service is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (payload.website) {
    return new Response(JSON.stringify({ message: 'Submission rejected.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '';
  const ipHash = await hashIp(ip);

  if (checkRateLimit(ipHash)) {
    return new Response(JSON.stringify({ message: 'Too many submissions. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const turnstileCheck = await verifyTurnstile(payload.turnstile_token, env.TURNSTILE_SECRET_KEY);
  if (env.TURNSTILE_SECRET_KEY && !turnstileCheck.success) {
    return new Response(JSON.stringify({ message: 'Turnstile verification failed.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const turnstileVerified = turnstileCheck.success ? 1 : 0;

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const stmt = env.DB.prepare(
    `INSERT INTO leads (
      id,
      created_at,
      name,
      phone,
      email,
      postcode,
      address_label,
      address_id,
      address_json,
      service,
      other_service,
      notes,
      source_path,
      referrer,
      ip_hash,
      user_agent,
      turnstile_verified
    ) VALUES (
      ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17
    )`
  ).bind(
    id,
    createdAt,
    payload.name,
    payload.phone,
    payload.email,
    payload.postcode,
    payload.address_label,
    payload.address_id || null,
    payload.address_json || null,
    payload.service,
    payload.other_service || null,
    payload.notes || null,
    payload.source_path,
    payload.referrer || null,
    ipHash,
    request.headers.get('user-agent') || null,
    turnstileVerified
  );

  try {
    await stmt.run();
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Unable to save lead.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}
