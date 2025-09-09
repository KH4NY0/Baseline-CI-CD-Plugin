import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';

async function loadWebFeaturesRegistry() {
  try {
    const mod = await import('web-features');
    if (mod?.features) return mod.features;
    if (mod?.default?.features) return mod.default.features;
    if (Array.isArray(mod?.default)) return mod.default; // array of features
    if (Array.isArray(mod)) return mod;
    return mod;
  } catch (e) {
    return null;
  }
}

function indexFeatures(registry) {
  const map = new Map();
  if (!registry) return map;
  if (Array.isArray(registry)) {
    for (const f of registry) {
      const id = f?.id || f?.name;
      if (id) map.set(id, f);
    }
    return map;
  }
  // If registry is an object map
  for (const [k, v] of Object.entries(registry)) {
    if (v && typeof v === 'object') map.set(k, v);
  }
  return map;
}

function classify(feature, featureId) {
  if (!feature) return 'unknown';
  // Try several common shapes for "baseline" info
  if (feature.baseline === true) return 'baseline';
  if (feature.baseline?.yes === true) return 'baseline';
  if (feature.baseline?.status === 'stable') return 'baseline';
  if (feature.status?.baseline === 'stable') return 'baseline';
  // If explicit "no"
  if (feature.baseline === false) return 'non-baseline';
  if (feature.baseline?.yes === false) return 'non-baseline';
  if (feature.baseline?.status === 'no') return 'non-baseline';
  if (feature.status?.baseline === 'no') return 'non-baseline';
  return 'unknown';
}

export async function reportResults({ cwd, config, results }) {
  const registry = await loadWebFeaturesRegistry();
  const featIndex = indexFeatures(registry);

  let errors = 0, warnings = 0, infos = 0;

  const mode = (config.mode || 'warn').toLowerCase();
  const items = [];

for (const r of results) {
    if (!r.featureId) {
      const severity = r.severity || 'info';
      if (severity === 'error') errors++; else if (severity === 'warn') warnings++; else infos++;
      items.push({ ...r, severity, baseline: 'unknown' });
      continue;
    }
    const feature = featIndex.get(r.featureId);
    const baseline = classify(feature, r.featureId);
    let severity = 'info';
    if (baseline === 'non-baseline') {
      severity = (mode === 'fail') ? 'error' : 'warn';
    } else if (baseline === 'unknown') {
      severity = 'info';
    }
    if (severity === 'error') errors++; else if (severity === 'warn') warnings++; else infos++;
    items.push({ ...r, baseline, severity });
  }

  // Console report
  if ((config.report?.format || 'text') === 'text') {
    if (items.length === 0) {
      console.log(chalk.green('No features detected.'));
    } else {
      for (const i of items) {
        const loc = i.line ? `${i.file}:${i.line}:${i.column}` : i.file;
        const msg = `${i.featureId || 'note'} - ${i.message || ''}`.trim();
        if (i.severity === 'error') console.log(chalk.red(`ERROR  ${loc}  ${msg}  (baseline: ${i.baseline})`));
        else if (i.severity === 'warn') console.log(chalk.yellow(`WARN   ${loc}  ${msg}  (baseline: ${i.baseline})`));
        else console.log(chalk.gray(`INFO   ${loc}  ${msg}  (baseline: ${i.baseline})`));
      }
    }
    console.log('\nSummary:', chalk.red(`${errors} error(s)`), chalk.yellow(`${warnings} warn(s)`), chalk.gray(`${infos} info(s)`));
  }

  // JSON report
  const fmt = config.report?.format;
  if (fmt === 'json') {
    const outPath = path.resolve(cwd, config.report?.output || 'baseline-report.json');
    const payload = { items, summary: { errors, warnings, infos } };
    await fs.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`JSON report written to ${outPath}`);
  }

  if (fmt === 'html') {
    // TODO: generate HTML report in a future iteration
    const outPath = path.resolve(cwd, config.report?.output || 'baseline-report.html');
    await fs.writeFile(outPath, '<!DOCTYPE html><meta charset="utf-8"><title>Baseline Report</title><pre>HTML report generation is not implemented yet. Use --report json for now.</pre>', 'utf8');
    console.log(`HTML report placeholder written to ${outPath}`);
  }

  return { errors, warnings, infos };
}
