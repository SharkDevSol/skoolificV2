/**
 * IQRA Parent — FCM push notification service (backend side).
 * Registers guardian devices and pushes notifications with high-priority
 * notification channel for Android and iOS.
 */
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

let FCM_PROJECT_ID = process.env.FCM_PROJECT_ID || 'iqra-parent';
let FCM_CLIENT_EMAIL = process.env.FCM_CLIENT_EMAIL || '';
let FCM_PRIVATE_KEY = (process.env.FCM_PRIVATE_KEY || '').replace(/\\n/g, '\n');

// Robust fallback to firebase-service-account.json if env vars are missing
if (!FCM_CLIENT_EMAIL || !FCM_PRIVATE_KEY) {
  try {
    const saPath = path.join(__dirname, '../firebase-service-account.json');
    if (fs.existsSync(saPath)) {
      const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
      FCM_PROJECT_ID = sa.project_id || FCM_PROJECT_ID;
      FCM_CLIENT_EMAIL = sa.client_email || FCM_CLIENT_EMAIL;
      FCM_PRIVATE_KEY = sa.private_key || FCM_PRIVATE_KEY;
    }
  } catch (_) {}
}

let cachedAccessToken = null;
let cachedTokenExpiry = 0;

// ---- Get Google OAuth access token for FCM v1 ----
async function getAccessToken() {
  // If not yet loaded, try loading from service account again
  if (!FCM_CLIENT_EMAIL || !FCM_PRIVATE_KEY) {
    try {
      const saPath = path.join(__dirname, '../firebase-service-account.json');
      if (fs.existsSync(saPath)) {
        const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
        FCM_PROJECT_ID = sa.project_id || FCM_PROJECT_ID;
        FCM_CLIENT_EMAIL = sa.client_email || FCM_CLIENT_EMAIL;
        FCM_PRIVATE_KEY = sa.private_key || FCM_PRIVATE_KEY;
      }
    } catch (_) {}
  }

  if (!FCM_CLIENT_EMAIL || !FCM_PRIVATE_KEY) {
    console.error('❌ FCM credentials missing (both env and firebase-service-account.json)');
    return null;
  }
  if (cachedAccessToken && Date.now() < cachedTokenExpiry) return cachedAccessToken;
  try {
    const jwt = require('jsonwebtoken');
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      {
        iss: FCM_CLIENT_EMAIL,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      },
      FCM_PRIVATE_KEY,
      { algorithm: 'RS256' }
    );
    const res = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token,
      },
    });
    cachedAccessToken = res.data.access_token;
    cachedTokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
    return cachedAccessToken;
  } catch (err) {
    console.error('❌ FCM token error:', err.message);
    return null;
  }
}

// ---- multi-project helpers -------------------------------------------------
// Different app builds on phones are registered in different Firebase projects
// (e.g. old IQRA parent builds -> iqra-parent, newer builds -> iqra-staff1).
// Sending a token through the wrong project fails with "SenderId mismatch", so
// we try every project we have credentials for, per token.
const projectCredCache = new Map();
const PROJECT_FILES = [
  'firebase-service-account.json',
  'firebase-service-account-parent.json',
  'firebase-service-account-staff.json',
  'firebase-service-account-iqra-parent.json',
];

function loadProjectCreds() {
  const list = [];
  const seen = new Set();
  const add = (c) => {
    if (!c || !c.client_email || !c.private_key || !c.project_id) return;
    const k = c.project_id + '|' + c.client_email;
    if (seen.has(k)) return;
    seen.add(k);
    list.push(c);
  };
  if (FCM_CLIENT_EMAIL && FCM_PRIVATE_KEY) {
    add({ project_id: FCM_PROJECT_ID, client_email: FCM_CLIENT_EMAIL, private_key: FCM_PRIVATE_KEY });
  }

  // Guardian notifications must go through the PARENT app's Firebase project
  // only. The staff app registers its own tokens in the staff project, and
  // sending guardian pushes there makes notifications appear inside "IQRA/Bilal
  // Staff" instead of the parent app. So the file-based projects are used ONLY
  // as a fallback when the env primary is missing.
  if (!list.length) {
    for (const f of PROJECT_FILES) {
      try {
        const p = path.join(__dirname, '..', f);
        if (fs.existsSync(p)) add(JSON.parse(fs.readFileSync(p, 'utf8')));
      } catch (_) {}
    }
  }
  return list;
}

