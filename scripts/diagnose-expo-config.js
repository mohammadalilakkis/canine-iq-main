/**
 * Debug: capture full output of bunx expo config --json for EAS build failure.
 * Writes one NDJSON line to debug-e5dd8f.log.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', 'debug-e5dd8f.log');
const result = spawnSync('bunx', ['expo', 'config', '--json'], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8',
  shell: true,
});
const entry = {
  sessionId: 'e5dd8f',
  id: 'log_expo_config',
  timestamp: Date.now(),
  location: 'scripts/diagnose-expo-config.js',
  message: 'bunx expo config --json result',
  data: {
    exitCode: result.status,
    signal: result.signal,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    hypothesisId: 'expo_config_failure',
  },
};
fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
