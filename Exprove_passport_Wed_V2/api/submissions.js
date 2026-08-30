/* ══════════════════════════════════════════════════════
   GET /api/submissions
   Returns every stored submission. Protected by the same
   admin password used to log into admin.html, sent as
   either the "x-admin-password" header or a ?password=
   query string.

   This is what makes the Admin Dashboard work from ANY
   device once deployed on Vercel — it no longer depends
   on the browser's localStorage.
══════════════════════════════════════════════════════ */

const { getSubmissions, isConfigured, validateAdminPassword } = require('./_kv');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const supplied = req.headers['x-admin-password'] || (req.query && req.query.password) || '';
  const valid = await validateAdminPassword(supplied);

  if (!valid) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  if (!isConfigured()) {
    res.status(200).json({ ok: false, configured: false, submissions: [] });
    return;
  }

  try {
    const list = await getSubmissions();
    res.status(200).json({ ok: true, configured: true, submissions: list });
  } catch (err) {
    console.error('GET /api/submissions error:', err);
    res.status(200).json({ ok: false, configured: true, submissions: [], error: 'Could not load submissions.' });
  }
};
