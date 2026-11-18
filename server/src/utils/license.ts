import crypto from 'crypto';

export const MASTER_LICENSE_SALT =
  process.env.LICENSE_MASTER_SALT || 'WARUNG_HEBAT_LICENSE_SALT_2026_OFFLINE_SECURE';

/**
 * Menghitung token aktivasi 20 digit secara deterministik dari Android ID.
 * Menggunakan SHA-256 chunking modulo 10000 (identik 100% dengan fungsi di mobile app).
 */
export function generateTokenNode(
  androidId: string,
  salt: string = MASTER_LICENSE_SALT
): string {
  const normalized = androidId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const hashHex = crypto
    .createHash('sha256')
    .update(`${salt}:${normalized}`)
    .digest('hex');

  const chunks: string[] = [];
  for (let i = 0; i < 5; i++) {
    const hexChunk = hashHex.slice(i * 8, (i + 1) * 8);
    const num = parseInt(hexChunk, 16);
    chunks.push((num % 10000).toString().padStart(4, '0'));
  }
  return chunks.join('-');
}

/**
 * Format ID perangkat: XXXX-XXXX-XXXX-XXXX
 */
export function formatDeviceId(deviceId: string): string {
  const cleaned = deviceId.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const parts: string[] = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    parts.push(cleaned.slice(i, i + 4));
  }
  return parts.join('-');
}

/**
 * Membersihkan token menjadi 20 digit angka murni
 */
export function cleanToken(token: string): string {
  return token.replace(/\D/g, '');
}
