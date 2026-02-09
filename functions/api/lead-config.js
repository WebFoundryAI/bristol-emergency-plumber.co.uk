export async function onRequest({ env }) {
  return new Response(
    JSON.stringify({
      turnstileSiteKey: env.TURNSTILE_SITE_KEY || null
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
