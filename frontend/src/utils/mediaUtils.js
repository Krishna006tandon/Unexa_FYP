import { Audio } from 'expo-av';
import ENVIRONMENT from '../config/environment';

/**
 * Resolves any raw media URL (image, video, audio) into a fully-qualified, reachable URL.
 * Handles:
 * - relative paths (e.g. '/uploads/videos/abc.mp4')
 * - localhost / 127.0.0.1 URLs (which fail on real devices / emulators)
 * - windows-style backslashes
 * - stripping accidental whitespace
 */
export function resolveMediaUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  let url = rawUrl.trim().replace(/\\/g, '/');
  if (!url) return null;

  // Local data / asset / blob schemes should be kept untouched
  if (
    url.startsWith('data:') ||
    url.startsWith('file:') ||
    url.startsWith('blob:') ||
    url.startsWith('content:') ||
    url.startsWith('ph:')
  ) {
    return url;
  }

  const configuredApiUrl = (ENVIRONMENT?.API_URL || 'https://unexa-fyp.onrender.com').trim().replace(/\/$/, '');

  // Relative path starting with slash
  if (url.startsWith('/')) {
    return `${configuredApiUrl}${url}`;
  }

  // Rewrite localhost or 127.0.0.1 to configured API URL so mobile devices can access backend
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(url)) {
    const pathPart = url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, '');
    return `${configuredApiUrl}${pathPart}`;
  }

  // Rewrite 10.0.2.2 (Android emulator localhost) if running on physical device or web
  if (/^https?:\/\/10\.0\.2\.2(:\d+)?(\/.*)?$/i.test(url)) {
    const pathPart = url.replace(/^https?:\/\/10\.0\.2\.2(:\d+)?/i, '');
    return `${configuredApiUrl}${pathPart}`;
  }

  // Ensure https if app is running against secure backend and url is plain http to the same domain
  if (configuredApiUrl.startsWith('https://') && url.startsWith('http://')) {
    try {
      const parsedUrl = new URL(url);
      const parsedApi = new URL(configuredApiUrl);
      if (parsedUrl.hostname === parsedApi.hostname) {
        url = url.replace(/^http:\/\//i, 'https://');
      }
    } catch (_) {}
  }

  return url;
}

/**
 * Configure global audio mode for smooth, crystal-clear video playback.
 * Ensures:
 * - Audio plays through main speaker (not telephone earpiece)
 * - Audio plays even if device physical mute switch is on (iOS)
 * - Audio does not get blocked by phone calls or background switches
 */
let isAudioConfigured = false;
export async function configureAudioForPlayback() {
  if (isAudioConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    isAudioConfigured = true;
  } catch (error) {
    try {
      // Fallback for minimal support across older devices
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });
      isAudioConfigured = true;
    } catch (_) {}
  }
}

/**
 * Formats seconds or milliseconds into MM:SS format for video player time display.
 */
export function formatVideoTime(millisOrSeconds, isMillis = true) {
  if (!millisOrSeconds || isNaN(millisOrSeconds) || millisOrSeconds < 0) return '0:00';
  const totalSeconds = Math.floor(isMillis ? millisOrSeconds / 1000 : millisOrSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}
