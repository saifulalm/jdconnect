import * as crypto from 'crypto';

/**
 * Constant-time comparison for hex digests. A plain `!==` leaks how many
 * leading characters matched through response timing, which lets an attacker
 * reconstruct a valid signature byte by byte.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}
