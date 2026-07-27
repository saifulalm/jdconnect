/**
 * Open-source QRIS helpers (EMVCo MPM). No external deps, no license needed:
 * converts a merchant's STATIC QRIS payload into a DYNAMIC one with the
 * amount embedded (tag 54), flips point-of-initiation to dynamic (010212),
 * and recomputes the CRC16-CCITT checksum (tag 63).
 *
 * Note: this only GENERATES the QR payload. Settlement/auto-detection still
 * requires a licensed PJP; without one, payments are confirmed manually.
 */

export function crc16ccitt(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function makeDynamicQris(staticQris: string, amount: number): string {
  const src = staticQris.trim();
  if (!/6304[0-9A-Fa-f]{4}$/.test(src)) {
    throw new Error('Invalid static QRIS payload (missing CRC tag 63)');
  }
  // Drop the 4 CRC hex chars; keep the trailing "6304" marker.
  let s = src.slice(0, -4);
  // Point of initiation: 11 = static -> 12 = dynamic.
  s = s.replace('010211', '010212');
  // Insert transaction amount (tag 54) right before country code (tag 58).
  const amountStr = String(Math.round(amount));
  const tag54 = '54' + String(amountStr.length).padStart(2, '0') + amountStr;
  const idx = s.indexOf('5802ID');
  if (idx === -1) throw new Error('Invalid static QRIS payload (missing 5802ID)');
  s = s.slice(0, idx) + tag54 + s.slice(idx);
  return s + crc16ccitt(s);
}
