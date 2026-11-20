const express = require('express');
const router = express.Router();
const AppConfig = require('../models/AppConfig');

const DEFAULT_CONFIG = {
  latestVersion: '2.5.25',
  latestVersionCode: 7,
  minSupportedVersion: '2.5.0',
  forceUpdate: false,
  title: 'New Update Available!',
  message: 'A new version of UNEXA is available with background notifications fix and major performance upgrades.',
  releaseNotes: [
    'Fixed background & closed-app notifications',
    'Enhanced call and chat reliability',
    'Overall UI responsiveness improvements'
  ],
  storeUrl: 'https://play.google.com/store/apps/details?id=com.unexa.application'
};

// Helper: semver comparison (returns -1 if a < b, 1 if a > b, 0 if equal)
function compareVersions(a, b) {
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
}

// @route   GET /api/app/version
// @desc    Get latest app version info and compare with client version
// @access  Public
router.get('/version', async (req, res) => {
  try {
    let config = await AppConfig.findOne({ key: 'app_version_config' });

    if (!config) {
      config = await AppConfig.create({
        key: 'app_version_config',
        ...DEFAULT_CONFIG
      });
    }

    const clientVersion = req.query.version || req.query.clientVersion;
    const clientVersionCode = parseInt(req.query.versionCode, 10) || 0;

    let updateAvailable = false;
    let forceUpdate = config.forceUpdate || false;

    if (clientVersion) {
      // Check if client is older than latest
      if (compareVersions(clientVersion, config.latestVersion) < 0) {
        updateAvailable = true;
      }
      // If client is older than minSupportedVersion, force update
      if (compareVersions(clientVersion, config.minSupportedVersion) < 0) {
        forceUpdate = true;
      }
    } else if (clientVersionCode > 0 && clientVersionCode < config.latestVersionCode) {
      updateAvailable = true;
    }

    return res.status(200).json({
      success: true,
      latestVersion: config.latestVersion,
      latestVersionCode: config.latestVersionCode,
      minSupportedVersion: config.minSupportedVersion,
      updateAvailable,
      forceUpdate,
      title: config.title,
      message: config.message,
      releaseNotes: config.releaseNotes,
      storeUrl: config.storeUrl
    });
  } catch (error) {
    console.error('❌ Error fetching app version config:', error.message);
    // Graceful fallback to default config
    return res.status(200).json({
      success: true,
      ...DEFAULT_CONFIG,
      updateAvailable: false,
      forceUpdate: false
    });
  }
});

// @route   POST /api/app/version
// @desc    Update version config (admin/internal)
// @access  Protected
router.post('/version', async (req, res) => {
  try {
    const {
      latestVersion,
      latestVersionCode,
      minSupportedVersion,
      forceUpdate,
      title,
      message,
      releaseNotes,
      storeUrl
    } = req.body;

    let config = await AppConfig.findOne({ key: 'app_version_config' });

    if (!config) {
      config = new AppConfig({ key: 'app_version_config' });
    }

    if (latestVersion !== undefined) config.latestVersion = latestVersion;
    if (latestVersionCode !== undefined) config.latestVersionCode = latestVersionCode;
    if (minSupportedVersion !== undefined) config.minSupportedVersion = minSupportedVersion;
    if (forceUpdate !== undefined) config.forceUpdate = forceUpdate;
    if (title !== undefined) config.title = title;
    if (message !== undefined) config.message = message;
    if (releaseNotes !== undefined) config.releaseNotes = releaseNotes;
    if (storeUrl !== undefined) config.storeUrl = storeUrl;

    await config.save();

    return res.status(200).json({
      success: true,
      message: 'App version config updated successfully',
      config
    });
  } catch (error) {
    console.error('❌ Error updating app version config:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
