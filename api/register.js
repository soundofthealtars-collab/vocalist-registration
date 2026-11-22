const allowedParts = new Set(['Soprano', 'Alto', 'Tenor', 'Bass', 'Unsure']);
const allowedIdentityTypes = new Set(['national_id', 'guardian_national_id', 'passport']);

function sendJson(res, status, body) {
    res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
}

function normalizePhone(value) {
    let phone = value.replace(/[\s().-]+/g, '');
    const kenyanNumber = phone.match(/^0([17][0-9]{8})$/);
    if (kenyanNumber) phone = `+254${kenyanNumber[1]}`;
    return /^\+[1-9][0-9]{7,14}$/.test(phone) ? phone : null;
}

function sameOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return false;
    try {
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        return new URL(origin).host === host;
    } catch {
        return false;
    }
}

async function callSheet(payload) {
    const endpoint = process.env.SHEETS_WEB_APP_URL;
    const secret = process.env.SHEETS_API_SECRET;
    if (!endpoint || !secret) throw new Error('Registration service is not configured.');

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, secret })
    });
    if (!response.ok) throw new Error('Registration service is unavailable.');
    return response.json();
}

export default async function handler(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');

    if (req.method !== 'GET' && req.method !== 'POST') {
        res.setHeader('Allow', 'GET, POST');
        return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
    }

    if (req.method === 'POST') {
        if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: 'Request origin was rejected.' });
        if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
            return sendJson(res, 415, { ok: false, message: 'Expected JSON.' });
        }

        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
        const phoneInput = typeof body.whatsapp_number === 'string' ? body.whatsapp_number.trim() : '';
        const phone = normalizePhone(phoneInput);
        const identityType = typeof body.identity_type === 'string' ? body.identity_type : '';
        const identityNumber = typeof body.identity_number === 'string' ? body.identity_number.replace(/[\s-]+/g, '') : '';
        const vocalPart = typeof body.vocal_part === 'string' ? body.vocal_part : '';
        const churchMinistry = typeof body.church_ministry === 'string' ? body.church_ministry.trim() : '';

        if (!fullName || fullName.length > 160 || churchMinistry.length > 200 || !allowedParts.has(vocalPart) || body.committed !== 'on') {
            return sendJson(res, 400, { ok: false, message: 'Check your details and confirm your rehearsal commitment.' });
        }
        if (!phone) return sendJson(res, 400, { ok: false, message: 'Use an international number with + and country code, or a Kenyan mobile number.' });
        if (!allowedIdentityTypes.has(identityType)) {
            return sendJson(res, 400, { ok: false, message: 'Select a valid identity document type.' });
        }
        const validIdentityNumber = identityType === 'passport'
            ? /^[A-Za-z0-9]{5,20}$/.test(identityNumber)
            : /^[0-9]{7,10}$/.test(identityNumber);
        if (!validIdentityNumber) return sendJson(res, 400, { ok: false, message: identityType === 'passport' ? 'Enter a valid passport number using 5 to 20 letters or numbers.' : 'Enter a valid National ID number using 7 to 10 digits.' });

        try {
            const result = await callSheet({
                action: 'register',
                registration: { fullName, phone, identityType, identityNumber: identityNumber.toUpperCase(), vocalPart, churchMinistry, committed: true }
            });
            const status = result.ok ? 200 : result.code === 'duplicate' ? 409 : result.code === 'full' ? 409 : 503;
            return sendJson(res, status, {
                ...result,
                whatsappInvite: process.env.WHATSAPP_INVITE || ''
            });
        } catch {
            return sendJson(res, 503, { ok: false, message: 'Registration is temporarily unavailable. Please try again later.' });
        }
    }

    try {
        const result = await callSheet({ action: 'availability' });
        return sendJson(res, result.ok ? 200 : 503, result);
    } catch {
        return sendJson(res, 503, { ok: false, message: 'Registration is temporarily unavailable.' });
    }
}