import fs from 'node:fs/promises';
import * as acorn from 'acorn';
import path from 'node:path';
import { FEATURE_MAP } from '../featureMap.js';

export async function scanJS(file) {
  const code = await fs.readFile(file, 'utf8');
  // Attempt to parse as JS; some TS files may fail — catch and skip
  let ast;
  try {
    ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
      allowHashBang: true
    });
  } catch (e) {
    // Fallback: do a very light regex search for known patterns
    return regexScan(file, code);
  }

  const results = [];

  function add(node, featureKey, detail) {
    const loc = node?.loc?.start || { line: 0, column: 0 };
    results.push({
      file,
      line: loc.line,
      column: loc.column + 1,
      kind: 'js',
      featureId: FEATURE_MAP[featureKey] || featureKey,
      message: detail
    });
  }

  // Minimal recursive traversal
  (function walk(node, parent) {
    if (!node || typeof node.type !== 'string') return;

    switch (node.type) {
      case 'NewExpression': {
        if (node.callee?.type === 'Identifier') {
          const name = node.callee.name;
          if (name === 'IntersectionObserver') add(node, 'js:IntersectionObserver', 'Usage of IntersectionObserver');
          if (name === 'ResizeObserver') add(node, 'js:ResizeObserver', 'Usage of ResizeObserver');
          if (name === 'Notification') add(node, 'js:Notification', 'Usage of Notification');
        }
        break;
      }
      case 'MemberExpression': {
        const obj = node.object;
        const prop = node.property;
        const isComputed = !!node.computed;
        const objName = obj?.type === 'Identifier' ? obj.name : null;
        const propName = !isComputed && prop?.type === 'Identifier' ? prop.name : null;
        if (objName === 'navigator' && propName === 'clipboard') {
          add(node, 'js:navigator.clipboard', 'Usage of navigator.clipboard');
        }
        if (objName === 'navigator' && propName === 'serviceWorker') {
          add(node, 'js:navigator.serviceWorker', 'Usage of navigator.serviceWorker');
        }
        break;
      }
    }

    for (const key in node) {
      if (key === 'loc') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        for (const v of value) walk(v, node);
      } else if (value && typeof value.type === 'string') {
        walk(value, node);
      }
    }
  })(ast, null);

  return results;
}

function regexScan(file, code) {
  const results = [];
  function push(line, col, featureKey, msg) {
    results.push({ file, line, column: col, kind: 'js', featureId: FEATURE_MAP[featureKey] || featureKey, message: msg });
  }
  const lines = code.split(/\r?\n/);
  lines.forEach((l, i) => {
    if (/new\s+IntersectionObserver\b/.test(l)) push(i + 1, 1, 'js:IntersectionObserver', 'Usage of IntersectionObserver');
    if (/new\s+ResizeObserver\b/.test(l)) push(i + 1, 1, 'js:ResizeObserver', 'Usage of ResizeObserver');
    if (/new\s+Notification\b/.test(l)) push(i + 1, 1, 'js:Notification', 'Usage of Notification');
    if (/navigator\.clipboard\b/.test(l)) push(i + 1, 1, 'js:navigator.clipboard', 'Usage of navigator.clipboard');
    if (/navigator\.serviceWorker\b/.test(l)) push(i + 1, 1, 'js:navigator.serviceWorker', 'Usage of navigator.serviceWorker');
  });
  return results;
}
