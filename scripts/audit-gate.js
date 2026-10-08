#!/usr/bin/env node
/*
 * Release gate for `npm audit`.
 *
 * Fails (exit 1) when the audit reports any advisory that is not listed in
 * ../audit-allowlist.json. The allowlist holds advisories with no published fix
 * (or whose fix breaks the toolchain), each with a reason and a date. It also
 * warns when an allowlisted advisory no longer shows up, so stale entries get
 * removed.
 *
 * Usage: npm run audit:gate
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const allowlistPath = path.join(__dirname, '..', 'audit-allowlist.json');
const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
const accepted = new Map((allowlist.accepted || []).map((entry) => [entry.id, entry]));

const result = (() => {
  // npm audit exits 1 whenever it finds anything, so take stdout from the error too.
  const options = { cwd: path.join(__dirname, '..'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] };
  try {
    return { stdout: execSync('npm audit --json', options), stderr: '' };
  } catch (error) {
    return { stdout: error.stdout || '', stderr: error.stderr || '' };
  }
})();

if (!result.stdout) {
  console.error('npm audit produced no output');
  if (result.stderr) console.error(result.stderr);
  process.exit(2);
}

let audit;
try {
  audit = JSON.parse(result.stdout);
} catch (error) {
  console.error('npm audit output is not JSON:', error.message);
  process.exit(2);
}

const advisories = new Map();
for (const info of Object.values(audit.vulnerabilities || {})) {
  for (const via of info.via || []) {
    if (typeof via === 'object' && via.url) {
      const id = via.url.split('/').pop();
      if (!advisories.has(id)) advisories.set(id, via);
    }
  }
}

const unexpected = [...advisories.entries()].filter(([id]) => !accepted.has(id));
const stale = [...accepted.keys()].filter((id) => !advisories.has(id));

console.log(`npm audit: ${advisories.size} unique advisories, ${accepted.size} accepted in audit-allowlist.json`);
for (const [id, via] of advisories) {
  const status = accepted.has(id) ? 'accepted' : 'NEW';
  console.log(`  ${status.padEnd(8)} ${via.severity.padEnd(8)} ${via.name.padEnd(22)} ${id}  ${via.title}`);
}
for (const id of stale) {
  console.log(`  stale    ${accepted.get(id).package.padEnd(22)} ${id}  no longer reported: remove it from audit-allowlist.json`);
}

if (unexpected.length > 0) {
  console.error(`\nFAIL: ${unexpected.length} advisory(ies) not in the allowlist. Fix them, or add them with a reason.`);
  process.exit(1);
}
console.log('\nOK: nothing outside the allowlist.');
