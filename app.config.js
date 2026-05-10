const appJson = require('./app.json');

module.exports = ({ config }) => ({
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    // On EAS Build, GOOGLE_SERVICES_JSON is set to the path of the injected secret file.
    // Locally it falls back to the file in the project root.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
