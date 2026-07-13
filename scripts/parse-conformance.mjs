#!/usr/bin/env node
// Parse every GCF payload in the sibling gcf conformance suite with this grammar
// and flag ERROR nodes. This is far broader than the hand-written corpus: it
// exercises the grammar against ~150 real wire payloads (graph, generic, delta,
// session, streaming, edge cases).
//
// Soft-skips if ../gcf/tests/conformance is not present (e.g. the published
// package, or a checkout without the spec repo alongside). Run with:
//   node scripts/parse-conformance.mjs
//
// The suite ratchets: it fails on any UNEXPECTED error (a new regression) and on
// any KNOWN_GAPS entry that has started passing (so the allow-list stays honest).
import { readdirSync, readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const confRoot = join(repoRoot, '..', 'gcf', 'tests', 'conformance');

if (!existsSync(confRoot)) {
  console.log('SKIP: sibling gcf conformance suite not found at ../gcf/tests/conformance');
  process.exit(0);
}

// Known pre-existing grammar gaps, tracked so new regressions stand out. These
// are generic-profile key/root/container edge cases and graph unknown-kind /
// CRLF-comment cases; see CHANGELOG. Remove an entry here when the grammar is
// extended to cover it (the suite will tell you when one starts passing).
const KNOWN_GAPS = new Set([
  // Empty: every conformance payload parses clean as of v1.3.3.
]);

function isGcf(s) {
  if (typeof s !== 'string' || !s.trim()) return false;
  const t = s.replace(/^\s+/, '');
  return t.startsWith('GCF ') || t.startsWith('## ') || t.startsWith('##!') ||
         t.startsWith('@') || t.startsWith('=');
}

const tmp = mkdtempSync(join(tmpdir(), 'ts-gcf-conf-'));
const items = []; // { id, file }
for (const dir of readdirSync(confRoot, { withFileTypes: true })) {
  if (!dir.isDirectory() || dir.name === 'errors-v2' || dir.name === 'errors') continue;
  for (const f of readdirSync(join(confRoot, dir.name))) {
    if (!f.endsWith('.json')) continue;
    const id = `${dir.name}/${f.replace(/\.json$/, '')}`;
    let fx;
    try { fx = JSON.parse(readFileSync(join(confRoot, dir.name, f), 'utf8')); } catch { continue; }
    for (const key of ['expected', 'input']) {
      const v = fx[key];
      if (!isGcf(v)) continue;
      const s = v.endsWith('\n') ? v : v + '\n';
      const file = join(tmp, `${id.replace(/\//g, '_')}__${key}.gcf`);
      writeFileSync(file, s);
      items.push({ id, file });
    }
  }
}

const tsBin = join(repoRoot, 'node_modules', '.bin', 'tree-sitter');
let out = '';
try {
  out = execFileSync(tsBin, ['parse', '-q', ...items.map((i) => i.file)],
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  out = (e.stdout || '') + (e.stderr || '');
}

const failedFiles = new Set(
  out.split('\n').filter((l) => l.includes('(ERROR')).map((l) => l.split(/\s+/)[0]),
);
const failedIds = new Set(items.filter((i) => failedFiles.has(i.file)).map((i) => i.id));
rmSync(tmp, { recursive: true, force: true });

const unexpected = [...failedIds].filter((id) => !KNOWN_GAPS.has(id)).sort();
const fixed = [...KNOWN_GAPS].filter((id) => !failedIds.has(id)).sort();

console.log(`Conformance parse: ${items.length} payloads, ${failedIds.size} with ERROR ` +
            `(${KNOWN_GAPS.size} known gaps allow-listed).`);
if (unexpected.length) {
  console.error('\nUNEXPECTED errors (new regressions):');
  for (const id of unexpected) console.error(`  ${id}`);
}
if (fixed.length) {
  console.error('\nKnown gaps that now PASS (remove from KNOWN_GAPS in this script):');
  for (const id of fixed) console.error(`  ${id}`);
}
if (unexpected.length || fixed.length) process.exit(1);
console.log('OK: no new regressions; known gaps unchanged.');
