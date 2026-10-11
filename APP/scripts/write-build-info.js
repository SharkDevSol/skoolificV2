import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const read = (cmd) => {
  try {
    return execSync(cmd, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
};

const info = {
  source_repo: 'C:/Users/hp/Desktop/v.2/skoolificV2-git',
  canonical_name: 'skoolificV2-git',
  git_commit: read('git rev-parse --short HEAD') || 'unknown',
  git_branch: read('git rev-parse --abbrev-ref HEAD') || 'unknown',
  git_dirty: (read('git status --porcelain') || '').length > 0,
  built_at: new Date().toISOString(),
  built_by: process.env.USERNAME || process.env.USER || 'unknown',
};

mkdirSync(dist, { recursive: true });
writeFileSync(path.join(dist, 'BUILD_INFO.json'), `${JSON.stringify(info, null, 2)}\n`);
console.log(
  `BUILD_INFO.json -> commit=${info.git_commit} branch=${info.git_branch} dirty=${info.git_dirty}`
);
