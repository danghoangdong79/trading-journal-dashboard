/**
 * Google Sheets API helpers for Cloudflare Workers.
 * Uses Web Crypto API (no Node.js crypto) for JWT signing.
 */

import type { ServiceAccount } from './types';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

/** Convert ArrayBuffer to base64url string */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Import PEM private key for Web Crypto API */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer as ArrayBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/** Create a signed JWT for Google API authentication */
async function createJwt(serviceAccount: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: SCOPES,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = arrayBufferToBase64Url(
    new TextEncoder().encode(JSON.stringify(header)).buffer as ArrayBuffer,
  );
  const encodedPayload = arrayBufferToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)).buffer as ArrayBuffer,
  );

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${arrayBufferToBase64Url(signature)}`;
}

/** Get an OAuth2 access token from Google */
async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const jwt = await createJwt(serviceAccount);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || 'Cannot get Google access token');
  }

  return data.access_token;
}

/** Token cache to avoid re-authenticating on every request */
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getCachedToken(serviceAccount: ServiceAccount): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const token = await getAccessToken(serviceAccount);
  tokenCache = { token, expiresAt: Date.now() + 50 * 60 * 1000 }; // 50 min
  return token;
}

/** Append a row to a Google Sheet */
export async function appendRow(
  serviceAccount: ServiceAccount,
  sheetId: string,
  range: string,
  values: (string | number)[],
): Promise<{ updatedRange: string; updatedRows: number }> {
  const token = await getCachedToken(serviceAccount);
  const url = `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [values],
    }),
  });

  const data = await response.json() as {
    updates?: { updatedRange?: string; updatedRows?: number };
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to append row to Google Sheets');
  }

  return {
    updatedRange: data.updates?.updatedRange || '',
    updatedRows: data.updates?.updatedRows || 0,
  };
}

/** Read values from a Google Sheet range */
export async function readRange(
  serviceAccount: ServiceAccount,
  sheetId: string,
  range: string,
): Promise<unknown[][]> {
  const token = await getCachedToken(serviceAccount);
  const url = `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json() as { values?: unknown[][]; error?: { message?: string } };

  if (!response.ok) {
    throw new Error(data.error?.message || `Cannot read range ${range}`);
  }

  return Array.isArray(data.values) ? data.values : [];
}

/** Update a specific cell range in Google Sheets */
export async function updateRange(
  serviceAccount: ServiceAccount,
  sheetId: string,
  range: string,
  values: (string | number)[][],
): Promise<void> {
  const token = await getCachedToken(serviceAccount);
  const url = `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const data = await response.json() as { error?: { message?: string } };
    throw new Error(data.error?.message || 'Failed to update Google Sheets');
  }
}
