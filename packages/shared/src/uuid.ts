/**
 * Generates a standard RFC 9562 compliant UUIDv7.
 * Works universally in Node.js, Electron, and browser environments.
 */
export function generateUUIDv7(): string {
  const now = Date.now();
  const bytes = new Uint8Array(16);

  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Timestamp: 48 bits
  bytes[0] = (now / 0x10000000000) & 0xff;
  bytes[1] = (now / 0x100000000) & 0xff;
  bytes[2] = (now / 0x1000000) & 0xff;
  bytes[3] = (now / 0x10000) & 0xff;
  bytes[4] = (now / 0x100) & 0xff;
  bytes[5] = now & 0xff;

  // Version 7: 0111 in bits 48..51
  bytes[6] = 0x70 | (bytes[6] & 0x0f);

  // Variant 1: 10 in bits 64..65
  bytes[8] = 0x80 | (bytes[8] & 0x3f);

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push(bytes[i].toString(16).padStart(2, '0'));
  }

  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
