/* ══════════════════════════════════════════════════════
   POST /api/submit
   Receives one form submission (inquiry or paid
   application) and appends it to Vercel KV so it can be
   viewed later in admin.html from any device/browser.

   This endpoint is called automatically by script.js
   after every form is submitted. It never blocks the
   user — if KV isn't set up yet, it just responds ok:false
   and the site keeps working exactly as before
   (localStorage + email still happen normally).
══════════════════════════════════════════════════════ */

const { getSubmissions, saveSubmissions, isConfigured } = require('./_kv');

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

  if (!isConfigured()) {
    // Storage not connected yet — don't fail the customer's submission flow.
    res.status(200).json({ ok: false, error: 'Storage not connected yet. See SETUP_GUIDE.txt.' });
    return;
  }

  try {
    let record = req.body;
    if (!record || typeof record !== 'object') {
      record = JSON.parse(req.body || '{}');
    }
    if (!record.id) record.id = Date.now();
    record.receivedAt = new Date().toISOString();

    const list = await getSubmissions();
    list.push(record);
    await saveSubmissions(list);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('POST /api/submit error:', err);
    res.status(200).json({ ok: false, error: 'Could not save submission.' });
  }
};
