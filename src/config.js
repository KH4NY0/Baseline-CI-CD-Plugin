import fs from 'node:fs/promises';
import path from 'node:path';

export async function loadConfig(cwd, overrides = {}) {
  const defaultConfig = {
    mode: 'warn',
    report: { format: 'text', output: null },
    deps: { enabled: true, disableRules: [] },
    include: [
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
      '**/*.ts',
      '**/*.tsx',
      '**/*.css',
      '**/*.html'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.git/**'
    ]
  };

  const configPath = path.resolve(cwd, overrides.config || '.baselineci.json');
  let userConfig = {};
  try {
    const txt = await fs.readFile(configPath, 'utf8');
    userConfig = JSON.parse(txt);
  } catch (e) {
    // No config is fine; use defaults
  }
  let config = { ...defaultConfig, ...userConfig };

  // Apply CLI overrides
  if (overrides.report) config.report = { ...config.report, format: overrides.report };
  if (overrides.output) config.report = { ...config.report, output: overrides.output };
  if (overrides.mode) config.mode = overrides.mode;

  // Dependency checks overrides
  if (typeof overrides.deps !== 'undefined') {
    const val = String(overrides.deps).toLowerCase();
    if (['off', 'false', '0', 'no', 'disabled'].includes(val)) config.deps.enabled = false;
    if (['on', 'true', '1', 'yes', 'enabled'].includes(val)) config.deps.enabled = true;
  }
  if (typeof overrides.disableDeps !== 'undefined') {
    const list = Array.isArray(overrides.disableDeps)
      ? overrides.disableDeps
      : String(overrides.disableDeps).split(/[\s,]+/);
    config.deps.disableRules = list.filter(Boolean).map((s) => String(s).toLowerCase());
  }

  return config;
}
