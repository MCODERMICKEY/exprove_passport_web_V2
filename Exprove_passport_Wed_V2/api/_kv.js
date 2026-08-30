/* ══════════════════════════════════════════════════════
   _kv.js — tiny helper around Vercel KV (Upstash Redis)
   Used by /api/submit and /api/submissions so the Admin
   Dashboard can be read from ANY device once deployed.

   SETUP (one-time, ~2 minutes):
     1. On vercel.com, open your project
     2. Go to the "Storage" tab → Create Database → KV
     3. Connect it to this project
     Vercel automatically adds the environment variables
     this file needs (KV_REST_API_URL / KV_REST_API_TOKEN) —
     no code changes required.
══════════════════════════════════════════════════════ */

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const crypto   = require('crypto');

const STORE_KEY    = 'exprove:submissions';
const PASSWORD_KEY = 'exprove:admin_password_hash';

function isConfigured() {
  return Boolean(KV_URL && KV_TOKEN);
}

async function kvCommand(command) {
  if (!isConfigured()) {
    throw new Error('KV_NOT_CONFIGURED');
  }
  const response = await fetch(KV_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  if (!response.ok) {
    throw new Error('KV_REQUEST_FAILED_' + response.status);
  }
  const json = await response.json();
  return json.result;
}

async function getSubmissions() {
  const raw = await kvCommand(['GET', STORE_KEY]);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveSubmissions(list) {
  // Keep the store from growing without bound
  const trimmed = list.slice(-3000);
  await kvCommand(['SET', STORE_KEY, JSON.stringify(trimmed)]);
  return trimmed;
}

/* ══════════════════════════════════════════════════════
   Admin password — stored as a SHA-256 hash in KV, never
   in plaintext. Until the admin changes it for the first
   time, it falls back to the ADMIN_PASSWORD environment
   variable (or 'Exprove2026!' if that isn't set either).
══════════════════════════════════════════════════════ */
function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function defaultPassword() {
  return process.env.ADMIN_PASSWORD || 'Exprove2026!';
}

async function getAdminPasswordHash() {
  return await kvCommand(['GET', PASSWORD_KEY]);
}

async function setAdminPasswordHash(hash) {
  await kvCommand(['SET', PASSWORD_KEY, hash]);
}

/* Validates a candidate password against whatever is currently
   the "real" admin password (custom hash if one has been set,
   otherwise the default). Works even if KV isn't configured yet
   (falls back to the default password only, so change-password
   won't be available until KV is connected). */
async function validateAdminPassword(candidate) {
  if (!isConfigured()) {
    return candidate === defaultPassword();
  }
  try {
    const storedHash = await getAdminPasswordHash();
    if (storedHash) {
      return hashPassword(candidate) === storedHash;
    }
    return candidate === defaultPassword();
  } catch {
    return candidate === defaultPassword();
  }
}

module.exports = {
  getSubmissions, saveSubmissions, isConfigured,
  hashPassword, defaultPassword,
  getAdminPasswordHash, setAdminPasswordHash, validateAdminPassword
};
