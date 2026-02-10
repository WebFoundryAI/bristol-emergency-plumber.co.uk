export async function onRequest({ request, env }) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ message: 'Method not allowed.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id || id.trim().length === 0) {
    return new Response(JSON.stringify({ message: 'Address ID is required.' }), {
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
    const apiUrl = `https://api.getAddress.io/get/${encodeURIComponent(id.trim())}?api-key=${apiKey}`;
    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) {
      return new Response(JSON.stringify({ message: 'Could not retrieve address details.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await apiResponse.json();
    const formattedLines = (data.formatted_address || []).filter(function (line) {
      return line && line.trim();
    });
    const fullAddress = formattedLines.join(', ');

    return new Response(JSON.stringify({
      postcode: data.postcode || '',
      address: fullAddress,
      line_1: data.line_1 || '',
      line_2: data.line_2 || '',
      town_or_city: data.town_or_city || '',
      county: data.county || ''
    }), {
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
