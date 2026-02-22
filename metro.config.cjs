const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// On Windows, requiring @rork-ai/toolkit-sdk/metro can trigger ESM loader with c:\ path and fail.
// Fall back to Expo default config so EAS build can proceed.
let finalConfig = config;
try {
  const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");
  finalConfig = withRorkMetro(config);
} catch (_) {
  finalConfig = config;
}

module.exports = finalConfig;
