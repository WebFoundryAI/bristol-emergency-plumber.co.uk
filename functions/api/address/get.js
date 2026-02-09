export async function onRequest({ request, env }) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ message: 'Address id is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.GETADDRESS_API_KEY) {
    return new Response(JSON.stringify({ message: 'Address lookup is unavailable.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const endpoint = `https://api.getAddress.io/get/${encodeURIComponent(id)}?api-key=${encodeURIComponent(env.GETADDRESS_API_KEY)}`;
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ message: 'Unable to fetch address details.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const payload = await response.json();
  const parts = [
    payload.line_1,
    payload.line_2,
    payload.line_3,
    payload.line_4,
    payload.town_or_city,
    payload.county,
    payload.postcode
  ].filter(Boolean);

  return new Response(
    JSON.stringify({
      id,
      label: parts.join(', '),
      raw: payload
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
