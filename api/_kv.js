/* ══════════════════════════════════════════════════════
   _kv.js — tiny helper around a Redis-compatible REST store
   (Upstash for Redis, installed from the Vercel Marketplace)
   Used by /api/submit and /api/submissions so the Admin
   Dashboard can be read from ANY device once deployed.

   SETUP (one-time, ~2 minutes):
     Vercel no longer offers "KV" as its own product — it's
     now provided via the Marketplace as "Upstash for Redis".
     1. On vercel.com, open your project → "Storage" tab
     2. Click "Create Database" (or "Browse Marketplace")
     3. Search for and select "Upstash" → "Upstash for Redis"
     4. Create a database, then click "Connect Project" and
        connect it to this project
     5. Redeploy (Vercel will prompt you, or just click
        "Redeploy" on your latest deployment)
     Vercel/Upstash automatically add the environment variables
     this file needs (KV_REST_API_URL / KV_REST_API_TOKEN, or
     UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN — this
     file checks both) — no code changes required.
══════════════════════════════════════════════════════ */

const KV_URL   = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
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
