import fs from 'node:fs/promises';
import path from 'node:path';

export async function loadConfig(cwd, overrides = {}) {
  const defaultConfig = {
    mode: 'warn',
    report: { format: 'text', output: null },
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

  return config;
}
