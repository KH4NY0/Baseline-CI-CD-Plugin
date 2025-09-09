import { findFiles } from '../utils/fs.js';
import { scanJS } from './js.js';
import { scanCSS } from './css.js';
import { scanHTML } from './html.js';
import { scanDeps } from './deps.js';

export async function scan({ cwd, targets, include, exclude, config }) {
  const results = [];

  // Dependency-space checks (package.json) if enabled
  const depsEnabled = config?.deps?.enabled !== false;
  if (depsEnabled) {
    try {
      const disableRules = config?.deps?.disableRules || [];
      results.push(...await scanDeps({ cwd, disableRules }));
    } catch (e) {
      results.push({
        file: 'package.json',
        line: 0,
        column: 0,
        kind: 'internal',
        featureId: null,
        severity: 'info',
        message: `Dependency scanner error: ${e?.message || e}`
      });
    }
  }

  const files = await findFiles({ cwd, targets, include, exclude });
  for (const file of files) {
    try {
      if (/\.(js|mjs|cjs|ts|tsx)$/i.test(file)) {
        results.push(...await scanJS(file));
      } else if (/\.css$/i.test(file)) {
        results.push(...await scanCSS(file));
      } else if (/\.html?$/i.test(file)) {
        results.push(...await scanHTML(file));
      }
    } catch (e) {
      results.push({
        file,
        line: 0,
        column: 0,
        kind: 'internal',
        featureId: null,
        severity: 'info',
        message: `Scanner error: ${e?.message || e}`
      });
    }
  }
  return results;
}