async function accessTokenFor(creds) {
  const key = creds.project_id + '|' + creds.client_email;
  const hit = projectCredCache.get(key);
  if (hit && Date.now() < hit.expiry) return hit.token;
  try {
    const jwtSign = require('jsonwebtoken');
    const now = Math.floor(Date.now() / 1000);
    const assertion = jwtSign.sign({
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }, creds.private_key, { algorithm: 'RS256' });
    const r = await axios.post(
      'https://oauth2.googleapis.com/token',
      'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + encodeURIComponent(assertion),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const token = r.data && r.data.access_token;
    if (!token) return null;
    projectCredCache.set(key, { token, expiry: Date.now() + ((r.data.expires_in || 3600) - 60) * 1000 });
    return token;
  } catch (e) {
    console.error('FCM token error for ' + creds.project_id + ':', e.message);
    return null;
  }
}

async function sendWithProject(creds, deviceToken, title, body, data) {
  const accessToken = await accessTokenFor(creds);
  if (!accessToken) return { ok: false, status: 'NO_TOKEN' };
  try {
    await axios.post(
      'https://fcm.googleapis.com/v1/projects/' + creds.project_id + '/messages:send',
      {
        message: {
          token: deviceToken,
          notification: { title, body },
          data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
          android: { priority: 'high' },
        },
      },
      { headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' } }
    );
    return { ok: true };
  } catch (err) {
    const e = (err.response && err.response.data && err.response.data.error) || {};
    return { ok: false, status: e.status, message: e.message, code: e.code };
  }
}

// ---- Send push to one guardian username's devices ----
async function pushToGuardian(guardianUsername, title, body, data = {}) {
  try {
    const { rows } = await db.query(
      `SELECT fcm_token FROM guardian_devices
       WHERE guardian_username = $1 AND active = true`,
      [guardianUsername]
    );
    if (!rows.length) return { sent: 0 };

    const projects = loadProjectCreds();
    if (!projects.length) {
      console.log('FCM not configured (no credentials) — skip push');
      return { sent: 0, skipped: true };
    }

    let sent = 0;
    for (const row of rows) {
      let delivered = false;
      let last = null;
      for (const creds of projects) {
        const res = await sendWithProject(creds, row.fcm_token, title, body, data);
        if (res.ok) { delivered = true; break; }
        last = res;
        // Only continue with the next project when this one does not own the token.
        if (res.status !== 'PERMISSION_DENIED' && res.status !== 'NOT_FOUND') break;
      }
      if (delivered) { sent++; continue; }
      if (last) {
        console.warn('[push] delivery failed for ' + guardianUsername + ' token ' + String(row.fcm_token).slice(0, 18) + '… -> ' + last.status + ' :: ' + (last.message || '') + ' (tried: ' + projects.map(function (p) { return p.project_id; }).join(',') + ')');
      }
      if (last && (last.status === 'NOT_FOUND' || last.status === 'INVALID_ARGUMENT')) {
        try {
          await db.query(`UPDATE guardian_devices SET active = false WHERE fcm_token = $1`, [row.fcm_token]);
        } catch (_) {}
      }
    }
    return { sent };
  } catch (err) {
    console.error('pushToGuardian error:', err.message);
    return { sent: 0 };
  }
}

// ---- Auto-create table on load ----
async function ensureTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS guardian_devices (
        id SERIAL PRIMARY KEY,
        guardian_username VARCHAR(100) NOT NULL,
        fcm_token TEXT NOT NULL,
        platform VARCHAR(20) DEFAULT 'android',
        language VARCHAR(10) DEFAULT 'en',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(guardian_username, fcm_token)
      );
    `);
    console.log('✅ guardian_devices table ready');
  } catch (err) {
    console.error('guardian_devices table check failed:', err.message);
  }
}
ensureTable();

// ---- Routes ----

/**
 * POST /api/guardians/register-device
 * Body: { username, fcm_token, platform, language }
 */
router.post('/register-device', async (req, res) => {
  const { username, fcm_token, platform, language } = req.body || {};
  if (!username || !fcm_token) {
    return res.status(400).json({ error: 'username and fcm_token required' });
  }
  try {
    await db.query(
      `INSERT INTO guardian_devices (guardian_username, fcm_token, platform, language)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (guardian_username, fcm_token)
       DO UPDATE SET active = true, language = $4, updated_at = NOW()`,
      [username, fcm_token, platform || 'android', language || 'en']
    );
    console.log(`✅ Registered guardian device token for: ${username}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in /register-device:', err);
    res.status(500).json({ error: 'Failed to register device', details: err.message });
  }
});

