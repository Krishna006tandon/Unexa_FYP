import axios from 'axios';
import Constants from 'expo-constants';
import { API_CONFIG } from '../config/api';

/**
 * Compare two semver strings: returns -1 if a < b, 1 if a > b, 0 if equal
 */
export const compareVersions = (a, b) => {
  if (!a || !b) return 0;
  const aParts = a.split('.').map((p) => parseInt(p, 10) || 0);
  const bParts = b.split('.').map((p) => parseInt(p, 10) || 0);
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const valA = aParts[i] || 0;
    const valB = bParts[i] || 0;
    if (valA < valB) return -1;
    if (valA > valB) return 1;
  }
  return 0;
};

export const getAppVersion = () => {
  return (
    Constants.expoConfig?.version ||
    Constants.manifest2?.extra?.expoClient?.version ||
    '2.5.25'
  );
};

export const getAppVersionCode = () => {
  return (
    Constants.expoConfig?.android?.versionCode ||
    7
  );
};

/**
 * Checks backend for available app update
 * @returns {Promise<Object|null>} Update details if available, null otherwise
 */
export const checkForAppUpdate = async () => {
  try {
    const currentVersion = getAppVersion();
    const currentVersionCode = getAppVersionCode();

    const baseUrl = API_CONFIG.getApiUrl();
    const response = await axios.get(`${baseUrl}/api/app/version`, {
      params: {
        version: currentVersion,
        versionCode: currentVersionCode,
      },
      timeout: 6000,
    });

    const data = response?.data;
    if (!data || !data.success) {
      return null;
    }

    const isOlder = compareVersions(currentVersion, data.latestVersion) < 0;
    const isCodeOlder =
      data.latestVersionCode && currentVersionCode < data.latestVersionCode;

    const isUpdateAvailable = data.updateAvailable || isOlder || isCodeOlder;

    if (isUpdateAvailable) {
      return {
        updateAvailable: true,
        currentVersion,
        latestVersion: data.latestVersion,
        forceUpdate: !!data.forceUpdate,
        title: data.title || 'New Update Available!',
        message:
          data.message ||
          `A new version (${data.latestVersion}) is available with performance improvements and bug fixes.`,
        releaseNotes: Array.isArray(data.releaseNotes) ? data.releaseNotes : [],
        storeUrl:
          data.storeUrl ||
          'https://play.google.com/store/apps/details?id=com.unexa.application',
      };
    }

    return null;
  } catch (error) {
    // Fail silently in background without disrupting user experience
    console.warn('⚠️ [UpdateService] Could not check for updates:', error?.message);
    return null;
  }
};
