import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'percent',
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Synchronous fast hash (djb2) for non-security contexts.
 * Used as a quick fingerprint – NOT for password storage.
 */
function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Hash a password using SHA-256 via the Web Crypto API.
 * Falls back to djb2 if SubtleCrypto is unavailable (e.g. insecure context).
 */
export async function hashPassword(plain: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(plain);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // Fallback for environments without SubtleCrypto
    return `djb2:${djb2(plain)}`;
  }
}

/**
 * Check whether a raw password matches a stored hash.
 */
export async function verifyPassword(plain: string, storedHash: string): Promise<boolean> {
  const hashed = await hashPassword(plain);
  return hashed === storedHash;
}

/**
 * Pre-computed SHA-256 hash of "admin".
 * crypto.subtle.digest('SHA-256', 'admin') → this hex string.
 */
export const ADMIN_PASSWORD_HASH =
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';

/**
 * Detect if a stored passwordHash is a legacy plaintext value
 * (i.e. it doesn't look like a 64-char hex SHA-256 hash or djb2 prefix).
 */
export function isLegacyPlaintext(hash: string): boolean {
  if (!hash) return true;
  if (hash.startsWith('djb2:')) return false;
  // SHA-256 hex is exactly 64 lowercase hex chars
  return !/^[0-9a-f]{64}$/.test(hash);
}
