#!/usr/bin/env node
const crypto = require('crypto');

const MASTER_SALT = 'WARUNG_HEBAT_LICENSE_SALT_2026_OFFLINE_SECURE';

function generateToken(androidId, salt = MASTER_SALT) {
  const normalized = androidId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const hash = crypto.createHash('sha256').update(`${salt}:${normalized}`).digest('hex');
  const chunks = [];
  for (let i = 0; i < 5; i++) {
    const hexChunk = hash.slice(i * 8, (i + 1) * 8);
    const num = parseInt(hexChunk, 16);
    chunks.push((num % 10000).toString().padStart(4, '0'));
  }
  return chunks.join('-');
}

function formatDeviceId(deviceId) {
  const cleaned = deviceId.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const parts = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    parts.push(cleaned.slice(i, i + 4));
  }
  return parts.join('-');
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
⚡ Warung Hebat - License Token Generator CLI
=============================================
Penggunaan:
  npm run gen-token <ANDROID_ID> [CATATAN]

Contoh:
  npm run gen-token 2306236B3BA9F49B "Warung Bu Siti"
  npm run gen-token 9774-D56D-682E-549C
  `);
  process.exit(0);
}

const inputId = args[0];
const note = args[1] || '-';
const cleanId = inputId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
const formattedId = formatDeviceId(cleanId);
const token = generateToken(cleanId);

console.log(`
=====================================================
⚡ WARUNG HEBAT - TOKEN AKTIVASI PERMANEN
=====================================================
Android ID Asli : ${cleanId}
ID Terformat    : ${formattedId}
Catatan         : ${note}
-----------------------------------------------------
TOKEN (20 DIGIT): \x1b[1m\x1b[36m${token}\x1b[0m
-----------------------------------------------------
Pesan Siap Kirim ke WhatsApp User:
"Halo! Berikut token aktivasi permanen aplikasi Warung Hebat
untuk perangkat Anda (${formattedId}):

*${token}*

Masukkan token ini ke aplikasi untuk mulai menggunakan. Terima kasih!"
=====================================================
`);
