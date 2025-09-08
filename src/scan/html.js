import fs from 'node:fs/promises';
import * as parse5 from 'parse5';
import { FEATURE_MAP } from '../featureMap.js';

export async function scanHTML(file) {
  const html = await fs.readFile(file, 'utf8');
  const doc = parse5.parse(html, { sourceCodeLocationInfo: true });
  const results = [];

  function walk(node) {
    if (!node) return;
    if (node.nodeName && node.nodeName !== '#document' && node.nodeName !== '#text') {
      const tag = node.nodeName.toLowerCase();
      const loc = node.sourceCodeLocation?.startTag || node.sourceCodeLocation || { startLine: 0, startCol: 0 };

      if (tag === 'dialog') {
        results.push({ file, line: loc.startLine || 0, column: loc.startCol || 0, kind: 'html', featureId: FEATURE_MAP['html:dialog'], message: '<dialog> element' });
      }

      const attrs = node.attrs || [];
      for (const a of attrs) {
        const name = a.name.toLowerCase();
        const value = (a.value || '').toLowerCase();
        if (tag === 'input' && name === 'autocomplete' && value.includes('one-time-code')) {
          results.push({ file, line: loc.startLine || 0, column: loc.startCol || 0, kind: 'html', featureId: FEATURE_MAP['html:autocomplete.one-time-code'], message: 'autocomplete="one-time-code"' });
        }
      }
    }

    const childNodes = node.childNodes || [];
    for (const c of childNodes) walk(c);
  }

  walk(doc);
  return results;
}
