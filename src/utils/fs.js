import fg from 'fast-glob';
import path from 'node:path';

export async function findFiles({ cwd, targets, include, exclude }) {
  const patterns = [];
  for (const t of targets || ['.']) {
    const base = t.replaceAll('\\', '/');
    for (const inc of include || ['**/*']) {
      patterns.push(path.posix.join(base, inc));
    }
  }
  const files = await fg(patterns, {
    cwd,
    ignore: exclude || [],
    dot: true,
    onlyFiles: true,
    unique: true,
    absolute: true,
    followSymbolicLinks: true
  });
  return files;
}
