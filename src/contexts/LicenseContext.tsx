import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  getDeviceId,
  formatDeviceId,
  getStoredLicense,
  saveStoredLicense,
  verifyDeviceToken,
  clearStoredLicense,
  StoredLicense,
} from '../services/license';

interface LicenseContextType {
  isLicensed: boolean;
  deviceId: string;
  formattedDeviceId: string;
  licenseInfo: StoredLicense | null;
  isLoading: boolean;
  activate: (token: string) => Promise<{ success: boolean; message: string }>;
  refreshLicense: () => Promise<void>;
  deactivateForTesting: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [isLicensed, setIsLicensed] = useState<boolean>(false);
  const [deviceId, setDeviceId] = useState<string>('');
  const [formattedDeviceId, setFormattedDeviceId] = useState<string>('');
  const [licenseInfo, setLicenseInfo] = useState<StoredLicense | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkLicense();
  }, []);

  async function checkLicense() {
    try {
      setIsLoading(true);
      const id = await getDeviceId();
      setDeviceId(id);
      setFormattedDeviceId(formatDeviceId(id));

      const stored = await getStoredLicense();
      if (stored && stored.isActivated) {
        setLicenseInfo(stored);
        setIsLicensed(true);
      } else {
        setLicenseInfo(null);
        setIsLicensed(false);
      }
    } catch (error) {
      console.error('Error checking license status:', error);
      setIsLicensed(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function activate(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const currentDeviceId = deviceId || (await getDeviceId());
      const isValid = await verifyDeviceToken(token, currentDeviceId);

      if (!isValid) {
        return {
          success: false,
          message: 'Token aktivasi tidak cocok dengan ID perangkat ini. Silakan periksa kembali angka token Anda.',
        };
      }

      const saved = await saveStoredLicense(token, currentDeviceId);
      if (!saved) {
        return {
          success: false,
          message: 'Gagal menyimpan status aktivasi ke perangkat.',
        };
      }

      const stored = await getStoredLicense();
      setLicenseInfo(stored);
      setIsLicensed(true);

      return {
        success: true,
        message: 'Aplikasi Warung Hebat berhasil diaktivasi secara permanen!',
      };
    } catch (error: any) {
      console.error('Error activating license:', error);
      return {
        success: false,
        message: error.message || 'Terjadi kesalahan saat memproses aktivasi.',
      };
    }
  }

  async function deactivateForTesting() {
    await clearStoredLicense();
    setIsLicensed(false);
    setLicenseInfo(null);
  }

  return (
    <LicenseContext.Provider
      value={{
        isLicensed,
        deviceId,
        formattedDeviceId,
        licenseInfo,
        isLoading,
        activate,
        refreshLicense: checkLicense,
        deactivateForTesting,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
}
