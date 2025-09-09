import fs from 'node:fs/promises';
import path from 'node:path';

async function loadPackageJson(cwd) {
  try {
    const p = path.resolve(cwd, 'package.json');
    const txt = await fs.readFile(p, 'utf8');
    const json = JSON.parse(txt);
    return { path: p, json };
  } catch {
    return { path: 'package.json', json: null };
  }
}

function collectDependencyNames(pkgJson) {
  if (!pkgJson) return [];
  const all = {
    ...(pkgJson.dependencies || {}),
    ...(pkgJson.devDependencies || {}),
    ...(pkgJson.peerDependencies || {}),
    ...(pkgJson.optionalDependencies || {})
  };
  return Object.keys(all).map((n) => n.toLowerCase());
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

export async function scanDeps({ cwd, disableRules = [] }) {
  const { path: pkgPath, json: pkg } = await loadPackageJson(cwd);
  const results = [];
  const names = collectDependencyNames(pkg);
  if (!pkg || names.length === 0) return results;

  const disabled = new Set(disableRules.map((s) => String(s).toLowerCase()));

  // 1) Polyfills / shims / transpiler-related packages that can mask native support
  if (!disabled.has('polyfills')) {
    const polyfillExact = [
      'core-js',
      'core-js-pure',
      '@babel/polyfill',
      'babel-polyfill',
      'es5-shim',
      'es6-shim',
      'es7-shim'
    ];
    const polyfillFound = names.filter((n) =>
      polyfillExact.includes(n) || n.startsWith('@es-shims/') || n.includes('es-shim')
    );
    if (polyfillFound.length > 0) {
      results.push({
        file: path.relative(cwd, pkgPath),
        line: 1,
        column: 1,
        kind: 'dependency',
        featureId: null,
        severity: 'warn',
        message:
          `Detected polyfill/shim packages that can mask Baseline compatibility signals: ${uniq(polyfillFound).join(', ')}. ` +
          'Review whether they are still necessary when targeting Baseline-supported environments, or scope them narrowly.'
      });
    }
  }

  // 2) Multiple build tools detected
  if (!disabled.has('build-tools')) {
    const buildToolHints = [
      'webpack',
      'vite',
      'rollup',
      'parcel',
      'esbuild',
      'gulp',
      'grunt',
      'snowpack'
    ];
    const buildToolsFound = uniq(
      names.filter((n) => buildToolHints.some((h) => n === h || n.startsWith(`${h}-`) || n.includes(`@${h}/`)))
        .map((n) => {
          // normalize to base tool name
          for (const h of buildToolHints) {
            if (n === h || n.startsWith(`${h}-`) || n.includes(`@${h}/`) || n.includes(`${h}`)) return h;
          }
          return n;
        })
    );
    if (buildToolsFound.length >= 2) {
      results.push({
        file: path.relative(cwd, pkgPath),
        line: 1,
        column: 1,
        kind: 'dependency',
        featureId: null,
        severity: 'warn',
        message:
          `Multiple build tools detected (${buildToolsFound.join(' + ')}). This is not necessarily wrong, ` +
          'but it can signal configuration conflicts that affect compatibility or masking of unsupported features.'
      });
    }
  }

  // 3) Both Bootstrap and Tailwind detected
  if (!disabled.has('css-frameworks')) {
    const hasBootstrap = names.includes('bootstrap');
    const hasTailwind = names.includes('tailwindcss');
    if (hasBootstrap && hasTailwind) {
      results.push({
        file: path.relative(cwd, pkgPath),
        line: 1,
        column: 1,
        kind: 'dependency',
        featureId: null,
        severity: 'warn',
        message:
          'Both Bootstrap and Tailwind detected. Running multiple CSS frameworks can cause conflicting resets/utilities and increase bundle size.'
      });
    }
  }

  return results;
}
