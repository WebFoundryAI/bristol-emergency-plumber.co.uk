const normalizePostcode = (value) => value.replace(/\s+/g, '').toUpperCase();

export async function onRequest({ request, env }) {
  const { searchParams } = new URL(request.url);
  const postcodeRaw = searchParams.get('postcode') || '';
  const postcode = normalizePostcode(postcodeRaw);

  if (!postcode) {
    return new Response(JSON.stringify({ message: 'Postcode is required.' }), {
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

  const endpoint = `https://api.getAddress.io/autocomplete/${encodeURIComponent(postcode)}?api-key=${encodeURIComponent(env.GETADDRESS_API_KEY)}&all=true`;

  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ message: 'Unable to fetch address suggestions.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const payload = await response.json();
  const suggestions = (payload.suggestions || []).map((item) => ({
    id: item.id,
    label: item.address
  }));

  return new Response(JSON.stringify({ addresses: suggestions }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
