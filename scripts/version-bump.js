#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function getCommitsSinceLastTag() {
  try {
    const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null', { stdio: ['pipe', 'pipe', 'pipe'] })
      .toString().trim();
    return execSync(`git log ${lastTag}..HEAD --oneline`).toString().trim();
  } catch {
    // No tags yet — get last 10 commits
    return execSync('git log --oneline -10').toString().trim();
  }
}

async function main() {
  console.log(`\nCurrent version: \x1b[36m${pkg.version}\x1b[0m\n`);

  // Step 1: bump type
  console.log('  [1] patch  – bug fixes, small changes');
  console.log('  [2] minor  – new features, backwards-compatible');
  console.log('  [3] major  – breaking changes\n');
  const typeInput = await ask('Bump type (patch/minor/major) [patch]: ');
  const typeMap = { '1': 'patch', '2': 'minor', '3': 'major', patch: 'patch', minor: 'minor', major: 'major' };
  const bumpType = typeMap[typeInput.trim().toLowerCase()] ?? 'patch';
  const newVersion = bumpVersion(pkg.version, bumpType);
  console.log(`\nNew version: \x1b[32m${newVersion}\x1b[0m\n`);

  // Step 2: release notes
  const commits = getCommitsSinceLastTag();
  if (commits) {
    console.log('Recent commits:\n\x1b[90m' + commits + '\x1b[0m\n');
  }

  const notesChoice = await ask('Use git commits as release notes? (y/n) [y]: ');
  let releaseNotes;
  if (notesChoice.trim().toLowerCase() === 'n') {
    releaseNotes = await ask('Enter release notes: ');
    releaseNotes = releaseNotes.trim() || `Release ${newVersion}`;
  } else {
    releaseNotes = commits
      ? commits.split('\n').map(l => `- ${l.replace(/^[a-f0-9]+ /, '')}`).join('\n')
      : `Release ${newVersion}`;
  }

  // Step 3: confirm
  console.log(`\n\x1b[33mAbout to bump ${pkg.version} → ${newVersion}\x1b[0m`);
  const confirm = await ask('Proceed? (y/n) [y]: ');
  if (confirm.trim().toLowerCase() === 'n') {
    console.log('Aborted.');
    rl.close();
    process.exit(0);
  }

  // Step 4: write version to package.json
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`\n\x1b[32m✓ package.json updated to ${newVersion}\x1b[0m`);

  // Step 5: git tag
  const tagChoice = await ask('Create a git tag for this release? (y/n) [y]: ');
  if (tagChoice.trim().toLowerCase() !== 'n') {
    try {
      execSync(`git add ${pkgPath}`);
      execSync(`git commit -m "chore: bump version to ${newVersion}"`);
      execSync(`git tag -a v${newVersion} -m "${releaseNotes.replace(/"/g, '\\"')}"`);
      console.log(`\x1b[32m✓ Tagged v${newVersion}\x1b[0m`);
    } catch (e) {
      console.warn('\x1b[33mWarning: could not create git tag:', e.message, '\x1b[0m');
    }
  }

  rl.close();
  console.log('\nStarting build...\n');
}

main().catch((e) => { console.error(e); rl.close(); process.exit(1); });
