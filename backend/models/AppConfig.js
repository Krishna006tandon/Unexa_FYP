const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'app_version_config' },
    latestVersion: { type: String, default: '2.5.25' },
    latestVersionCode: { type: Number, default: 7 },
    minSupportedVersion: { type: String, default: '2.5.0' },
    forceUpdate: { type: Boolean, default: false },
    title: { type: String, default: 'New Update Available!' },
    message: {
      type: String,
      default: 'A new version of UNEXA is available with background notifications fix and major performance upgrades.'
    },
    releaseNotes: {
      type: [String],
      default: [
        'Fixed background & closed-app notifications',
        'Enhanced call and chat reliability',
        'Overall UI responsiveness improvements'
      ]
    },
    storeUrl: {
      type: String,
      default: 'https://play.google.com/store/apps/details?id=com.unexa.application'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AppConfig', appConfigSchema);
