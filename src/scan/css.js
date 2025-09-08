import fs from 'node:fs/promises';
import postcss from 'postcss';
import { FEATURE_MAP } from '../featureMap.js';

export async function scanCSS(file) {
  const css = await fs.readFile(file, 'utf8');
  const root = postcss.parse(css, { from: file });
  const results = [];

  root.walkDecls((decl) => {
    const prop = decl.prop.toLowerCase();
    const value = String(decl.value).toLowerCase();
    const loc = decl.source?.start || { line: 0, column: 0 };

    if (prop === 'backdrop-filter') {
      results.push({ file, line: loc.line, column: loc.column, kind: 'css', featureId: FEATURE_MAP['css:backdrop-filter'], message: 'CSS backdrop-filter' });
    }
    if (prop === 'container-type' || prop === 'container-name' || prop === 'container') {
      results.push({ file, line: loc.line, column: loc.column, kind: 'css', featureId: FEATURE_MAP['css:container-queries'], message: 'CSS Container Queries' });
    }
    if ((prop === 'grid-template-rows' || prop === 'grid-template-columns') && /\bsubgrid\b/.test(value)) {
      results.push({ file, line: loc.line, column: loc.column, kind: 'css', featureId: FEATURE_MAP['css:subgrid'], message: 'CSS subgrid' });
    }
  });

  return results;
}
