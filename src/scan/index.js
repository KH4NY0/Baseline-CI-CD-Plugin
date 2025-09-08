import { findFiles } from '../utils/fs.js';
import { scanJS } from './js.js';
import { scanCSS } from './css.js';
import { scanHTML } from './html.js';

export async function scan({ cwd, targets, include, exclude }) {
  const files = await findFiles({ cwd, targets, include, exclude });
  const results = [];
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
        status: 'info',
        message: `Scanner error: ${e?.message || e}`
      });
    }
  }
  return results;
}