/**
 * POST /api/guardians/push
 * Body: { username, title, body, data }
 */
router.post('/push', async (req, res) => {
  const { username, title, body, data } = req.body || {};
  if (!username || !title || !body) {
    return res.status(400).json({ error: 'username, title, body required' });
  }
  const result = await pushToGuardian(username, title, body, data || {});
  res.json({ success: true, ...result });
});

// Broadcast app update to all registered devices
router.post('/announce-update', async (req, res) => {
  const { version, notes } = req.body || {};
  if (!version) {
    return res.status(400).json({ error: 'version required' });
  }
  try {
    let totalSent = 0;
    let totalDevices = 0;

    for (const branchDb of ['iqrab1', 'iqrab2', 'iqrab3', 'iqrab4', 'iqrab5']) {
      try {
        const rows = await db.query(
          `SELECT guardian_username, language FROM guardian_devices WHERE active = true`
        );
        for (const row of rows.rows) {
          totalDevices++;
          const lang = (row.language || 'en').toLowerCase();
          const title = lang === 'so' ? '\ud83d\udce1 Cusboonaysiin cusub'
                      : lang === 'am' ? '\ud83d\udce1 \u12ad\u12a8\u134b\u120b \u12da\u121b\u1294'
                      : lang === 'ar' ? '\ud83d\udce1 \u062a\u062d\u062f\u064a\u062b \u062c\u062f\u064a\u062f'
                      : '\ud83d\udce1 New Version Available';
          const body = lang === 'so' ? `Version ${version} diyaar. Taabo si aad u cusboonaysiiso.`
                     : lang === 'am' ? `\u1235\u12aa\u1295 ${version} \u12f0\u120d\u134b\u12d0\u120d\u1d30 \u134a\u12e8\u1208`
                     : lang === 'ar' ? `\u0627\u0644\u0625\u0635\u062f\u0627\u0631 ${version} \u0645\u062a\u0627\u062d. \u0627\u0636\u063a\u0637 \u0644\u0644\u062a\u062d\u062f\u064a\u062b.`
                     : `Version ${version} is ready. Tap to update.`;
          try {
            const result = await pushToGuardian(row.guardian_username, title, body, {
              type: 'update', version: String(version), notes: String(notes || '')
            });
            totalSent += (result && result.sent) || 0;
          } catch (_) {}
        }
      } catch (dbErr) { /* branch may not have the table */ }
    }
    res.json({ success: true, devices: totalDevices, sent: totalSent, version });
  } catch (err) {
    res.status(500).json({ error: 'announce-update failed', details: err.message });
  }
});

module.exports = router;
module.exports.pushToGuardian = pushToGuardian;
