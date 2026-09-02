/* ══════════════════════════════════════════════════════
   POST /api/upload
   Receives a base64-encoded file (photo, Ghana Card, or
   Birth Certificate) from a form and stores it in Vercel
   Blob storage, returning a public URL. That URL is saved
   into a hidden field on the form and travels along with
   the rest of the submission, so the admin can open the
   actual file from the dashboard.

   Requires Vercel Blob to be connected (see SETUP_GUIDE.txt)
   — without it, this responds with ok:false and the form
   still submits normally; applicants just fall back to
   sending the file via WhatsApp/email as before.
══════════════════════════════════════════════════════ */

const { put } = require('@vercel/blob');

const MAX_BYTES = 3.5 * 1024 * 1024; // a little above the 3MB client-side limit, as a safety margin

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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(200).json({ ok: false, error: 'File storage not connected yet.' });
    return;
  }

  try {
    let body = req.body;
    if (!body || typeof body !== 'object') {
      body = JSON.parse(body || '{}');
    }
    const { filename, contentType, dataBase64 } = body;

    if (!filename || !dataBase64) {
      res.status(400).json({ ok: false, error: 'Missing file data.' });
      return;
    }

    const buffer = Buffer.from(dataBase64, 'base64');
    if (buffer.length > MAX_BYTES) {
      res.status(400).json({ ok: false, error: 'File too large.' });
      return;
    }

    const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

    const blob = await put(key, buffer, {
      access: 'public',
      contentType: contentType || 'application/octet-stream',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false
    });

    res.status(200).json({ ok: true, url: blob.url });
  } catch (err) {
    console.error('POST /api/upload error:', err);
    res.status(200).json({ ok: false, error: 'Upload failed. Please try again.' });
  }
};
