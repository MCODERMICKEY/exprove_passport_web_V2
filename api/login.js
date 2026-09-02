/* ══════════════════════════════════════════════════════
   POST /api/login
   Verifies the entered admin password server-side. This
   means the real password is never embedded in admin.html's
   source code (previously it was a plain JS constant that
   anyone could read via "View Source" — this fixes that).

   Body: { "password": "..." }
   Response: { ok: true } or { ok: false, error }
══════════════════════════════════════════════════════ */

const { validateAdminPassword } = require('./_kv');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    let body = req.body;
    if (!body || typeof body !== 'object') {
      body = JSON.parse(body || '{}');
    }
    const password = body.password || '';
    const valid = await validateAdminPassword(password);

    if (valid) {
      res.status(200).json({ ok: true });
    } else {
      res.status(401).json({ ok: false, error: 'Incorrect password.' });
    }
  } catch (err) {
    console.error('POST /api/login error:', err);
    res.status(500).json({ ok: false, error: 'Login failed. Please try again.' });
  }
};
