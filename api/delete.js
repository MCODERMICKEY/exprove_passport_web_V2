/* ══════════════════════════════════════════════════════
   POST /api/delete
   Removes one or more submissions from Upstash storage.
   Used by the admin dashboard's "Delete" (single submission)
   and "Delete All From This Client" buttons.

   Body: { "id": "..." } — delete one
      or { "ids": ["...", "..."] } — delete several at once
   Requires the admin password (same header as /api/submissions).
══════════════════════════════════════════════════════ */

const { getSubmissions, saveSubmissions, isConfigured, validateAdminPassword } = require('./_kv');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const supplied = req.headers['x-admin-password'] || '';
  const valid = await validateAdminPassword(supplied);
  if (!valid) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  if (!isConfigured()) {
    res.status(200).json({ ok: false, error: 'Cloud storage not connected — nothing to delete there.', removed: 0 });
    return;
  }

  try {
    let body = req.body;
    if (!body || typeof body !== 'object') {
      body = JSON.parse(body || '{}');
    }
    const ids = Array.isArray(body.ids)
      ? body.ids.map(String)
      : (body.id !== undefined ? [String(body.id)] : []);

    if (!ids.length) {
      res.status(400).json({ ok: false, error: 'No submission id(s) provided.' });
      return;
    }

    const list = await getSubmissions();
    const remaining = list.filter(rec => !ids.includes(String(rec.id)));
    const removed = list.length - remaining.length;
    await saveSubmissions(remaining);

    res.status(200).json({ ok: true, removed });
  } catch (err) {
    console.error('POST /api/delete error:', err);
    res.status(200).json({ ok: false, error: 'Could not delete submission(s).' });
  }
};
