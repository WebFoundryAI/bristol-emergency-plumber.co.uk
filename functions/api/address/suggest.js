export async function onRequest({ request, env }) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ message: 'Method not allowed.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const postcode = url.searchParams.get('postcode');

  if (!postcode || postcode.trim().length === 0) {
    return new Response(JSON.stringify({ message: 'Postcode is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const cleaned = postcode.trim().toUpperCase();
  const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d?[A-Z]{0,2}$/;
  if (!postcodeRegex.test(cleaned)) {
    return new Response(JSON.stringify({ message: 'Please enter a valid UK postcode.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = env.GETADDRESS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ message: 'Address lookup is temporarily unavailable.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const apiUrl = `https://api.getAddress.io/autocomplete/${encodeURIComponent(cleaned)}?api-key=${apiKey}`;
    const apiResponse = await fetch(apiUrl);

    if (apiResponse.status === 404) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!apiResponse.ok) {
      return new Response(JSON.stringify({ message: 'Address lookup failed. Please try again.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await apiResponse.json();
    const suggestions = (data.suggestions || []).map(function (s) {
      return { id: s.id, address: s.address };
    });

    return new Response(JSON.stringify({ suggestions: suggestions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Address lookup is temporarily unavailable.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
