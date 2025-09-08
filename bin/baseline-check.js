#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import process from 'node:process';
import { loadConfig } from '../src/config.js';
import { scan } from '../src/scan/index.js';
import { reportResults } from '../src/report.js';

process.on('unhandledRejection', (err) => {
  console.error('[baseline-check] Unhandled error:', err?.stack || err);
  process.exitCode = 1;
});

const program = new Command();
program
  .name('baseline-check')
  .description('Scan project for modern web features and check Baseline compatibility')
  .argument('[targets...]', 'Paths or directories to scan (default: current directory)')
  .option('-c, --config <path>', 'Path to .baselineci.json (default: .baselineci.json)')
  .option('--report <format>', 'Report format: text|json|html')
  .option('--mode <mode>', 'Fail behavior: fail|warn')
  .option('-o, --output <path>', 'Output path for report (json/html)')
  .option('--include <globs...>', 'Override include globs')
  .option('--exclude <globs...>', 'Override exclude globs')
  .action(async (targets, opts) => {
    const cwd = process.cwd();
    const config = await loadConfig(cwd, opts);

    const include = opts.include || config.include;
    const exclude = opts.exclude || config.exclude;
    const inputTargets = (targets && targets.length) ? targets : ['.'];

    const results = await scan({ cwd, targets: inputTargets, include, exclude });
    const summary = await reportResults({ cwd, config: { ...config, ...opts }, results });

    // Exit code policy
    const mode = (opts.mode || config.mode || 'warn').toLowerCase();
    if (mode === 'fail' && summary.errors > 0) {
      process.exitCode = 1;
    }
  });

program.parseAsync();
