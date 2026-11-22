const allowedParts = new Set(['Soprano', 'Alto', 'Tenor', 'Bass', 'Unsure']);
const allowedIdentityTypes = new Set(['national_id', 'guardian_national_id', 'passport']);

function jsonResponse(body, status, origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Vary'] = 'Origin';
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function normalizePhone(value) {
  let phone = value.replace(/[\s().-]+/g, '');
  const kenyanNumber = phone.match(/^0([17][0-9]{8})$/);
  if (kenyanNumber) phone = `+254${kenyanNumber[1]}`;
  return /^\+[1-9][0-9]{7,14}$/.test(phone) ? phone : null;
}

function validate(body) {
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const phone = normalizePhone(typeof body.whatsapp_number === 'string' ? body.whatsapp_number : '');
  const identityType = typeof body.identity_type === 'string' ? body.identity_type : '';
  const identityNumber = typeof body.identity_number === 'string' ? body.identity_number.replace(/[\s-]+/g, '').toUpperCase() : '';
  const vocalPart = typeof body.vocal_part === 'string' ? body.vocal_part : '';
  const churchMinistry = typeof body.church_ministry === 'string' ? body.church_ministry.trim() : '';

  if (!fullName || fullName.length > 160 || churchMinistry.length > 200 || !allowedParts.has(vocalPart) || body.committed !== 'on') {
    return { error: 'Check your details and confirm your rehearsal commitment.' };
  }
  if (!phone) return { error: 'Use an international number with + and country code, or a Kenyan mobile number.' };
  if (!allowedIdentityTypes.has(identityType)) return { error: 'Select a valid identity document type.' };
  const validIdentityNumber = identityType === 'passport'
    ? /^[A-Z0-9]{5,20}$/.test(identityNumber)
    : /^[0-9]{7,10}$/.test(identityNumber);
  if (!validIdentityNumber) {
    return { error: identityType === 'passport'
      ? 'Enter a valid passport number using 5 to 20 letters or numbers.'
      : 'Enter a valid National ID number using 7 to 10 digits.' };
  }

  return {
    registration: {
      fullName,
      phone,
      identityType,
      identityNumber,
      vocalPart,
      churchMinistry,
      committed: true,
    },
  };
}

async function callSheets(payload, env) {
  const response = await fetch(env.SHEETS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, secret: env.SHEETS_API_SECRET }),
    redirect: 'follow',
  });
  if (!response.ok) throw new Error('Sheets backend request failed.');
  return response.json();
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);
    const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : null;

    if (allowedOrigins.length === 0 || !env.SHEETS_WEB_APP_URL || !env.SHEETS_API_SECRET) {
      return jsonResponse({ ok: false, message: 'Registration service is not configured.' }, 503, corsOrigin);
    }
    if (origin && !corsOrigin) {
      return jsonResponse({ ok: false, message: 'Request origin was rejected.' }, 403);
    }
    if (request.method === 'OPTIONS') {
      return corsOrigin
        ? new Response(null, { status: 204, headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin',
        } })
        : jsonResponse({ ok: false, message: 'Request origin was rejected.' }, 403);
    }
    if (request.method !== 'GET' && request.method !== 'POST') {
      return jsonResponse({ ok: false, message: 'Method not allowed.' }, 405, corsOrigin);
    }
    if (!corsOrigin) return jsonResponse({ ok: false, message: 'Request origin was rejected.' }, 403);

    const url = new URL(request.url);
    if (url.pathname !== '/api/register') return jsonResponse({ ok: false, message: 'Not found.' }, 404, corsOrigin);

    try {
      let payload = { action: 'availability' };
      if (request.method === 'POST') {
        if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
          return jsonResponse({ ok: false, message: 'Expected JSON.' }, 415, corsOrigin);
        }
        const text = await request.text();
        if (text.length > 10000) return jsonResponse({ ok: false, message: 'Request is too large.' }, 413, corsOrigin);
        let body;
        try {
          body = JSON.parse(text);
        } catch {
          return jsonResponse({ ok: false, message: 'Invalid request.' }, 400, corsOrigin);
        }
        const result = validate(body && typeof body === 'object' ? body : {});
        if (result.error) return jsonResponse({ ok: false, message: result.error }, 400, corsOrigin);
        payload = { action: 'register', registration: result.registration };
      }

      const result = await callSheets(payload, env);
      if (request.method === 'GET') return jsonResponse(result, result.ok ? 200 : 503, corsOrigin);

      const status = result.ok ? 200 : result.code === 'duplicate' || result.code === 'full' ? 409 : 503;
      return jsonResponse({ ...result, whatsappInvite: env.WHATSAPP_INVITE || '' }, status, corsOrigin);
    } catch {
      return jsonResponse({ ok: false, message: 'Registration is temporarily unavailable. Please try again later.' }, 503, corsOrigin);
    }
  },
};