import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const MASTER_LICENSE_SALT = 'WARUNG_HEBAT_LICENSE_SALT_2026_OFFLINE_SECURE';
const STORAGE_KEY_LICENSE = 'warung_device_license_v1';
const STORAGE_KEY_FALLBACK_ID = 'warung_device_fallback_id';

export interface StoredLicense {
  isActivated: boolean;
  deviceId: string;
  token: string;
  activatedAt: string;
  signature: string;
}

/**
 * Mengambil ID unik perangkat.
 * Di Android asli menggunakan Application.getAndroidId().
 * Di iOS/Web/Simulator/Expo Go fallback ke UUID unik persisten yang disimpan di AsyncStorage.
 */
export async function getDeviceId(): Promise<string> {
  try {
    let rawId: string | null = null;

    if (Platform.OS === 'android') {
      rawId = Application.getAndroidId();
    }

    if (!rawId || rawId.trim() === '') {
      // Periksa apakah fallback ID sudah ada
      let fallbackId = await AsyncStorage.getItem(STORAGE_KEY_FALLBACK_ID);
      if (!fallbackId) {
        // Buat 16-character hex ID acak yang stabil
        const randomHex = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `device_${Date.now()}_${Math.random()}`
        );
        fallbackId = randomHex.slice(0, 16).toUpperCase();
        await AsyncStorage.setItem(STORAGE_KEY_FALLBACK_ID, fallbackId);
      }
      return fallbackId.toUpperCase();
    }

    return rawId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Fallback darurat
    let fallbackId = await AsyncStorage.getItem(STORAGE_KEY_FALLBACK_ID);
    if (!fallbackId) {
      fallbackId = 'WH' + Date.now().toString(16).toUpperCase().padStart(14, '0');
      await AsyncStorage.setItem(STORAGE_KEY_FALLBACK_ID, fallbackId);
    }
    return fallbackId;
  }
}

/**
 * Format ID perangkat agar mudah dibaca pengguna: XXXX-XXXX-XXXX-XXXX
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
 * Menghitung token aktivasi 20 digit secara deterministik dari ID perangkat (Murni Offline).
 * Menggunakan SHA-256 chunking modulo 10000.
 */
export async function generateDeviceToken(deviceId: string, salt: string = MASTER_LICENSE_SALT): Promise<string> {
  const normalized = deviceId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const hashHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${normalized}`
  );

  const chunks: string[] = [];
  for (let i = 0; i < 5; i++) {
    const hexChunk = hashHex.slice(i * 8, (i + 1) * 8);
    const num = parseInt(hexChunk, 16);
    chunks.push((num % 10000).toString().padStart(4, '0'));
  }
  return chunks.join('-');
}

/**
 * Membersihkan token menjadi angka murni (20 digit)
 */
export function cleanToken(token: string): string {
  return token.replace(/\D/g, '');
}

/**
 * Format token dengan tanda strip setiap 4 angka (mirip token PLN): XXXX-XXXX-XXXX-XXXX-XXXX
 */
export function formatTokenInput(rawText: string): string {
  const digits = rawText.replace(/\D/g, '').slice(0, 20);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join('-');
}

/**
 * Memvalidasi apakah token input cocok dengan ID perangkat
 */
export async function verifyDeviceToken(inputToken: string, deviceId: string): Promise<boolean> {
  const cleanedInput = cleanToken(inputToken);
  if (cleanedInput.length !== 20) {
    return false;
  }

  const expectedToken = await generateDeviceToken(deviceId);
  const cleanedExpected = cleanToken(expectedToken);

  return cleanedInput === cleanedExpected;
}

/**
 * Mengambil informasi lisensi yang tersimpan dan memverifikasi integritasnya
 */
export async function getStoredLicense(): Promise<StoredLicense | null> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY_LICENSE);
    if (!json) return null;

    const license: StoredLicense = JSON.parse(json);
    if (!license || !license.isActivated) return null;

    // Verifikasi hardware ID perangkat saat ini
    const currentDeviceId = await getDeviceId();
    if (license.deviceId !== currentDeviceId) {
      console.warn('License hardware mismatch: deviceId does not match current hardware');
      return null;
    }

    // Verifikasi anti-tamper signature
    const expectedSignature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${MASTER_LICENSE_SALT}:${license.deviceId}:${cleanToken(license.token)}:${license.activatedAt}`
    );

    if (license.signature !== expectedSignature) {
      console.warn('License signature tampered');
      return null;
    }

    // Verifikasi ulang keabsahan token
    const isValid = await verifyDeviceToken(license.token, currentDeviceId);
    if (!isValid) {
      console.warn('License token invalid');
      return null;
    }

    return license;
  } catch (error) {
    console.error('Error reading stored license:', error);
    return null;
  }
}

/**
 * Menyimpan lisensi yang berhasil diverifikasi ke AsyncStorage dengan anti-tamper signature
 */
export async function saveStoredLicense(token: string, deviceId: string): Promise<boolean> {
  try {
    const activatedAt = new Date().toISOString();
    const signature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${MASTER_LICENSE_SALT}:${deviceId}:${cleanToken(token)}:${activatedAt}`
    );

    const licenseData: StoredLicense = {
      isActivated: true,
      deviceId,
      token,
      activatedAt,
      signature,
    };

    await AsyncStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(licenseData));
    return true;
  } catch (error) {
    console.error('Error saving stored license:', error);
    return false;
  }
}

/**
 * Menghapus lisensi tersimpan (untuk pengujian / reset)
 */
export async function clearStoredLicense(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_LICENSE);
}
