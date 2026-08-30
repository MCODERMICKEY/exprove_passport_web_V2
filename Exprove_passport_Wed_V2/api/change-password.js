/* ══════════════════════════════════════════════════════
   POST /api/change-password
   Lets the logged-in admin set a new password. Requires
   the current password for confirmation. The new password
   is stored as a SHA-256 hash in Vercel KV — never in
   plaintext, and never in this codebase.

   Body: { "currentPassword": "...", "newPassword": "..." }
   Response: { ok: true } or { ok: false, error }

   Requires Vercel KV to be connected (see SETUP_GUIDE.txt) —
   without it there's nowhere durable to save the new password.
══════════════════════════════════════════════════════ */

const { isConfigured, validateAdminPassword, hashPassword, setAdminPasswordHash } = require('./_kv');

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

  if (!isConfigured()) {
    res.status(200).json({
      ok: false,
      error: 'Connect Vercel KV first (see SETUP_GUIDE.txt) — there is nowhere to save a new password yet.'
    });
    return;
  }

  try {
    let body = req.body;
    if (!body || typeof body !== 'object') {
      body = JSON.parse(body || '{}');
    }
    const { currentPassword, newPassword } = body;

    if (!newPassword || String(newPassword).length < 6) {
      res.status(400).json({ ok: false, error: 'New password must be at least 6 characters.' });
      return;
    }

    const currentValid = await validateAdminPassword(currentPassword || '');
    if (!currentValid) {
      res.status(401).json({ ok: false, error: 'Current password is incorrect.' });
      return;
    }

    await setAdminPasswordHash(hashPassword(newPassword));
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('POST /api/change-password error:', err);
    res.status(200).json({ ok: false, error: 'Could not update password. Please try again.' });
  }
};
