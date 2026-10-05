'use strict';

const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname)));

const PORT = Number(process.env.PORT || 3000);
const DARAJA_BASE = process.env.DARAJA_BASE_URL || 'https://sandbox.safaricom.co.ke';
const TOKEN_URL = `${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`;
const B2C_URL = `${DARAJA_BASE}/mpesa/b2c/v3/paymentrequest`;

function required(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function configStatus() {
  const names = [
    'DARAJA_CONSUMER_KEY',
    'DARAJA_CONSUMER_SECRET',
    'DARAJA_INITIATOR_NAME',
    'DARAJA_SECURITY_CREDENTIAL',
    'DARAJA_SHORTCODE',
    'DARAJA_RESULT_URL',
    'DARAJA_TIMEOUT_URL'
  ];
  return Object.fromEntries(names.map(n => [n, Boolean(required(n))]));
}

function normalizePhone(input) {
  const raw = String(input || '').replace(/\s+/g, '');
  if (/^2547\d{8}$/.test(raw)) return raw;
  if (/^07\d{8}$/.test(raw)) return `254${raw.slice(1)}`;
  if (/^7\d{8}$/.test(raw)) return `254${raw}`;
  return null;
}

async function readJson(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function getAccessToken() {
  const key = required('DARAJA_CONSUMER_KEY');
  const secret = required('DARAJA_CONSUMER_SECRET');
  if (!key || !secret) throw new Error('Daraja Consumer Key/Consumer Secret are not configured on the server.');

  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const response = await fetch(TOKEN_URL, {
    method: 'GET',
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await readJson(response);
  if (!response.ok || !data.access_token) {
    const detail = data.error_description || data.errorMessage || data.raw || `HTTP ${response.status}`;
    throw new Error(`Daraja OAuth failed: ${detail}`);
  }
  return data.access_token;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'LuckyPlay Kenya', environment: 'sandbox' });
});

app.get('/api/config-status', (_req, res) => {
  // Safe status only; never returns secret values.
  res.json({ ok: true, configured: configStatus() });
});

app.post('/api/withdrawals', async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const amount = Math.floor(Number(req.body?.amount));
    const accountReference = String(req.body?.accountReference || 'LuckyPlay').slice(0, 20);
    const remarks = String(req.body?.remarks || 'LuckyPlay sandbox reward withdrawal').slice(0, 100);

    if (!phone) return res.status(400).json({ ok: false, error: 'Enter a valid Kenyan M-Pesa number.' });
    if (!Number.isFinite(amount) || amount < 1) return res.status(400).json({ ok: false, error: 'Amount must be at least KSh 1.' });

    const initiator = required('DARAJA_INITIATOR_NAME');
    const securityCredential = required('DARAJA_SECURITY_CREDENTIAL');
    const shortcode = required('DARAJA_SHORTCODE');
    const resultUrl = required('DARAJA_RESULT_URL');
    const timeoutUrl = required('DARAJA_TIMEOUT_URL');

    if (!initiator || !securityCredential || !shortcode || !resultUrl || !timeoutUrl) {
      return res.status(503).json({ ok: false, error: 'Daraja B2C settings are not fully configured on the server yet.' });
    }

    const token = await getAccessToken();
    const payload = {
      OriginatorConversationID: `LP-${Date.now()}`.slice(0, 20),
      InitiatorName: initiator,
      SecurityCredential: securityCredential,
      CommandID: process.env.DARAJA_COMMAND_ID || 'BusinessPayment',
      Amount: amount,
      PartyA: shortcode,
      PartyB: phone,
      Remarks: remarks,
      QueueTimeOutURL: timeoutUrl,
      ResultURL: resultUrl,
      Occasion: accountReference
    };

    const response = await fetch(B2C_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await readJson(response);
    if (!response.ok) {
      return res.status(response.status).json({ ok: false, error: data.errorMessage || data.errorCode || 'Daraja B2C request failed.', daraja: data });
    }

    res.json({ ok: true, daraja: data });
  } catch (error) {
    console.error('[withdrawal]', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/daraja/result', (req, res) => {
  console.log('[Daraja ResultURL]', JSON.stringify(req.body));
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

app.post('/api/daraja/timeout', (req, res) => {
  console.log('[Daraja QueueTimeOutURL]', JSON.stringify(req.body));
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`LuckyPlay Kenya server running on port ${PORT}`);
});
