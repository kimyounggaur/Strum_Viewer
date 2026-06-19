// Best-of-both merge: pull the remote "karaoke" branch's superior data for
// 16-beat / 6-8 / calypso / country / slow-gogo into our rhythms.source.json,
// keeping our verified shuffle / slow-rock / 12-8 / 3-4 (incl. 2-bar) data and
// our slow-gogo ex03 (which the remote deliberately omitted).
//
// Run once during the merge, then `node scripts/buildRhythms.mjs`.
import { readFile, writeFile, rm } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sourcePath = path.join(__dirname, 'rhythms.source.json');

// Categories where the remote branch's transcription wins.
const REMOTE_CATS = new Set(['sixteen-beat-variation', 'calypso', 'country', 'six-eight']);
// slow-gogo: take remote ex01/ex02, keep our ex03.
const catOf = (id) => id.replace(/_ex\d+$/, '');

// Load the remote strumRhythms.ts (transpile TS -> JS, type-only imports drop out).
const remoteTs = execSync('git show origin/main:src/data/strumRhythms.ts', { cwd: root, encoding: 'utf8' });
const js = ts.transpileModule(remoteTs, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const tmp = path.join(__dirname, '.remoteRhythms.mjs');
await writeFile(tmp, js, 'utf8');
const remote = (await import('file://' + tmp.replace(/\\/g, '/') + `?t=${process.pid}`)).strumRhythms;
await rm(tmp, { force: true });

const toEntry = (id, r) => ({
  id,
  subdivision: r.subdivision,
  feelTiming: r.feelTiming,
  ...(r.swing != null ? { swing: r.swing } : {}),
  bars: r.bars ?? 1,
  strokes: r.strokes.map((s) => ({
    step: s.step,
    dir: s.dir,
    ...(s.accent ? { accent: true } : {}),
    ...(s.tie ? { tie: true } : {}),
  })),
  imageLeftPad: r.imageLeftPad,
  imageRightPad: r.imageRightPad,
  confidence: 'verified-remote',
});

const merged = [];
// Remote-owned categories + remote slow-gogo ex01/ex02.
for (const [id, r] of Object.entries(remote)) {
  const c = catOf(id);
  if (REMOTE_CATS.has(c) || c === 'slow-gogo') merged.push(toEntry(id, r));
}
// Our verified categories + our slow-gogo ex03.
const mine = JSON.parse(await readFile(sourcePath, 'utf8'));
const OURS = new Set(['shuffle', 'slow-rock', 'twelve-eight', 'three-four']);
for (const e of mine) {
  const c = catOf(e.id);
  if (OURS.has(c) || e.id === 'slow-gogo_ex03') merged.push(e);
}

const counts = {};
for (const e of merged) counts[catOf(e.id)] = (counts[catOf(e.id)] ?? 0) + 1;
console.log(`Merged ${merged.length} entries ->`, counts);

await writeFile(sourcePath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
console.log('Wrote', path.relative(root, sourcePath));
